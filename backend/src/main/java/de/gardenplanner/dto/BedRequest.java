package de.gardenplanner.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public class BedRequest {
    @NotBlank
    public String name;
    public double xM;
    public double yM;
    @DecimalMin("0.5")
    public double widthM;
    @DecimalMin("0.5")
    public double lengthM;
    public double rotationDeg = 0;
}
