package de.gardenplanner.auth;

import de.gardenplanner.entity.Session;
import de.gardenplanner.entity.User;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Opaque-token session store used by the Google login flow. Tokens are random
 * 256-bit values handed back to the client and exchanged at every request for
 * the associated user id. Sessions are persisted in the database so they
 * survive backend restarts and redeploys, and expire after a fixed TTL.
 */
@ApplicationScoped
public class SessionStore {

    public static final Duration TTL = Duration.ofDays(30);

    private static final SecureRandom RNG = new SecureRandom();

    @Transactional
    public String issue(User user) {
        Session session = new Session();
        session.token = newToken();
        session.userId = user.id;
        session.expiresAt = Instant.now().plus(TTL);
        session.persist();
        return session.token;
    }

    @Transactional
    public UUID resolve(String token) {
        if (token == null) return null;
        Session session = Session.findByToken(token);
        if (session == null) return null;
        if (session.expiresAt.isBefore(Instant.now())) {
            session.delete();
            return null;
        }
        return session.userId;
    }

    @Transactional
    public void revoke(String token) {
        if (token != null) Session.deleteById(token);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
