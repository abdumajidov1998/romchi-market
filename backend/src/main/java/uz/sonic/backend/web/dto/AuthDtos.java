package uz.sonic.backend.web.dto;

import java.util.List;

public class AuthDtos {

    public record SendCodeRequest(String phone) {}

    public record VerifyCodeRequest(String phone, String code, String password, String role) {}

    public record RegisterRequest(
            String phone, String password, String role,
            String name, String city, String district,
            List<String> specs, String experience, String about,
            Double lat, Double lng, String telegram,
            Integer salaryFrom, Integer salaryTo
    ) {}

    public record LoginRequest(String phone, String password) {}

    public record TokenResponse(String token, UserDto user) {}

    public record VerifyResponse(String token, UserDto user, boolean isNew) {}

    public record SendCodeResponse(boolean ok, String message, String devCode) {}

    public record UserDto(Long id, String phone, String role) {}
}
