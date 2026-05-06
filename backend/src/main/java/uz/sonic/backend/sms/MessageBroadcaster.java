package uz.sonic.backend.sms;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Picks the first {@link MessageSender} that {@code supports} a given
 * recipient and delegates to it. Spring auto-wires the full list, so adding
 * a new channel is just registering another {@code @Component}.
 */
@Component
public class MessageBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(MessageBroadcaster.class);

    private final List<MessageSender> senders;

    public MessageBroadcaster(List<MessageSender> senders) {
        this.senders = senders;
    }

    public void sendMessage(String username, String message) {
        senders.stream()
                .filter(s -> s.supports(username))
                .findFirst()
                .ifPresentOrElse(
                        s -> s.sendMessage(username, message),
                        () -> log.warn("no MessageSender supports recipient: {}", username)
                );
    }
}
