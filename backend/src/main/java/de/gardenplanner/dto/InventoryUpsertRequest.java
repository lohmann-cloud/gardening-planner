package de.gardenplanner.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class InventoryUpsertRequest {
    @NotNull
    public UUID plantId;

    @Min(0)
    public int quantity;
}
