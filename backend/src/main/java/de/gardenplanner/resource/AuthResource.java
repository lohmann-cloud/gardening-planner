package de.gardenplanner.resource;

import de.gardenplanner.auth.CurrentUser;
import de.gardenplanner.auth.GoogleTokenVerifier;
import de.gardenplanner.auth.GoogleTokenVerifier.GoogleProfile;
import de.gardenplanner.auth.SessionStore;
import de.gardenplanner.dto.AuthResponse;
import de.gardenplanner.dto.AuthResponse.UserDto;
import de.gardenplanner.dto.GoogleLoginRequest;
import de.gardenplanner.entity.User;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    GoogleTokenVerifier verifier;

    @Inject
    SessionStore sessions;

    @Inject
    CurrentUser currentUser;

    @POST
    @Path("/google")
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest req) {
        if (req == null || req.idToken == null) {
            throw new BadRequestException("idToken is required");
        }
        GoogleProfile profile = verifier.verify(req.idToken);
        User user = User.findByGoogleSub(profile.sub());
        if (user == null) {
            user = User.findByEmail(profile.email());
        }
        if (user == null) {
            user = new User();
            user.email = profile.email();
        }
        user.googleSub = profile.sub();
        user.name = profile.name();
        user.pictureUrl = profile.pictureUrl();
        user.lastLoginAt = Instant.now();
        user.persist();

        String token = sessions.issue(user);
        return new AuthResponse(token, user);
    }

    @GET
    @Path("/me")
    public Response me() {
        if (!currentUser.isAuthenticated()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        User u = currentUser.load();
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return Response.ok(UserDto.from(u)).build();
    }

    @POST
    @Path("/logout")
    public Response logout() {
        if (currentUser.token != null) {
            sessions.revoke(currentUser.token);
        }
        return Response.noContent().build();
    }
}
