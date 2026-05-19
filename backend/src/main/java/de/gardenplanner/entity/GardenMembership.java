package de.gardenplanner.entity;

import de.gardenplanner.model.Role;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
    name = "garden_membership",
    uniqueConstraints = @UniqueConstraint(columnNames = {"garden_id", "user_id"})
)
public class GardenMembership extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "garden_id")
    public Garden garden;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    public User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public Role role;

    @Column(nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    public static List<GardenMembership> findByGarden(UUID gardenId) {
        return list("garden.id", gardenId);
    }

    public static List<GardenMembership> findByUser(UUID userId) {
        return list("user.id", userId);
    }

    public static GardenMembership findForGardenAndUser(UUID gardenId, UUID userId) {
        return find("garden.id = ?1 and user.id = ?2", gardenId, userId).firstResult();
    }
}
