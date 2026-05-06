package uz.sonic.backend.sms;

import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import uz.sonic.backend.config.AppProperties;

/**
 * Eskiz.uz SMS sender. Lives behind the {@link MessageSender} abstraction so
 * the rate-limit / verification-code logic in {@link SmsService} stays free
 * of HTTP details and so a future channel (Telegram, email, …) can be added
 * by registering another bean.
 *
 * <p>Eskiz semantics worth knowing:
 * <ul>
 *   <li>Login at {@code /api/auth/login} returns a token in {@code data.token}.</li>
 *   <li>Send at {@code /api/message/sms/send} expects a Bearer token plus
 *       {@code mobile_phone} (digits only, no leading {@code +}),
 *       {@code message}, and a registered {@code from} sender id.</li>
 *   <li>The token expires; on 401 we refresh it and retry up to {@code MAX_RETRIES}.</li>
 *   <li>If the project hasn't been wired to Eskiz yet (no email/password),
 *       this sender becomes a no-op so dev/staging keeps working with the
 *       in-app dev-code echo.</li>
 * </ul>
 */
@Component
public class SmsVerificationSender implements MessageSender {

    private static final Logger log = LoggerFactory.getLogger(SmsVerificationSender.class);
    private static final Pattern INTERNATIONAL_PHONE = Pattern.compile("^\\+[0-9]{7,15}$");
    private static final int MAX_RETRIES = 3;

    private final RestTemplate restTemplate;
    private final AppProperties props;

    private volatile String token;

    public SmsVerificationSender(RestTemplate restTemplate, AppProperties props) {
        this.restTemplate = restTemplate;
        this.props = props;
    }

    @Override
    public boolean supports(String username) {
        return username != null && INTERNATIONAL_PHONE.matcher(username).matches();
    }

    @Override
    public void sendMessage(String phoneNumber, String message) {
        AppProperties.Sms cfg = props.sms();

        // Configured test phone short-circuits — never hits Eskiz, used by QA.
        if (phoneNumber.equals(cfg.testPhone())) {
            log.info("test phone — skip real SMS: phone={}", phoneNumber);
            return;
        }
        // Eskiz not configured — log the code locally so dev/staging still works.
        if (!isConfigured()) {
            log.info("[DEV] SMS message phone={} body={}", phoneNumber, message);
            return;
        }

        int attempt = 1;
        while (attempt <= MAX_RETRIES) {
            try {
                ensureTokenInitialized();
                restTemplate.exchange(cfg.sendUrl(), HttpMethod.POST, buildSendRequest(phoneNumber, message), String.class);
                log.info("sms delivered phone={}", phoneNumber);
                return;
            } catch (HttpClientErrorException.Unauthorized e) {
                log.warn("eskiz token expired, refreshing (attempt {}/{}) phone={}", attempt, MAX_RETRIES, phoneNumber);
                refreshToken();
                attempt++;
            } catch (Exception e) {
                log.warn("eskiz send failed (attempt {}/{}) phone={}: {}", attempt, MAX_RETRIES, phoneNumber, e.getMessage());
                attempt++;
            }
        }
        log.error("eskiz send giving up phone={} after {} attempts", phoneNumber, MAX_RETRIES);
    }

    private boolean isConfigured() {
        AppProperties.Sms cfg = props.sms();
        return cfg.eskizEmail() != null && !cfg.eskizEmail().isBlank()
                && cfg.eskizPassword() != null && !cfg.eskizPassword().isBlank();
    }

    private synchronized void ensureTokenInitialized() {
        if (token == null) refreshToken();
    }

    private synchronized void refreshToken() {
        AppProperties.Sms cfg = props.sms();
        SmsTokenModel resp = Objects.requireNonNull(restTemplate.postForObject(
                cfg.loginUrl(),
                Map.of("email", cfg.eskizEmail(), "password", cfg.eskizPassword()),
                SmsTokenModel.class
        ));
        if (resp.data() == null || resp.data().token() == null) {
            throw new IllegalStateException("Eskiz login returned no token");
        }
        this.token = resp.data().token();
    }

    private HttpEntity<Map<String, String>> buildSendRequest(String phoneNumber, String message) {
        AppProperties.Sms cfg = props.sms();
        Map<String, String> body = Map.of(
                "mobile_phone", phoneNumber.startsWith("+") ? phoneNumber.substring(1) : phoneNumber,
                "message", message,
                "from", cfg.senderId()
        );
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    /** Auth response shape: {@code {"message":"…","data":{"token":"…"},"token_type":"bearer"}}. */
    public record SmsTokenModel(String message, Data data, String token_type) {
        public record Data(String token) {}
    }
}
