package de.gardenplanner.auth;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.UUID;

/**
 * Request filter that resolves the bearer token into a {@link CurrentUser}.
 * It never rejects requests — protected endpoints are the ones that check
 * {@code currentUser.isAuthenticated()}.
 */
@Provider
@ApplicationScoped
public class AuthFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(AuthFilter.class);

    @Inject
    SessionStore sessions;

    @Inject
    CurrentUser currentUser;

    @Override
    public void filter(ContainerRequestContext ctx) {
        String header = ctx.getHeaderString("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            LOG.debugf("AuthFilter: no bearer header on %s %s", ctx.getMethod(), ctx.getUriInfo().getPath());
            return;
        }
        String token = header.substring("Bearer ".length()).trim();
        UUID userId = sessions.resolve(token);
        LOG.debugf("AuthFilter: %s %s — token %s resolves to %s",
            ctx.getMethod(), ctx.getUriInfo().getPath(),
            token.length() > 8 ? token.substring(0, 8) + "…" : token,
            userId);
        if (userId != null) {
            currentUser.setId(userId);
            currentUser.setToken(token);
        }
    }
}
