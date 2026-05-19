package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.dto.ObstaclePatchRequest;
import de.gardenplanner.dto.ObstacleRequest;
import de.gardenplanner.entity.Garden;
import de.gardenplanner.entity.Obstacle;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/gardens/{gardenId}/obstacles")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ObstacleResource {

    @Inject
    AccessControl access;

    @GET
    public List<Obstacle> getAll(@PathParam("gardenId") UUID gardenId) {
        access.requireMember(gardenId);
        Garden garden = Garden.findById(gardenId);
        if (garden == null) throw new NotFoundException("Garden not found");
        return Obstacle.list("garden.id", gardenId);
    }

    @POST
    @Transactional
    public Response create(@PathParam("gardenId") UUID gardenId, @Valid ObstacleRequest req) {
        access.requireEditor(gardenId);
        Garden garden = Garden.findById(gardenId);
        if (garden == null) throw new NotFoundException("Garden not found");
        Obstacle obstacle = new Obstacle();
        obstacle.garden = garden;
        obstacle.label = req.label;
        obstacle.xM = req.xM;
        obstacle.yM = req.yM;
        obstacle.widthM = req.widthM;
        obstacle.lengthM = req.lengthM;
        obstacle.persist();
        return Response.status(Response.Status.CREATED).entity(obstacle).build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public Obstacle update(@PathParam("gardenId") UUID gardenId, @PathParam("id") UUID id, ObstaclePatchRequest req) {
        access.requireEditor(gardenId);
        Obstacle obstacle = Obstacle.findById(id);
        if (obstacle == null || !obstacle.garden.id.equals(gardenId)) throw new NotFoundException("Obstacle not found");
        if (req.label != null) obstacle.label = req.label;
        if (req.xM != null) obstacle.xM = req.xM;
        if (req.yM != null) obstacle.yM = req.yM;
        if (req.widthM != null) obstacle.widthM = req.widthM;
        if (req.lengthM != null) obstacle.lengthM = req.lengthM;
        return obstacle;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("gardenId") UUID gardenId, @PathParam("id") UUID id) {
        access.requireEditor(gardenId);
        Obstacle obstacle = Obstacle.findById(id);
        if (obstacle == null || !obstacle.garden.id.equals(gardenId)) throw new NotFoundException("Obstacle not found");
        obstacle.delete();
        return Response.noContent().build();
    }
}
