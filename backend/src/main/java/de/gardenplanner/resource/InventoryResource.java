package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.dto.InventoryItemDto;
import de.gardenplanner.dto.InventoryUpsertRequest;
import de.gardenplanner.entity.InventoryItem;
import de.gardenplanner.entity.Plant;
import de.gardenplanner.entity.User;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/inventory")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class InventoryResource {

    @Inject
    AccessControl access;

    @GET
    public List<InventoryItemDto> getInventory() {
        User user = access.requireAuth();
        return InventoryItem.findByUser(user.id).stream()
                .map(InventoryItemDto::from)
                .toList();
    }

    @PUT
    @Transactional
    public InventoryItemDto upsert(@Valid InventoryUpsertRequest req) {
        User user = access.requireAuth();
        Plant plant = Plant.findById(req.plantId);
        if (plant == null) throw new NotFoundException("Plant not found");

        InventoryItem item = InventoryItem.findByUserAndPlant(user.id, req.plantId);
        if (item == null) {
            item = new InventoryItem();
            item.user = user;
            item.plant = plant;
        }
        item.quantity = req.quantity;
        item.persist();
        return InventoryItemDto.from(item);
    }

    @DELETE
    @Path("/{plantId}")
    @Transactional
    public Response remove(@PathParam("plantId") UUID plantId) {
        User user = access.requireAuth();
        InventoryItem item = InventoryItem.findByUserAndPlant(user.id, plantId);
        if (item == null) throw new NotFoundException("Inventory item not found");
        item.delete();
        return Response.noContent().build();
    }
}
