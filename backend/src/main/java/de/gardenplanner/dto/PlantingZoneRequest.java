package de.gardenplanner.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class PlantingZoneRequest {
    @NotNull
    public UUID plantId;
    public int minCol;
    public int minRow;
    public int maxCol;
    public int maxRow;
    public double spacingFactor = 1.0;
}
