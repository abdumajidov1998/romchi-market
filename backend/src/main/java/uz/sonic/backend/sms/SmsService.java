package uz.sonic.backend.sms;

import java.security.SecureRandom;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import uz.sonic.backend.config.AppProperties;
import uz.sonic.backend.domain.entity.SmsCode;
import uz.sonic.backend.domain.entity.SmsLog;
import uz.sonic.backend.domain.repository.SmsCodeRepository;
import uz.sonic.backend.domain.repository.SmsLogRepository;
import uz.sonic.backend.web.error.ApiException;

/**
 * Verification-code lifecycle: generates, stores, rate-limits, and asks the
 * configured {@link MessageBroadcaster} to deliver. The actual transport
 * (Eskiz HTTP, Telegram, …) lives in the {@link MessageSender} beans —
 * this class doesn't know or care which one runs.
 */
@Service
public class SmsService {
    private static final Logger log = LoggerFactory.getLogger(SmsService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SmsCodeRepository codes;
    private final SmsLogRepository logs;
    private final AppProperties props;
    private final MessageBroadcaster broadcaster;

    public SmsService(SmsCodeRepository codes, SmsLogRepository logs,
                      AppProperties props, MessageBroadcaster broadcaster) {
        this.codes = codes;
        this.logs = logs;
        this.props = props;
        this.broadcaster = broadcaster;
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

        // Always log the issued code for diagnostics; the dev-mode `/api/auth/send-code`
        // response also echoes it back when no Eskiz creds are configured.
        log.info("[DEV] SMS code phone={} code={}", phone, code);
        broadcaster.sendMessage(phone, "Sizning tasdiqlash kodingiz: " + code);
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
}
