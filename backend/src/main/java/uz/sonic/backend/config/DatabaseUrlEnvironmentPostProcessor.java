package uz.sonic.backend.config;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Render (and Heroku-style hosts) hand the database connection out as a
 * driver URL — `postgresql://user:pass@host:port/db` — but Spring/Hibernate
 * expects a JDBC URL plus separate username/password. This shim runs before
 * the data-source is built, parses DATABASE_URL when it isn't already in
 * `jdbc:` form, and synthesises the three properties Spring expects.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String dbUrl = env.getProperty("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) return;
        if (dbUrl.startsWith("jdbc:")) return;
        if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) return;

        try {
            URI uri = new URI(dbUrl);
            String username = "";
            String password = "";
            String userInfo = uri.getUserInfo();
            if (userInfo != null) {
                int colon = userInfo.indexOf(':');
                if (colon >= 0) {
                    username = userInfo.substring(0, colon);
                    password = userInfo.substring(colon + 1);
                } else {
                    username = userInfo;
                }
            }
            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() == null ? "" : uri.getPath();
            String query = uri.getQuery() == null ? "" : "?" + uri.getQuery();
            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + query;

            Map<String, Object> props = new HashMap<>();
            props.put("spring.datasource.url", jdbcUrl);
            props.put("spring.datasource.username", username);
            props.put("spring.datasource.password", password);
            env.getPropertySources().addFirst(new MapPropertySource("databaseUrl", props));
        } catch (Exception ignored) {
            // Fall through and let Spring fail with its own clearer message.
        }
    }
}
