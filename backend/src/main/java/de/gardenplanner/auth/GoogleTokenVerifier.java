package de.gardenplanner.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotAuthorizedException;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Optional;

/**
 * Verifies a Google ID token by calling the Google tokeninfo endpoint. This
 * is the simplest correct verification path — Google itself validates the
 * signature and expiry. We additionally check the audience against the
 * configured OAuth client id.
 */
@ApplicationScoped
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @ConfigProperty(name = "auth.google.client-id")
    Optional<String> expectedAudience;

    public GoogleProfile verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new NotAuthorizedException("Missing Google ID token");
        }
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(TOKENINFO_URL + idToken)).GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                throw new NotAuthorizedException("Google rejected the token");
            }
            JsonNode payload = json.readTree(res.body());
            String sub = text(payload, "sub");
            String email = text(payload, "email");
            String name = text(payload, "name");
            String picture = text(payload, "picture");
            String aud = text(payload, "aud");
            if (sub == null || email == null) {
                throw new NotAuthorizedException("Google token payload missing required fields");
            }
            if (expectedAudience.isPresent() && !expectedAudience.get().equals(aud)) {
                throw new NotAuthorizedException("Google token audience mismatch");
            }
            return new GoogleProfile(sub, email, name != null ? name : email, picture);
        } catch (NotAuthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new NotAuthorizedException("Google token verification failed: " + e.getMessage());
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    public record GoogleProfile(String sub, String email, String name, String pictureUrl) {}
}
