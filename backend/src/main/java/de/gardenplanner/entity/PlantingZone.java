package de.gardenplanner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "planting_zone")
public class PlantingZone extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "planting_plan_id", nullable = false)
    public PlantingPlan plantingPlan;

    public UUID getPlantingPlanId() {
        return plantingPlan != null ? plantingPlan.id : null;
    }

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plant_id", nullable = false)
    public Plant plant;

    @Column(nullable = false)
    public int minCol;

    @Column(nullable = false)
    public int minRow;

    @Column(nullable = false)
    public int maxCol;

    @Column(nullable = false)
    public int maxRow;

    @Column(nullable = false)
    public double spacingFactor = 1.0;

    // ─── Inventory accounting ──────────────────────────────────────────────
    // How much this planting drew from stock vs. the shopping list, and whose
    // inventory it was charged to — so deleting the zone can put it back.

    @JsonIgnore
    @Column(name = "stock_consumed", nullable = false)
    public int stockConsumed = 0;

    @JsonIgnore
    @Column(name = "to_buy_consumed", nullable = false)
    public int toBuyConsumed = 0;

    @JsonIgnore
    @Column(name = "inventory_user_id")
    public UUID inventoryUserId;
}
