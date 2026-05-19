package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.dto.GardenPatchRequest;
import de.gardenplanner.dto.GardenRequest;
import de.gardenplanner.entity.Garden;
import de.gardenplanner.entity.GardenMembership;
import de.gardenplanner.entity.User;
import de.gardenplanner.model.Role;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/gardens")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class GardenResource {

    @Inject
    AccessControl access;

    @GET
    public List<Garden> getAll() {
        User user = access.requireAuth();
        List<GardenMembership> memberships = GardenMembership.findByUser(user.id);
        return memberships.stream().map(m -> m.garden).toList();
    }

    @GET
    @Path("/{id}")
    public Garden getById(@PathParam("id") UUID id) {
        access.requireMember(id);
        Garden garden = Garden.findById(id);
        if (garden == null) throw new NotFoundException("Garden not found");
        return garden;
    }

    @POST
    @Transactional
    public Response create(@Valid GardenRequest req) {
        User user = access.requireAuth();
        Garden garden = new Garden();
        garden.name = req.name;
        garden.description = req.description;
        garden.widthM = req.widthM;
        garden.lengthM = req.lengthM;
        garden.persist();

        GardenMembership ownership = new GardenMembership();
        ownership.garden = garden;
        ownership.user = user;
        ownership.role = Role.OWNER;
        ownership.persist();

        return Response.status(Response.Status.CREATED).entity(garden).build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public Garden update(@PathParam("id") UUID id, GardenPatchRequest req) {
        access.requireEditor(id);
        Garden garden = Garden.findById(id);
        if (garden == null) throw new NotFoundException("Garden not found");
        if (req.name != null) garden.name = req.name;
        if (req.description != null) garden.description = req.description;
        if (req.widthM != null) garden.widthM = req.widthM;
        if (req.lengthM != null) garden.lengthM = req.lengthM;
        return garden;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        access.requireOwner(id);
        Garden garden = Garden.findById(id);
        if (garden == null) throw new NotFoundException("Garden not found");
        garden.delete();
        return Response.noContent().build();
    }
}
