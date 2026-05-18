package de.gardenplanner.resource;

import de.gardenplanner.dto.PlantingCellRequest;
import de.gardenplanner.dto.PlantingZoneRequest;
import de.gardenplanner.entity.*;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;

@Path("/gardens/{gardenId}/beds/{bedId}/plantings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PlantingResource {

    @GET
    @Path("/{year}")
    @Transactional
    public PlantingPlan getPlanForYear(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year) {
        GardenBed bed = requireBed(gardenId, bedId);
        PlantingPlan plan = PlantingPlan.findByBedAndYear(bedId, year);
        if (plan == null) {
            plan = new PlantingPlan();
            plan.gardenBed = bed;
            plan.year = year;
            plan.persist();
        }
        return plan;
    }

    @DELETE
    @Path("/{year}")
    @Transactional
    public Response deletePlan(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year) {
        requireBed(gardenId, bedId);
        PlantingPlan plan = PlantingPlan.findByBedAndYear(bedId, year);
        if (plan == null) throw new NotFoundException("Planting plan not found");
        plan.delete();
        return Response.noContent().build();
    }

    @POST
    @Path("/{year}/cells")
    @Transactional
    public Response addCell(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year,
            @Valid PlantingCellRequest req) {
        GardenBed bed = requireBed(gardenId, bedId);
        PlantingPlan plan = getOrCreatePlan(bed, year);
        Plant plant = Plant.findById(req.plantId);
        if (plant == null) throw new NotFoundException("Plant not found");
        PlantingCell cell = new PlantingCell();
        cell.plantingPlan = plan;
        cell.plant = plant;
        cell.col = req.col;
        cell.row = req.row;
        cell.persist();
        return Response.status(Response.Status.CREATED).entity(cell).build();
    }

    @DELETE
    @Path("/{year}/cells/{cellId}")
    @Transactional
    public Response removeCell(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year,
            @PathParam("cellId") UUID cellId) {
        requireBed(gardenId, bedId);
        PlantingCell cell = PlantingCell.findById(cellId);
        if (cell == null) throw new NotFoundException("Cell not found");
        cell.delete();
        return Response.noContent().build();
    }

    @POST
    @Path("/{year}/zones")
    @Transactional
    public Response addZone(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year,
            @Valid PlantingZoneRequest req) {
        GardenBed bed = requireBed(gardenId, bedId);
        PlantingPlan plan = getOrCreatePlan(bed, year);
        Plant plant = Plant.findById(req.plantId);
        if (plant == null) throw new NotFoundException("Plant not found");
        PlantingZone zone = new PlantingZone();
        zone.plantingPlan = plan;
        zone.plant = plant;
        zone.minCol = req.minCol;
        zone.minRow = req.minRow;
        zone.maxCol = req.maxCol;
        zone.maxRow = req.maxRow;
        zone.spacingFactor = req.spacingFactor;
        zone.persist();
        return Response.status(Response.Status.CREATED).entity(zone).build();
    }

    @DELETE
    @Path("/{year}/zones/{zoneId}")
    @Transactional
    public Response removeZone(
            @PathParam("gardenId") UUID gardenId,
            @PathParam("bedId") UUID bedId,
            @PathParam("year") int year,
            @PathParam("zoneId") UUID zoneId) {
        requireBed(gardenId, bedId);
        PlantingZone zone = PlantingZone.findById(zoneId);
        if (zone == null) throw new NotFoundException("Zone not found");
        zone.delete();
        return Response.noContent().build();
    }

    private GardenBed requireBed(UUID gardenId, UUID bedId) {
        GardenBed bed = GardenBed.findById(bedId);
        if (bed == null || !bed.garden.id.equals(gardenId)) throw new NotFoundException("Bed not found");
        return bed;
    }

    private PlantingPlan getOrCreatePlan(GardenBed bed, int year) {
        PlantingPlan plan = PlantingPlan.findByBedAndYear(bed.id, year);
        if (plan == null) {
            plan = new PlantingPlan();
            plan.gardenBed = bed;
            plan.year = year;
            plan.persist();
        }
        return plan;
    }
}
