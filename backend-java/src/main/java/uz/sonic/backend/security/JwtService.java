package uz.sonic.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import uz.sonic.backend.config.AppProperties;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlMillis;

    public JwtService(AppProperties props) {
        byte[] secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            // pad to 32 bytes if dev secret is short — production secrets must be ≥32 bytes
            byte[] padded = new byte[32];
            System.arraycopy(secret, 0, padded, 0, secret.length);
            secret = padded;
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.ttlMillis = props.jwt().ttlDays() * 24L * 3600L * 1000L;
    }

    public String sign(long userId, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(Map.of("id", userId, "role", role))
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
