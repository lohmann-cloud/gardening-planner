package de.gardenplanner.auth;

import de.gardenplanner.entity.GardenMembership;
import de.gardenplanner.entity.User;
import de.gardenplanner.model.Role;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotAuthorizedException;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * Centralises the authentication and per-garden authorisation checks used
 * by REST resources.
 */
@ApplicationScoped
public class AccessControl {

    @Inject
    CurrentUser currentUser;

    public User requireAuth() {
        if (!currentUser.isAuthenticated()) {
            throw new NotAuthorizedException("Authentication required");
        }
        User u = currentUser.load();
        if (u == null) throw new NotAuthorizedException("Authentication required");
        return u;
    }

    public GardenMembership requireMember(UUID gardenId) {
        return requireRole(gardenId, EnumSet.allOf(Role.class));
    }

    public GardenMembership requireEditor(UUID gardenId) {
        return requireRole(gardenId, EnumSet.of(Role.OWNER, Role.COLLABORATOR));
    }

    public GardenMembership requireOwner(UUID gardenId) {
        return requireRole(gardenId, EnumSet.of(Role.OWNER));
    }

    private GardenMembership requireRole(UUID gardenId, Set<Role> allowed) {
        User user = requireAuth();
        GardenMembership m = GardenMembership.findForGardenAndUser(gardenId, user.id);
        if (m == null || !allowed.contains(m.role)) {
            throw new ForbiddenException("Not allowed for this garden");
        }
        return m;
    }
}
