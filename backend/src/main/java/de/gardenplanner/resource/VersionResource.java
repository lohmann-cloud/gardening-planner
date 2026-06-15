package de.gardenplanner.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Unauthenticated build-info endpoint. Returns the git commit and build
 * timestamp baked in at build time (see {@code build-info.properties}, filled
 * by Gradle's {@code processResources}). Public on purpose so deployment can be
 * verified even when login/sessions are unavailable.
 */
@Path("/version")
@Produces(MediaType.APPLICATION_JSON)
public class VersionResource {

    private final VersionInfo info = load();

    @GET
    public VersionInfo get() {
        return info;
    }

    private static VersionInfo load() {
        Properties p = new Properties();
        try (InputStream in = VersionResource.class.getResourceAsStream("/build-info.properties")) {
            if (in != null) p.load(in);
        } catch (IOException ignored) {
            // fall through to defaults
        }
        VersionInfo v = new VersionInfo();
        v.gitSha = p.getProperty("git.sha", "unknown");
        v.buildTime = p.getProperty("build.time", "unknown");
        return v;
    }

    public static class VersionInfo {
        public String gitSha;
        public String buildTime;
    }
}
