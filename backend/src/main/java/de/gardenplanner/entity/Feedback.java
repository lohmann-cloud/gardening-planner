package de.gardenplanner.entity;

import de.gardenplanner.model.FeedbackPriority;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import io.quarkus.panache.common.Sort;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "feedback")
public class Feedback extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    /** Who submitted the feedback. */
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    public User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public FeedbackPriority priority = FeedbackPriority.MEDIUM;

    @Column(nullable = false)
    public boolean done = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    /** Open items first, then most recent. */
    public static List<Feedback> findAllSorted() {
        return listAll(Sort.by("done").and("createdAt", Sort.Direction.Descending));
    }
}
