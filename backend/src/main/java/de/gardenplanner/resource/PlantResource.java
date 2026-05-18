package de.gardenplanner.resource;

import de.gardenplanner.entity.Plant;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;

@Path("/plants")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PlantResource {

    @GET
    public List<Plant> getAll() {
        return Plant.listAll();
    }

    @GET
    @Path("/{id}")
    public Plant getById(@PathParam("id") UUID id) {
        Plant plant = Plant.findById(id);
        if (plant == null) throw new NotFoundException("Plant not found");
        return plant;
    }
}
