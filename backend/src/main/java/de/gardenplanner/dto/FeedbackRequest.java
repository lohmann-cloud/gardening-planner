package de.gardenplanner.dto;

import de.gardenplanner.model.FeedbackPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class FeedbackRequest {
    @NotBlank
    @Size(max = 4000)
    public String message;

    /** Defaults to MEDIUM when omitted. */
    public FeedbackPriority priority;
}
