package de.gardenplanner.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "inventory_item")
public class InventoryItem extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    public User user;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "plant_id")
    public Plant plant;

    @Column(nullable = false)
    public int quantity = 0;

    public static List<InventoryItem> findByUser(UUID userId) {
        return list("user.id", userId);
    }

    public static InventoryItem findByUserAndPlant(UUID userId, UUID plantId) {
        return find("user.id = ?1 and plant.id = ?2", userId, plantId).firstResult();
    }
}
