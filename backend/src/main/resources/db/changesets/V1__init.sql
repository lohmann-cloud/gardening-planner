-- Garden
CREATE TABLE garden (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width_m DOUBLE PRECISION NOT NULL,
    length_m DOUBLE PRECISION NOT NULL,
    grid_resolution_m DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garden Bed
CREATE TABLE garden_bed (
    id UUID PRIMARY KEY,
    garden_id UUID NOT NULL REFERENCES garden(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    x_m DOUBLE PRECISION NOT NULL,
    y_m DOUBLE PRECISION NOT NULL,
    width_m DOUBLE PRECISION NOT NULL,
    length_m DOUBLE PRECISION NOT NULL
);

-- Obstacle
CREATE TABLE obstacle (
    id UUID PRIMARY KEY,
    garden_id UUID NOT NULL REFERENCES garden(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    x_m DOUBLE PRECISION NOT NULL,
    y_m DOUBLE PRECISION NOT NULL,
    width_m DOUBLE PRECISION NOT NULL,
    length_m DOUBLE PRECISION NOT NULL
);

-- Plant
CREATE TABLE plant (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    botanical_name VARCHAR(255),
    family VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    sun_requirement VARCHAR(50),
    water_requirement VARCHAR(50),
    spacing_cm DOUBLE PRECISION NOT NULL,
    row_spacing_cm DOUBLE PRECISION,
    height_min_cm DOUBLE PRECISION,
    height_max_cm DOUBLE PRECISION,
    nutrient_demand VARCHAR(50),
    rotation_years INTEGER,
    days_to_maturity INTEGER,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE
);

-- Plant seasons (element collection)
CREATE TABLE plant_season (
    plant_id UUID NOT NULL REFERENCES plant(id) ON DELETE CASCADE,
    season VARCHAR(50) NOT NULL
);

-- Planting Plan (per bed, per year)
CREATE TABLE planting_plan (
    id UUID PRIMARY KEY,
    garden_bed_id UUID NOT NULL REFERENCES garden_bed(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    UNIQUE (garden_bed_id, year)
);

-- Planting Cell (individual plant placement)
CREATE TABLE planting_cell (
    id UUID PRIMARY KEY,
    planting_plan_id UUID NOT NULL REFERENCES planting_plan(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES plant(id),
    col INTEGER NOT NULL,
    row INTEGER NOT NULL,
    planted_at TIMESTAMPTZ,
    notes TEXT
);

-- Planting Zone (area assignment)
CREATE TABLE planting_zone (
    id UUID PRIMARY KEY,
    planting_plan_id UUID NOT NULL REFERENCES planting_plan(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES plant(id),
    min_col INTEGER NOT NULL,
    min_row INTEGER NOT NULL,
    max_col INTEGER NOT NULL,
    max_row INTEGER NOT NULL
);
