package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.entity.Plant;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;

@Path("/plants")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PlantResource {

    @Inject
    AccessControl access;

    @GET
    public List<Plant> getAll() {
        access.requireAuth();
        return Plant.listAll();
    }

    @GET
    @Path("/{id}")
    public Plant getById(@PathParam("id") UUID id) {
        access.requireAuth();
        Plant plant = Plant.findById(id);
        if (plant == null) throw new NotFoundException("Plant not found");
        return plant;
    }
}
