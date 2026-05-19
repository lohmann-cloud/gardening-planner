CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    google_sub VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE garden_membership (
    id UUID PRIMARY KEY,
    garden_id UUID NOT NULL REFERENCES garden(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (garden_id, user_id)
);

CREATE INDEX idx_garden_membership_user ON garden_membership(user_id);
CREATE INDEX idx_garden_membership_garden ON garden_membership(garden_id);
