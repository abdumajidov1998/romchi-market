package uz.sonic.backend;

import java.net.URI;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class BackendJavaApplication {

    public static void main(String[] args) {
        translateDatabaseUrl();
        SpringApplication.run(BackendJavaApplication.class, args);
    }

    /**
     * Render and other Heroku-style hosts hand the database connection out as
     * a driver URL — `postgresql://user:pass@host[:port]/db` — but Spring
     * needs `jdbc:postgresql://host:port/db` plus separate username/password.
     * Translate it into system properties before Spring starts so the data
     * source picks up the right values.
     */
    private static void translateDatabaseUrl() {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) return;
        if (dbUrl.startsWith("jdbc:")) return;
        if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) return;
        try {
            URI uri = new URI(dbUrl);
            String userInfo = uri.getUserInfo();
            String username = "";
            String password = "";
            if (userInfo != null) {
                int colon = userInfo.indexOf(':');
                if (colon >= 0) {
                    username = userInfo.substring(0, colon);
                    password = userInfo.substring(colon + 1);
                } else {
                    username = userInfo;
                }
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() == null ? "" : uri.getPath();
            String query = uri.getQuery() == null ? "" : "?" + uri.getQuery();
            String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + path + query;
            System.setProperty("spring.datasource.url", jdbcUrl);
            System.setProperty("spring.datasource.username", username);
            System.setProperty("spring.datasource.password", password);
        } catch (Exception ignored) {
            // Let Spring fail later with its own clearer message.
        }
    }

}
