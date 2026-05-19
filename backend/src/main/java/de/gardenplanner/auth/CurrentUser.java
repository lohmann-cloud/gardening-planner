package de.gardenplanner.auth;

import de.gardenplanner.entity.User;
import jakarta.enterprise.context.RequestScoped;

import java.util.UUID;

@RequestScoped
public class CurrentUser {
    public UUID id;
    public String token;

    public boolean isAuthenticated() {
        return id != null;
    }

    public User load() {
        return id == null ? null : User.findById(id);
    }
}
