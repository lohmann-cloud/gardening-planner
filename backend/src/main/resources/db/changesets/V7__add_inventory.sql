CREATE TABLE inventory_item (
    id          UUID PRIMARY KEY,
    user_id     UUID    NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    plant_id    UUID    NOT NULL REFERENCES plant(id)    ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_inventory_user_plant UNIQUE (user_id, plant_id)
);
