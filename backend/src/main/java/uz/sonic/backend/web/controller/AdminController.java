package uz.sonic.backend.web.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.*;
import uz.sonic.backend.domain.repository.UserRepository;
import uz.sonic.backend.security.AdminGuard;
import uz.sonic.backend.sms.SmsService;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.*;
import java.util.function.BiFunction;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    /** Per the original server.js, "qisqa tavsif" threshold is 20 chars. */
    private static final int SHORT_DESC_LEN = 20;

    record TypeDef(String entity, String descCol, boolean hasVerified, String imageCol, String priceCol) {}

    /** Mirrors ADMIN_TYPES from server.js. */
    private static final LinkedHashMap<String, TypeDef> ADMIN_TYPES = new LinkedHashMap<>();
    static {
        ADMIN_TYPES.put("workers",          new TypeDef("Worker",          "about",       true,  null,       null));
        ADMIN_TYPES.put("jobs",             new TypeDef("Job",             "description", false, null,       null));
        ADMIN_TYPES.put("waste-buyers",     new TypeDef("WasteBuyer",      "about",       true,  null,       null));
        ADMIN_TYPES.put("usluga",           new TypeDef("UslugaProvider",  "about",       true,  null,       null));
        ADMIN_TYPES.put("stanok",           new TypeDef("StanokMaster",    "about",       true,  null,       null));
        ADMIN_TYPES.put("stanok-ads",       new TypeDef("StanokAd",        "description", true,  "imageUrl", "price"));
        ADMIN_TYPES.put("delivery",         new TypeDef("DeliveryDriver",  "about",       true,  null,       null));
        ADMIN_TYPES.put("install-brigades", new TypeDef("InstallBrigade",  "about",       true,  null,       null));
        ADMIN_TYPES.put("arkachilar",       new TypeDef("Arkachi",         "about",       true,  null,       null));
    }

    @PersistenceContext
    EntityManager em;

    private final UserRepository users;
    private final SmsService sms;
    private final AdminGuard guard;
    private final Mappers mappers;

    private final Map<String, BiFunction<Object, String, Map<String, Object>>> listingMapper;

    public AdminController(UserRepository users, SmsService sms, AdminGuard guard, Mappers mappers) {
        this.users = users;
        this.sms = sms;
        this.guard = guard;
        this.mappers = mappers;
        this.listingMapper = Map.of(
                "workers",          (e, p) -> mappers.worker((Worker) e, p),
                "jobs",             (e, p) -> mappers.job((Job) e, p),
                "waste-buyers",     (e, p) -> mappers.wasteBuyer((WasteBuyer) e, p),
                "usluga",           (e, p) -> mappers.usluga((UslugaProvider) e, p),
                "stanok",           (e, p) -> mappers.stanok((StanokMaster) e, p),
                "stanok-ads",       (e, p) -> mappers.stanokAd((StanokAd) e, p),
                "delivery",         (e, p) -> mappers.delivery((DeliveryDriver) e, p),
                "install-brigades", (e, p) -> mappers.installBrigade((InstallBrigade) e, p),
                "arkachilar",       (e, p) -> mappers.arkachi((Arkachi) e, p)
        );
    }

    private long count(String jpql, Object... params) {
        var q = em.createQuery(jpql, Long.class);
        for (int i = 0; i < params.length; i++) q.setParameter(i + 1, params[i]);
        Long n = q.getSingleResult();
        return n == null ? 0 : n;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        long now = System.currentTimeMillis() / 1000;
        long todayStart = now - (now % (24 * 3600));

        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, Long> today = new LinkedHashMap<>();
        Map<String, Long> unverified = new LinkedHashMap<>();
        Map<String, Long> noImage = new LinkedHashMap<>();
        Map<String, Long> noPrice = new LinkedHashMap<>();
        Map<String, Long> shortDesc = new LinkedHashMap<>();

        counts.put("users", count("SELECT COUNT(u) FROM User u"));
        today.put("users", count("SELECT COUNT(u) FROM User u WHERE u.createdAt > ?1", todayStart));

        long unvTotal = 0, noImgTotal = 0, noPrTotal = 0, shortTotal = 0;

        for (var entry : ADMIN_TYPES.entrySet()) {
            String key = entry.getKey();
            TypeDef def = entry.getValue();
            counts.put(key, count("SELECT COUNT(e) FROM " + def.entity() + " e"));
            today.put(key, count("SELECT COUNT(e) FROM " + def.entity() + " e WHERE e.createdAt > ?1", todayStart));
            if (def.hasVerified()) {
                long u = count("SELECT COUNT(e) FROM " + def.entity() + " e WHERE e.verified = 0");
                unverified.put(key, u);
                unvTotal += u;
            }
            if (def.imageCol() != null) {
                long n = count("SELECT COUNT(e) FROM " + def.entity() + " e WHERE e." + def.imageCol() + " IS NULL OR e." + def.imageCol() + " = ''");
                noImage.put(key, n);
                noImgTotal += n;
            }
            if (def.priceCol() != null) {
                long n = count("SELECT COUNT(e) FROM " + def.entity() + " e WHERE e." + def.priceCol() + " IS NULL OR e." + def.priceCol() + " = 0");
                noPrice.put(key, n);
                noPrTotal += n;
            }
            long s = count("SELECT COUNT(e) FROM " + def.entity() + " e WHERE COALESCE(LENGTH(e." + def.descCol() + "), 0) < ?1",
                    SHORT_DESC_LEN);
            shortDesc.put(key, s);
            shortTotal += s;
        }

        // Cities — union of city columns across all listing tables, summed and ordered by count desc.
        Map<String, Long> cityCounts = new HashMap<>();
        for (var def : ADMIN_TYPES.values()) {
            @SuppressWarnings("unchecked")
            List<Object[]> rows = em.createQuery(
                    "SELECT e.city, COUNT(e) FROM " + def.entity() + " e WHERE e.city IS NOT NULL AND e.city <> '' GROUP BY e.city")
                    .getResultList();
            for (Object[] r : rows) cityCounts.merge((String) r[0], ((Number) r[1]).longValue(), Long::sum);
        }
        List<Map<String, Object>> cities = new ArrayList<>();
        cityCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .forEach(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("city", e.getKey());
                    m.put("count", e.getValue());
                    cities.add(m);
                });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("counts", counts);
        result.put("today", today);
        result.put("unverified", unverified);
        Map<String, Object> quality = new LinkedHashMap<>();
        quality.put("noImage", noImage);
        quality.put("noPrice", noPrice);
        quality.put("shortDesc", shortDesc);
        result.put("quality", quality);
        result.put("cities", cities);
        result.put("attention", Map.of(
                "moderation", unvTotal,
                "noImage", noImgTotal,
                "noPrice", noPrTotal,
                "shortDesc", shortTotal));
        result.put("sms", Map.of(
                "lastHour", sms.lastHourCount(),
                "last24h", sms.last24hCount()));
        return result;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> listUsers(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) String limit,
                                               @RequestParam(required = false) String offset) {
        int lim = ListingSearch.parseLimit(limit, 100, 500);
        int off = ListingSearch.parseOffset(offset);
        var pageable = org.springframework.data.domain.PageRequest.of(off / Math.max(lim, 1), lim);
        List<User> rows = (q == null || q.isBlank()) ? users.findAllOrdered(pageable) : users.searchByPhone(q, pageable);
        return rows.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("phone", u.getPhone());
            m.put("role", u.getRole());
            m.put("created_at", u.getCreatedAt());
            m.put("isAdmin", guard.isAdminPhone(u.getPhone()));
            return m;
        }).toList();
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public Map<String, Object> deleteUser(@PathVariable Long id) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        if (guard.isAdminPhone(u.getPhone())) throw ApiException.badRequest("Cannot delete admin");
        users.deleteById(id);
        return Map.of("ok", true);
    }

    @GetMapping("/listings/{type}")
    public List<Map<String, Object>> listings(@PathVariable String type,
                                              @RequestParam(required = false) String limit,
                                              @RequestParam(required = false) String offset) {
        TypeDef def = ADMIN_TYPES.get(type);
        if (def == null) throw ApiException.badRequest("Unknown type");
        int lim = ListingSearch.parseLimit(limit, 100, 500);
        int off = ListingSearch.parseOffset(offset);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createQuery(
                "SELECT e, u.phone FROM " + def.entity() + " e LEFT JOIN User u ON u.id = e.userId ORDER BY e.id DESC")
                .setFirstResult(off).setMaxResults(lim).getResultList();
        var mapper = listingMapper.get(type);
        return rows.stream().map(r -> mapper.apply(r[0], r[1] == null ? null : r[1].toString())).toList();
    }

    @DeleteMapping("/listings/{type}/{id}")
    @Transactional
    public Map<String, Object> deleteListing(@PathVariable String type, @PathVariable Long id) {
        TypeDef def = ADMIN_TYPES.get(type);
        if (def == null) throw ApiException.badRequest("Unknown type");
        int rows = em.createQuery("DELETE FROM " + def.entity() + " e WHERE e.id = ?1")
                .setParameter(1, id).executeUpdate();
        return Map.of("ok", true, "deleted", rows);
    }

    public record VerifyBody(Boolean verified) {}

    @PatchMapping("/listings/{type}/{id}/verify")
    @Transactional
    public Map<String, Object> verifyListing(@PathVariable String type, @PathVariable Long id,
                                             @RequestBody VerifyBody body) {
        TypeDef def = ADMIN_TYPES.get(type);
        if (def == null) throw ApiException.badRequest("Unknown type");
        if (!def.hasVerified()) throw ApiException.badRequest("Type does not support verify");
        int rows = em.createQuery("UPDATE " + def.entity() + " e SET e.verified = ?1 WHERE e.id = ?2")
                .setParameter(1, Boolean.TRUE.equals(body.verified()) ? 1 : 0)
                .setParameter(2, id)
                .executeUpdate();
        if (rows == 0) throw ApiException.notFound("Not found");
        return Map.of("ok", true, "verified", Boolean.TRUE.equals(body.verified()));
    }
}
