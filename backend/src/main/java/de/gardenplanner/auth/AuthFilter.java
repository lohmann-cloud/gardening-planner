package de.gardenplanner.auth;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

import java.util.UUID;

/**
 * Pre-matching request filter that resolves the bearer token into a
 * {@link CurrentUser}. It never rejects requests — protected endpoints are
 * the ones that check {@code currentUser.isAuthenticated()}.
 */
@Provider
public class AuthFilter implements ContainerRequestFilter {

    @Inject
    SessionStore sessions;

    @Inject
    CurrentUser currentUser;

    @Override
    public void filter(ContainerRequestContext ctx) {
        String header = ctx.getHeaderString("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return;
        String token = header.substring("Bearer ".length()).trim();
        UUID userId = sessions.resolve(token);
        if (userId != null) {
            currentUser.id = userId;
            currentUser.token = token;
        }
    }
}
