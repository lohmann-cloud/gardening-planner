package de.gardenplanner.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public class ObstacleRequest {
    @NotBlank
    public String label;
    public double xM;
    public double yM;
    @DecimalMin("0.1")
    public double widthM;
    @DecimalMin("0.1")
    public double lengthM;
}
