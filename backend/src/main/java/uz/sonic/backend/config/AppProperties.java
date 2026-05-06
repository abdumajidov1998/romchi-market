package uz.sonic.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "romchi")
public record AppProperties(
        Jwt jwt,
        Upload upload,
        Cors cors,
        Admin admin,
        Sms sms
) {
    public record Jwt(String secret, int ttlDays) {}

    public record Upload(String dir) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Admin(List<String> phones) {}

    public record Sms(
            String eskizEmail,
            String eskizPassword,
            String sendUrl,
            String loginUrl,
            String senderId,
            String testPhone,
            String messageTemplate,
            int cooldownSec,
            int limitPhoneHour,
            int limitIpHour,
            int limitIpDay
    ) {}
}
