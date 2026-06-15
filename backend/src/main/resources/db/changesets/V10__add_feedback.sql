-- User feedback board: free-text notes with a priority, shared across all users
-- and checkable off (done) once handled.
CREATE TABLE feedback (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    message     TEXT        NOT NULL,
    priority    VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    done        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_done_created ON feedback(done, created_at DESC);
