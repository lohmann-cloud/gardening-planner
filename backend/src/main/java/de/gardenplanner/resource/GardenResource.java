package de.gardenplanner.resource;

import de.gardenplanner.dto.GardenPatchRequest;
import de.gardenplanner.dto.GardenRequest;
import de.gardenplanner.entity.Garden;
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

    @GET
    public List<Garden> getAll() {
        return Garden.listAll();
    }

    @GET
    @Path("/{id}")
    public Garden getById(@PathParam("id") UUID id) {
        Garden garden = Garden.findById(id);
        if (garden == null) throw new NotFoundException("Garden not found");
        return garden;
    }

    @POST
    @Transactional
    public Response create(@Valid GardenRequest req) {
        Garden garden = new Garden();
        garden.name = req.name;
        garden.description = req.description;
        garden.widthM = req.widthM;
        garden.lengthM = req.lengthM;
        garden.persist();
        return Response.status(Response.Status.CREATED).entity(garden).build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public Garden update(@PathParam("id") UUID id, GardenPatchRequest req) {
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
        Garden garden = Garden.findById(id);
        if (garden == null) throw new NotFoundException("Garden not found");
        garden.delete();
        return Response.noContent().build();
    }
}
