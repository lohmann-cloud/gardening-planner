-- Persistent login sessions: opaque token -> user, with expiry.
-- Keeps users logged in across backend restarts and redeploys.
CREATE TABLE app_session (
    token       VARCHAR(64) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_app_session_user ON app_session(user_id);
