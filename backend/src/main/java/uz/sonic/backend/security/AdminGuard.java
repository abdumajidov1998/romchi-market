package uz.sonic.backend.security;

import org.springframework.stereotype.Component;
import uz.sonic.backend.config.AppProperties;

import java.util.List;

@Component
public class AdminGuard {

    private final AppProperties props;

    public AdminGuard(AppProperties props) {
        this.props = props;
    }

    public boolean isAdminPhone(String phone) {
        if (phone == null) return false;
        List<String> list = props.admin().phones();
        if (list == null) return false;
        String trimmed = phone.trim();
        return list.stream().filter(p -> p != null && !p.isBlank()).anyMatch(p -> p.trim().equals(trimmed));
    }
}
