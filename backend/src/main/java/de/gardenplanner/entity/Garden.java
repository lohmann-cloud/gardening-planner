package de.gardenplanner.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "garden")
public class Garden extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @Column(nullable = false)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(name = "width_m", nullable = false)
    public double widthM;

    @Column(name = "length_m", nullable = false)
    public double lengthM;

    @Column(name = "grid_resolution_m", nullable = false)
    public double gridResolutionM = 0.5;

    @Column(nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(nullable = false)
    public Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "garden", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<GardenBed> beds = new ArrayList<>();

    @OneToMany(mappedBy = "garden", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    public List<Obstacle> obstacles = new ArrayList<>();

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
