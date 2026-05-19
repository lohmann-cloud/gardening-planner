package de.gardenplanner.dto;

import de.gardenplanner.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class MembershipRequest {
    @NotBlank
    @Email
    public String email;

    public Role role = Role.COLLABORATOR;
}
