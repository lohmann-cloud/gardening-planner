package de.gardenplanner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "garden_bed")
public class GardenBed extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garden_id", nullable = false)
    public Garden garden;

    public UUID getGardenId() {
        return garden != null ? garden.id : null;
    }

    @Column(nullable = false)
    public String name;

    @Column(name = "x_m", nullable = false)
    public double xM;

    @Column(name = "y_m", nullable = false)
    public double yM;

    @Column(name = "width_m", nullable = false)
    public double widthM;

    @Column(name = "length_m", nullable = false)
    public double lengthM;

    @Column(name = "rotation_deg", nullable = false)
    public double rotationDeg = 0;

    @JsonIgnore
    @OneToMany(mappedBy = "gardenBed", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<PlantingPlan> plantingPlans = new ArrayList<>();
}
