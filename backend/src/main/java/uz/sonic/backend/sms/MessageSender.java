package uz.sonic.backend.sms;

/**
 * Generic single-recipient outbound channel — keeps the sender abstraction
 * open to future implementations (Telegram bot, email, etc.) without
 * changing the rate-limit / business code that calls it.
 */
public interface MessageSender {
    /** True if this sender can deliver to {@code username} (phone, email, …). */
    boolean supports(String username);

    /** Best-effort send. Implementations should swallow transient errors and log them. */
    void sendMessage(String username, String message);
}
