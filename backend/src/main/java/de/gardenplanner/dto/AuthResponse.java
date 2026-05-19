package de.gardenplanner.dto;

import de.gardenplanner.entity.User;

import java.util.UUID;

public class AuthResponse {
    public String token;
    public UserDto user;

    public AuthResponse(String token, User user) {
        this.token = token;
        this.user = UserDto.from(user);
    }

    public static class UserDto {
        public UUID id;
        public String email;
        public String name;
        public String pictureUrl;

        public static UserDto from(User u) {
            UserDto d = new UserDto();
            d.id = u.id;
            d.email = u.email;
            d.name = u.name;
            d.pictureUrl = u.pictureUrl;
            return d;
        }
    }
}
