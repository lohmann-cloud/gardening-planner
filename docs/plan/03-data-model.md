# Data Model — Garden Planner

## Entity Relationship Overview

```
User ──< GardenMember >── Garden
                              │
                    ┌─────────┴──────────┐
                 Obstacle             GardenBed
                                          │
                                    PlantingPlan (per year)
                                          │
                                    PlantingCell
                                          │
                                       Plant (catalog)
                                          │
                               ┌──────────┴──────────┐
                           CompanionRule        RotationGroup

User ──< SeedInventory >── Plant
```

---

## Entities

### User
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| googleId | string | From OAuth |
| email | string | Unique |
| displayName | string | |
| avatarUrl | string | From Google |
| createdAt | timestamp | |

---

### Garden
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | |
| description | string? | Optional |
| widthM | float | Total garden width in metres |
| lengthM | float | Total garden length in metres |
| gridResolutionM | float | Default 0.5 m per cell |
| createdAt | timestamp | |
| updatedAt | timestamp | |

---

### GardenMember (join table)
| Field | Type | Notes |
|---|---|---|
| gardenId | UUID | FK → Garden |
| userId | UUID | FK → User |
| role | enum | `owner`, `collaborator`, `viewer` |
| joinedAt | timestamp | |

---

### Obstacle
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| gardenId | UUID | FK → Garden |
| label | string | e.g. "Shed", "Path" |
| xM | float | Position from top-left (metres) |
| yM | float | |
| widthM | float | |
| lengthM | float | |

---

### GardenBed (Field)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| gardenId | UUID | FK → Garden |
| name | string | e.g. "Bed A", "South Bed" |
| xM | float | Position from top-left |
| yM | float | |
| widthM | float | |
| lengthM | float | |
| createdAt | timestamp | |

---

### Plant (Global Catalog)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | Common name |
| scientificName | string? | |
| category | enum | `vegetable`, `fruit`, `herb`, `flower`, `tree`, `shrub` |
| rotationGroupId | UUID? | FK → RotationGroup |
| seasons | enum[] | `spring`, `summer`, `autumn`, `winter` |
| sunRequirement | enum | `full-sun`, `partial-shade`, `full-shade` |
| waterRequirement | enum | `low`, `medium`, `high` |
| spacingCm | int | Minimum spacing between plants |
| daysToMaturity | int? | |
| fertilizationNotes | string? | e.g. "Nitrogen-rich in spring" |
| isCustom | boolean | true = user-created entry |
| createdByUserId | UUID? | FK → User (for custom entries) |

---

### CompanionRule
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| plantId | UUID | FK → Plant |
| companionPlantId | UUID | FK → Plant |
| relationship | enum | `beneficial`, `incompatible` |
| notes | string? | Reason / explanation |

---

### RotationGroup
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | e.g. "Brassicas", "Legumes", "Alliums", "Roots" |
| description | string? | |
| followedBy | UUID? | FK → RotationGroup (recommended next group) |

---

### SeedInventory
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| plantId | UUID | FK → Plant |
| quantity | int? | Number of seed packets / seeds |
| purchasedAt | date? | |
| bestBeforeYear | int? | |
| notes | string? | |

---

### PlantingPlan
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| gardenBedId | UUID | FK → GardenBed |
| year | int | Planning year |
| createdAt | timestamp | |
| updatedAt | timestamp | |

*One PlantingPlan per bed per year.*

---

### PlantingCell
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| plantingPlanId | UUID | FK → PlantingPlan |
| plantId | UUID | FK → Plant |
| col | int | Grid column within the bed |
| row | int | Grid row within the bed |
| plantedAt | date? | Actual planting date |
| notes | string? | |

---

## Enums

```typescript
enum Role         { owner, collaborator, viewer }
enum Category     { vegetable, fruit, herb, flower, tree, shrub }
enum Season       { spring, summer, autumn, winter }
enum Sun          { full_sun, partial_shade, full_shade }
enum Water        { low, medium, high }
enum Relationship { beneficial, incompatible }
```

---

## Key Design Decisions

1. **PlantingPlan is per-bed per-year** — this is the foundation for rotation tracking. Querying a bed's plans across years tells you what rotation group was there each year.
2. **CompanionRule is directional** — `A beneficial B` does not imply `B beneficial A` (can be added separately).
3. **Grid in cells, not metres** — PlantingCell uses integer col/row indices. Cell size = plant spacing (or bed-level resolution). This simplifies placement logic.
4. **Obstacles and beds store position in metres** — they live in the layout coordinate system; the frontend converts to pixels based on canvas scale.
5. **SeedInventory is per-user** — not shared with garden collaborators (private to the grower).
