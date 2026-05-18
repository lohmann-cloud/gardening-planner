package de.gardenplanner.resource;

import de.gardenplanner.dto.BedPatchRequest;
import de.gardenplanner.dto.BedRequest;
import de.gardenplanner.entity.Garden;
import de.gardenplanner.entity.GardenBed;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/gardens/{gardenId}/beds")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BedResource {

    @GET
    public List<GardenBed> getAll(@PathParam("gardenId") UUID gardenId) {
        Garden garden = Garden.findById(gardenId);
        if (garden == null) throw new NotFoundException("Garden not found");
        return GardenBed.list("garden.id", gardenId);
    }

    @POST
    @Transactional
    public Response create(@PathParam("gardenId") UUID gardenId, @Valid BedRequest req) {
        Garden garden = Garden.findById(gardenId);
        if (garden == null) throw new NotFoundException("Garden not found");
        GardenBed bed = new GardenBed();
        bed.garden = garden;
        bed.name = req.name;
        bed.xM = req.xM;
        bed.yM = req.yM;
        bed.widthM = req.widthM;
        bed.lengthM = req.lengthM;
        bed.rotationDeg = req.rotationDeg;
        bed.persist();
        return Response.status(Response.Status.CREATED).entity(bed).build();
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public GardenBed update(@PathParam("gardenId") UUID gardenId, @PathParam("id") UUID id, BedPatchRequest req) {
        GardenBed bed = GardenBed.findById(id);
        if (bed == null || !bed.garden.id.equals(gardenId)) throw new NotFoundException("Bed not found");
        if (req.name != null) bed.name = req.name;
        if (req.xM != null) bed.xM = req.xM;
        if (req.yM != null) bed.yM = req.yM;
        if (req.widthM != null) bed.widthM = req.widthM;
        if (req.lengthM != null) bed.lengthM = req.lengthM;
        if (req.rotationDeg != null) bed.rotationDeg = req.rotationDeg;
        return bed;
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("gardenId") UUID gardenId, @PathParam("id") UUID id) {
        GardenBed bed = GardenBed.findById(id);
        if (bed == null || !bed.garden.id.equals(gardenId)) throw new NotFoundException("Bed not found");
        bed.delete();
        return Response.noContent().build();
    }
}
