package de.gardenplanner.entity;

import de.gardenplanner.model.*;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "plant")
public class Plant extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @Column(nullable = false)
    public String name;

    public String botanicalName;
    public String family;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Category category;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plant_season", joinColumns = @JoinColumn(name = "plant_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "season")
    public List<Season> seasons = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    public Sun sunRequirement;

    @Enumerated(EnumType.STRING)
    public Water waterRequirement;

    @Column(nullable = false)
    public double spacingCm;

    public Double rowSpacingCm;
    public Double heightMinCm;
    public Double heightMaxCm;

    @Enumerated(EnumType.STRING)
    public NutrientDemand nutrientDemand;

    public Integer rotationYears;
    public Integer daysToMaturity;
    public boolean isCustom = false;
}
