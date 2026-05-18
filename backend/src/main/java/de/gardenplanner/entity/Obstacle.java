package de.gardenplanner.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "obstacle")
public class Obstacle extends PanacheEntityBase {

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
    public String label;

    @Column(name = "x_m", nullable = false)
    public double xM;

    @Column(name = "y_m", nullable = false)
    public double yM;

    @Column(name = "width_m", nullable = false)
    public double widthM;

    @Column(name = "length_m", nullable = false)
    public double lengthM;
}
