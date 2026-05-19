package de.gardenplanner.dto;

import de.gardenplanner.entity.GardenMembership;
import de.gardenplanner.model.Role;

import java.time.Instant;
import java.util.UUID;

public class MembershipDto {
    public UUID id;
    public UUID userId;
    public String email;
    public String name;
    public String pictureUrl;
    public Role role;
    public Instant createdAt;
    public boolean pending;

    public static MembershipDto from(GardenMembership m) {
        MembershipDto d = new MembershipDto();
        d.id = m.id;
        d.userId = m.user.id;
        d.email = m.user.email;
        d.name = m.user.name;
        d.pictureUrl = m.user.pictureUrl;
        d.role = m.role;
        d.createdAt = m.createdAt;
        d.pending = m.user.googleSub == null;
        return d;
    }
}
