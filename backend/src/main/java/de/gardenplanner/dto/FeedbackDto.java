package de.gardenplanner.dto;

import de.gardenplanner.entity.Feedback;

import java.time.Instant;
import java.util.UUID;

public class FeedbackDto {
    public UUID id;
    public String message;
    public String priority;
    public boolean done;
    public Instant createdAt;
    public UUID authorId;
    public String authorName;
    public String authorPictureUrl;

    public static FeedbackDto from(Feedback f) {
        FeedbackDto dto = new FeedbackDto();
        dto.id = f.id;
        dto.message = f.message;
        dto.priority = f.priority != null ? f.priority.name() : null;
        dto.done = f.done;
        dto.createdAt = f.createdAt;
        dto.authorId = f.user.id;
        dto.authorName = f.user.name;
        dto.authorPictureUrl = f.user.pictureUrl;
        return dto;
    }
}
