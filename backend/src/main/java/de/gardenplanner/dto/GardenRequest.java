package de.gardenplanner.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public class GardenRequest {
    @NotBlank
    public String name;
    public String description;
    @DecimalMin("0.5")
    public double widthM;
    @DecimalMin("0.5")
    public double lengthM;
}
