package uz.sonic.backend.web.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.config.AppProperties;
import uz.sonic.backend.domain.entity.SmsCode;
import uz.sonic.backend.domain.entity.User;
import uz.sonic.backend.domain.entity.Worker;
import uz.sonic.backend.domain.repository.UserRepository;
import uz.sonic.backend.domain.repository.WorkerRepository;
import uz.sonic.backend.security.AdminGuard;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.security.JwtService;
import uz.sonic.backend.sms.SmsService;
import uz.sonic.backend.web.dto.AuthDtos.*;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class AuthController {

    // Pre-computed bcrypt hash so the user-not-found path still runs the
    // bcrypt cost — prevents timing-based phone enumeration.
    private static final String DUMMY_HASH = "$2a$10$35iZ/TnaGQUKEv5Q4yBZMe.J6PbpxD7Sa4NAt9bDyUYuWpWPiDqWm";

    private static final Set<String> ALLOWED_REGISTER_ROLES = Set.of("worker", "employer", "waste_buyer");

    private final UserRepository users;
    private final WorkerRepository workers;
    private final JwtService jwt;
    private final PasswordEncoder bcrypt;
    private final SmsService sms;
    private final AdminGuard adminGuard;
    private final AppProperties props;
    private final Mappers mappers;
    private final ProfilesService profilesService;

    public AuthController(UserRepository users, WorkerRepository workers, JwtService jwt,
                          PasswordEncoder bcrypt, SmsService sms, AdminGuard adminGuard,
                          AppProperties props, Mappers mappers, ProfilesService profilesService) {
        this.users = users;
        this.workers = workers;
        this.jwt = jwt;
        this.bcrypt = bcrypt;
        this.sms = sms;
        this.adminGuard = adminGuard;
        this.props = props;
        this.mappers = mappers;
        this.profilesService = profilesService;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    private static String cleanPhone(String phone) {
        return phone == null ? "" : phone.replaceAll("\\s", "");
    }

    @PostMapping("/auth/send-code")
    public SendCodeResponse sendCode(@RequestBody SendCodeRequest body, HttpServletRequest req) {
        if (body == null || body.phone() == null || body.phone().isBlank()) {
            throw ApiException.badRequest("Telefon raqam kerak");
        }
        String phone = cleanPhone(body.phone());
        sms.sendCode(phone, clientIp(req));
        // For dev mode, echo the code so the front-end PhoneVerify can autofill it.
        String devCode = sms.isDevMode() ? sms.get(phone).map(SmsCode::getCode).orElse(null) : null;
        return new SendCodeResponse(true, "Kod yuborildi", devCode);
    }

    @PostMapping("/auth/verify-code")
    @Transactional
    public VerifyResponse verifyCode(@RequestBody VerifyCodeRequest body) {
        if (body == null || body.phone() == null || body.code() == null) {
            throw ApiException.badRequest("Telefon va kod kerak");
        }
        String phone = cleanPhone(body.phone());
        SmsCode entry = sms.get(phone)
                .orElseThrow(() -> ApiException.badRequest("Avval kod yuboring"));
        long now = System.currentTimeMillis() / 1000;
        if (entry.getExpiresAt() < now) {
            sms.delete(phone);
            throw ApiException.badRequest("Kod muddati tugagan. Qayta yuboring.");
        }
        if (entry.getAttempts() != null && entry.getAttempts() >= 5) {
            sms.delete(phone);
            throw ApiException.badRequest("Juda ko'p urinish. Qayta kod yuboring.");
        }
        sms.bumpAttempts(phone);
        if (!entry.getCode().equals(body.code())) throw ApiException.badRequest("Kod noto'g'ri");

        return users.findByPhone(phone)
                .map(u -> {
                    sms.delete(phone);
                    String token = jwt.sign(u.getId(), u.getRole(), u.getPhone());
                    return new VerifyResponse(token, new UserDto(u.getId(), u.getPhone(), u.getRole()), false);
                })
                .orElseGet(() -> {
                    if (body.password() == null || body.role() == null) {
                        throw ApiException.badRequest("Parol va rol kerak (yangi foydalanuvchi)");
                    }
                    sms.delete(phone);
                    User u = users.save(User.builder()
                            .phone(phone)
                            .passwordHash(bcrypt.encode(body.password()))
                            .role(body.role())
                            .build());
                    String token = jwt.sign(u.getId(), u.getRole(), u.getPhone());
                    return new VerifyResponse(token, new UserDto(u.getId(), u.getPhone(), u.getRole()), true);
                });
    }

    @PostMapping("/auth/register")
    @Transactional
    public TokenResponse register(@RequestBody RegisterRequest body) {
        if (body == null || body.phone() == null || body.password() == null || body.role() == null) {
            throw ApiException.badRequest("phone, password, role required");
        }
        if (!ALLOWED_REGISTER_ROLES.contains(body.role())) {
            throw ApiException.badRequest("invalid role");
        }
        if (users.existsByPhone(body.phone())) {
            throw ApiException.conflict("Phone already registered");
        }
        User u = users.save(User.builder()
                .phone(body.phone())
                .passwordHash(bcrypt.encode(body.password()))
                .role(body.role())
                .build());

        if ("worker".equals(body.role())
                && body.name() != null && body.city() != null && body.district() != null
                && body.specs() != null && body.experience() != null) {
            String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
            workers.save(Worker.builder()
                    .userId(u.getId())
                    .name(body.name())
                    .city(body.city())
                    .district(body.district())
                    .specs(mappers.writeSpecs(body.specs()))
                    .experience(body.experience())
                    .about(body.about() == null ? "" : body.about())
                    .lat(body.lat()).lng(body.lng()).telegram(tg)
                    .salaryFrom(body.salaryFrom()).salaryTo(body.salaryTo())
                    .build());
        }

        return new TokenResponse(jwt.sign(u.getId(), u.getRole(), u.getPhone()),
                new UserDto(u.getId(), u.getPhone(), u.getRole()));
    }

    @PostMapping("/auth/login")
    public TokenResponse login(@RequestBody LoginRequest body) {
        if (body == null || body.phone() == null || body.password() == null) {
            throw ApiException.unauthorized("Telefon yoki parol noto'g'ri");
        }
        User u = users.findByPhone(body.phone()).orElse(null);
        String hash = u != null ? u.getPasswordHash() : DUMMY_HASH;
        boolean ok = bcrypt.matches(body.password(), hash);
        if (u == null || !ok) throw ApiException.unauthorized("Telefon yoki parol noto'g'ri");
        return new TokenResponse(jwt.sign(u.getId(), u.getRole(), u.getPhone()),
                new UserDto(u.getId(), u.getPhone(), u.getRole()));
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        User u = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Not found"));
        Object profile = null;
        if ("worker".equals(u.getRole())) {
            profile = workers.findByUserId(u.getId())
                    .map(w -> mappers.worker(w, u.getPhone()))
                    .orElse(null);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", new UserDto(u.getId(), u.getPhone(), u.getRole()));
        body.put("profile", profile);
        body.put("isAdmin", adminGuard.isAdminPhone(u.getPhone()));
        return body;
    }

    @GetMapping("/me/profiles")
    public Map<String, Object> myProfiles(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        return profilesService.collect(me.id());
    }

    // Stub thrown by /me when user not authenticated — Spring Security will already
    // 401, this keeps the response shape consistent if reached.
    @ExceptionHandler(IllegalStateException.class)
    public Map<String, String> illegal(IllegalStateException e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
