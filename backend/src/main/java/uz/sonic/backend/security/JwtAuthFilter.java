package uz.sonic.backend.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import uz.sonic.backend.config.AppProperties;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final AppProperties props;

    public JwtAuthFilter(JwtService jwt, AppProperties props) {
        this.jwt = jwt;
        this.props = props;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = header.substring(7).trim();
            try {
                Claims claims = jwt.parse(token);
                Long id = ((Number) claims.get("id")).longValue();
                String role = (String) claims.get("role");

                List<SimpleGrantedAuthority> auths = new ArrayList<>();
                auths.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                if (props.admin().phones() != null && claims.containsKey("phone")
                        && props.admin().phones().contains(claims.get("phone"))) {
                    auths.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                }

                AppPrincipal principal = new AppPrincipal(id, role);
                var auth = new UsernamePasswordAuthenticationToken(principal, token, auths);
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                // invalid token — leave context anonymous; downstream returns 401 if required
            }
        }
        chain.doFilter(req, res);
    }
}
