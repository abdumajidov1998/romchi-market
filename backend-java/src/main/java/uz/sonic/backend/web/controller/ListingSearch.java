package uz.sonic.backend.web.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/**
 * Lightweight JPQL builder for list endpoints. Each domain has the same
 * shape — JOIN users on user_id, optional city/spec/q filters, ORDER + LIMIT —
 * so we centralise it instead of repeating in each controller.
 */
@Component
public class ListingSearch {

    @PersistenceContext
    EntityManager em;

    public static int parseLimit(String raw, int def, int max) {
        try {
            int v = raw == null ? def : Integer.parseInt(raw);
            if (v <= 0) return def;
            return Math.min(v, max);
        } catch (NumberFormatException e) {
            return def;
        }
    }

    public static int parseOffset(String raw) {
        try {
            int v = raw == null ? 0 : Integer.parseInt(raw);
            return Math.max(v, 0);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * @param entityName JPQL entity name (e.g. "Worker")
     * @param order      ORDER BY clause without "ORDER BY" prefix (e.g. "top DESC, rating DESC, e.id DESC")
     * @param filters    map of {column -> value} where column is e.g. "city" or special "specsLike" / "qNameOrAbout"
     * @param limit/offset pagination
     * @return list of {entity, phone} pairs as Map keyed by "entity" and "phone"
     */
    public <T> List<Map<String, Object>> findWithPhone(Class<T> entityType, String entityName,
                                                       String order, Map<String, Object> filters,
                                                       int limit, int offset, BiFunction<T, String, Map<String, Object>> mapper) {
        StringBuilder jpql = new StringBuilder("SELECT e, u.phone FROM ")
                .append(entityName).append(" e LEFT JOIN User u ON u.id = e.userId WHERE 1=1");
        Map<String, Object> params = new LinkedHashMap<>();
        for (Map.Entry<String, Object> f : filters.entrySet()) {
            String k = f.getKey();
            Object v = f.getValue();
            if (v == null) continue;
            if (v instanceof String s && s.isBlank()) continue;
            switch (k) {
                case "city" -> { jpql.append(" AND e.city = :city"); params.put("city", v); }
                case "specsLike" -> { jpql.append(" AND e.specs LIKE :spec"); params.put("spec", "%\"" + v + "\"%"); }
                case "vehicleModel" -> { jpql.append(" AND e.vehicleModel = :vm"); params.put("vm", v); }
                case "condition" -> { jpql.append(" AND e.condition = :cond"); params.put("cond", v); }
                case "stanokType" -> { jpql.append(" AND e.stanokType = :st"); params.put("st", v); }
                case "qNameOrAbout" -> {
                    jpql.append(" AND (LOWER(e.name) LIKE :q OR LOWER(e.about) LIKE :q)");
                    params.put("q", "%" + ((String) v).toLowerCase() + "%");
                }
                case "qName" -> {
                    jpql.append(" AND LOWER(e.name) LIKE :q");
                    params.put("q", "%" + ((String) v).toLowerCase() + "%");
                }
                case "qTitleOrCompany" -> {
                    jpql.append(" AND (LOWER(e.title) LIKE :q OR LOWER(e.company) LIKE :q)");
                    params.put("q", "%" + ((String) v).toLowerCase() + "%");
                }
                case "qTitleOrDescription" -> {
                    jpql.append(" AND (LOWER(e.title) LIKE :q OR LOWER(e.description) LIKE :q)");
                    params.put("q", "%" + ((String) v).toLowerCase() + "%");
                }
                default -> { /* ignore unknown filter keys */ }
            }
        }
        jpql.append(" ORDER BY ").append(order);

        Query q = em.createQuery(jpql.toString());
        params.forEach(q::setParameter);
        q.setFirstResult(offset);
        q.setMaxResults(limit);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            @SuppressWarnings("unchecked")
            T entity = (T) r[0];
            String phone = r[1] == null ? null : r[1].toString();
            out.add(mapper.apply(entity, phone));
        }
        return out;
    }

    public String findPhoneFor(Long userId) {
        if (userId == null) return null;
        try {
            return em.createQuery("SELECT u.phone FROM User u WHERE u.id = :id", String.class)
                    .setParameter("id", userId).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }
}
