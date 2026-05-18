package de.gardenplanner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "planting_cell")
public class PlantingCell extends PanacheEntityBase {

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
    public int col;

    @Column(nullable = false)
    public int row;

    public Instant plantedAt;

    @Column(columnDefinition = "TEXT")
    public String notes;
}
