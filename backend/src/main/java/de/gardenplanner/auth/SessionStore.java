package de.gardenplanner.auth;

import de.gardenplanner.entity.User;
import jakarta.enterprise.context.ApplicationScoped;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Minimal opaque-token session store used by the Google login flow. Tokens
 * are random 256-bit values handed back to the client and exchanged at every
 * request for the associated user id. Sessions are kept in memory and expire
 * after a fixed TTL.
 */
@ApplicationScoped
public class SessionStore {

    public static final Duration TTL = Duration.ofDays(30);

    private static final SecureRandom RNG = new SecureRandom();

    private final ConcurrentMap<String, Session> sessions = new ConcurrentHashMap<>();

    public String issue(User user) {
        String token = newToken();
        sessions.put(token, new Session(user.id, Instant.now().plus(TTL)));
        return token;
    }

    public UUID resolve(String token) {
        if (token == null) return null;
        Session s = sessions.get(token);
        if (s == null) return null;
        if (s.expiresAt.isBefore(Instant.now())) {
            sessions.remove(token);
            return null;
        }
        return s.userId;
    }

    public void revoke(String token) {
        if (token != null) sessions.remove(token);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record Session(UUID userId, Instant expiresAt) {}
}
