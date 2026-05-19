package de.gardenplanner.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class User extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id = UUID.randomUUID();

    @Column(name = "google_sub", unique = true)
    public String googleSub;

    @Column(nullable = false, unique = true)
    public String email;

    @Column(nullable = false)
    public String name;

    @Column(name = "picture_url", columnDefinition = "TEXT")
    public String pictureUrl;

    @Column(nullable = false, updatable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "last_login_at")
    public Instant lastLoginAt;

    public static User findByEmail(String email) {
        return find("email", email).firstResult();
    }

    public static User findByGoogleSub(String sub) {
        return find("googleSub", sub).firstResult();
    }
}
