package de.gardenplanner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "planting_plan", uniqueConstraints = @UniqueConstraint(columnNames = {"garden_bed_id", "year"}))
public class PlantingPlan extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garden_bed_id", nullable = false)
    public GardenBed gardenBed;

    public UUID getGardenBedId() {
        return gardenBed != null ? gardenBed.id : null;
    }

    @Column(nullable = false)
    public int year;

    @OneToMany(mappedBy = "plantingPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<PlantingCell> cells = new ArrayList<>();

    @OneToMany(mappedBy = "plantingPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<PlantingZone> zones = new ArrayList<>();

    public static PlantingPlan findByBedAndYear(UUID bedId, int year) {
        return find("gardenBed.id = ?1 and year = ?2", bedId, year).firstResult();
    }
}
