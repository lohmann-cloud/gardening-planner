package de.gardenplanner.dto;

import de.gardenplanner.entity.InventoryItem;
import de.gardenplanner.entity.Plant;

import java.util.UUID;

public class InventoryItemDto {
    public UUID id;
    public UUID plantId;
    public String plantName;
    public String plantIconEmoji;
    public String plantColorHex;
    public String plantCategory;
    public int quantity;

    public static InventoryItemDto from(InventoryItem item) {
        InventoryItemDto dto = new InventoryItemDto();
        dto.id = item.id;
        dto.plantId = item.plant.id;
        dto.plantName = item.plant.name;
        dto.plantIconEmoji = item.plant.iconEmoji;
        dto.plantColorHex = item.plant.colorHex;
        dto.plantCategory = item.plant.category != null ? item.plant.category.name() : null;
        dto.quantity = item.quantity;
        return dto;
    }
}
