-- Shopping list: plants planted beyond the available stock
ALTER TABLE inventory_item ADD COLUMN to_buy INTEGER NOT NULL DEFAULT 0;

-- Track how much each zone consumed, so deletions can put it back
ALTER TABLE planting_zone ADD COLUMN stock_consumed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE planting_zone ADD COLUMN to_buy_consumed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE planting_zone ADD COLUMN inventory_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL;
