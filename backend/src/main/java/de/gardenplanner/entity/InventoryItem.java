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

    /** Plants on hand, not yet planted. */
    @Column(nullable = false)
    public int quantity = 0;

    /** Shopping list: plants planted beyond the available stock. */
    @Column(name = "to_buy", nullable = false)
    public int toBuy = 0;

    public static List<InventoryItem> findByUser(UUID userId) {
        return list("user.id", userId);
    }

    public static InventoryItem findByUserAndPlant(UUID userId, UUID plantId) {
        return find("user.id = ?1 and plant.id = ?2", userId, plantId).firstResult();
    }

    /**
     * Account for planting {@code count} plants: take what we can from stock,
     * push the rest onto the shopping list. Returns {@code [fromStock, toBuyAdded]}
     * so the caller can record it on the zone and reverse it on deletion.
     */
    public static int[] consume(User user, Plant plant, int count) {
        if (count <= 0) return new int[]{0, 0};
        InventoryItem item = findByUserAndPlant(user.id, plant.id);
        if (item == null) {
            item = new InventoryItem();
            item.user = user;
            item.plant = plant;
            item.persist();
        }
        int fromStock = Math.min(count, item.quantity);
        item.quantity -= fromStock;
        int toBuyAdded = count - fromStock;
        item.toBuy += toBuyAdded;
        return new int[]{fromStock, toBuyAdded};
    }

    /** Reverse a previous {@link #consume}: return stock and clear the shopping-list portion. */
    public static void restore(UUID userId, Plant plant, int stockConsumed, int toBuyConsumed) {
        if (userId == null || (stockConsumed == 0 && toBuyConsumed == 0)) return;
        InventoryItem item = findByUserAndPlant(userId, plant.id);
        if (item == null) {
            User user = User.findById(userId);
            if (user == null) return;
            item = new InventoryItem();
            item.user = user;
            item.plant = plant;
            item.persist();
        }
        item.quantity += stockConsumed;
        item.toBuy = Math.max(0, item.toBuy - toBuyConsumed);
    }
}
