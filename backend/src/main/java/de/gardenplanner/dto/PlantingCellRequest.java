package de.gardenplanner.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class PlantingCellRequest {
    @NotNull
    public UUID plantId;
    public int col;
    public int row;
}
