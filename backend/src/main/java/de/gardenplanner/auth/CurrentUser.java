package de.gardenplanner.auth;

import de.gardenplanner.entity.User;
import jakarta.enterprise.context.RequestScoped;

import java.util.UUID;

/**
 * Holds the resolved bearer-token identity for the current HTTP request.
 *
 * Fields are exposed via methods (not direct public fields) so that CDI
 * normal-scope proxies forward writes correctly — direct field writes on
 * a proxy never reach the underlying request-scoped instance.
 */
@RequestScoped
public class CurrentUser {

    private UUID id;
    private String token;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public boolean isAuthenticated() {
        return id != null;
    }

    public User load() {
        return id == null ? null : User.findById(id);
    }
}
