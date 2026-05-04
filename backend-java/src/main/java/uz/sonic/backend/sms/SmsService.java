package uz.sonic.backend.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import uz.sonic.backend.config.AppProperties;
import uz.sonic.backend.domain.entity.SmsCode;
import uz.sonic.backend.domain.entity.SmsLog;
import uz.sonic.backend.domain.repository.SmsCodeRepository;
import uz.sonic.backend.domain.repository.SmsLogRepository;
import uz.sonic.backend.web.error.ApiException;

import java.security.SecureRandom;
import java.util.Map;
import java.util.Optional;

@Service
public class SmsService {
    private static final Logger log = LoggerFactory.getLogger(SmsService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SmsCodeRepository codes;
    private final SmsLogRepository logs;
    private final AppProperties props;
    private final RestClient http = RestClient.create();

    private volatile String cachedToken;
    private volatile long tokenExpires;

    public SmsService(SmsCodeRepository codes, SmsLogRepository logs, AppProperties props) {
        this.codes = codes;
        this.logs = logs;
        this.props = props;
    }

    private static long nowSec() {
        return System.currentTimeMillis() / 1000;
    }

    public void sendCode(String phone, String ip) {
        long now = nowSec();
        AppProperties.Sms cfg = props.sms();

        Optional<SmsCode> existing = codes.findById(phone);
        if (existing.isPresent()) {
            long elapsed = now - existing.get().getCreatedAt();
            if (elapsed < cfg.cooldownSec()) {
                throw ApiException.tooMany("Kod yaqinda yuborildi. " + (cfg.cooldownSec() - elapsed) + " soniya kuting.");
            }
        }

        long phoneHour = logs.countByPhoneSince(phone, now - 3600);
        if (phoneHour >= cfg.limitPhoneHour()) {
            throw ApiException.tooMany("Bu raqamga soatiga " + cfg.limitPhoneHour() + " ta SMS yuborildi. Keyinroq urining.");
        }
        if (ip != null && !ip.isBlank()) {
            long ipHour = logs.countByIpSince(ip, now - 3600);
            if (ipHour >= cfg.limitIpHour()) throw ApiException.tooMany("Juda ko'p so'rov. Keyinroq urining.");
            long ipDay = logs.countByIpSince(ip, now - 24 * 3600);
            if (ipDay >= cfg.limitIpDay()) throw ApiException.tooMany("Kunlik limit oshib ketdi.");
        }

        String code = String.valueOf(1000 + RANDOM.nextInt(9000));
        codes.deleteById(phone);
        codes.flush();
        codes.save(SmsCode.builder()
                .phone(phone)
                .code(code)
                .expiresAt(now + 5 * 60)
                .attempts(0)
                .createdAt(now)
                .build());
        logs.save(SmsLog.builder().phone(phone).ip(ip == null ? "" : ip).createdAt(now).build());

        sendViaEskiz(phone, code);
        log.info("sms sent phone={} ip={}", phone, ip);
    }

    public boolean isDevMode() {
        return props.sms().eskizEmail() == null || props.sms().eskizEmail().isBlank()
                || props.sms().eskizPassword() == null || props.sms().eskizPassword().isBlank();
    }

    public Optional<SmsCode> get(String phone) {
        return codes.findById(phone);
    }

    public void delete(String phone) {
        codes.deleteById(phone);
    }

    public void bumpAttempts(String phone) {
        codes.bumpAttempts(phone);
    }

    public String generateAndStoreCode(String phone) {
        // Used by send-code only — returns the issued code so we can echo in dev mode.
        String existing = codes.findById(phone).map(SmsCode::getCode).orElse(null);
        return existing;
    }

    public long lastHourCount() {
        return logs.countSince(nowSec() - 3600);
    }

    public long last24hCount() {
        return logs.countSince(nowSec() - 24 * 3600);
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanup() {
        long now = nowSec();
        try {
            int expired = codes.deleteExpired(now);
            int oldLogs = logs.deleteOlderThan(now - 7 * 24 * 3600);
            if (expired + oldLogs > 0) log.debug("sms cleanup: codes={} logs={}", expired, oldLogs);
        } catch (Exception e) {
            log.warn("sms cleanup failed", e);
        }
    }

    // --- Eskiz integration ---

    private void sendViaEskiz(String phone, String code) {
        String token = obtainEskizToken();
        if (token == null) {
            log.info("[DEV] SMS code phone={} code={}", phone, code);
            return;
        }
        String clean = phone.replaceAll("\\D", "");
        try {
            http.post()
                    .uri("https://notify.eskiz.uz/api/message/sms/send")
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "mobile_phone", clean,
                            "message", "Romchi Market: " + code + " - tasdiqlash kodi\n@romchi-market.onrender.com #" + code,
                            "from", "4546"
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("eskiz send failed", e);
            if (!isDevMode()) {
                throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "SMS provider failed");
            }
        }
    }

    private String obtainEskizToken() {
        if (isDevMode()) return null;
        long now = nowSec();
        if (cachedToken != null && now < tokenExpires) return cachedToken;
        try {
            Map<String, Object> resp = http.post()
                    .uri("https://notify.eskiz.uz/api/auth/login")
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "email", props.sms().eskizEmail(),
                            "password", props.sms().eskizPassword()))
                    .retrieve()
                    .body(Map.class);
            if (resp == null) return null;
            Object data = resp.get("data");
            if (data instanceof Map<?, ?> m) {
                Object t = m.get("token");
                if (t != null) {
                    cachedToken = t.toString();
                    tokenExpires = now + 25 * 24 * 3600; // ~25 days, real token lasts 30
                    return cachedToken;
                }
            }
        } catch (Exception e) {
            log.warn("eskiz auth failed", e);
        }
        return null;
    }
}
