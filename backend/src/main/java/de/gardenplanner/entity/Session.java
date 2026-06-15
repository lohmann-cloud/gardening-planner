package de.gardenplanner.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Persistent login session. The opaque token handed to the client is the
 * primary key; it is exchanged for the owning user id on every request.
 * Persisting these (rather than keeping them in memory) keeps users logged in
 * across backend restarts and redeploys.
 */
@Entity
@Table(name = "app_session")
public class Session extends PanacheEntityBase {

    @Id
    @Column(length = 64)
    public String token;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    public UUID userId;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    public static Session findByToken(String token) {
        return findById(token);
    }
}
