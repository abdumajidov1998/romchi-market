package uz.sonic.backend.web.mapper;

import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import uz.sonic.backend.domain.entity.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the JSON shapes the front-end expects. Existing api.ts contracts
 * use camelCase fields plus a few renames (jobs_done → jobs) that don't
 * fall out of JPA's snake_case mapping, so we shape them by hand.
 */
@Component
public class Mappers {
    // Spring Boot 4's WebMvc starter no longer auto-configures an
    // ObjectMapper bean, so we own one here. Jackson is only used to
    // read/write the small JSON-encoded "specs" string in TEXT columns.
    private final ObjectMapper json = new ObjectMapper();

    public Mappers() {
    }

    public List<String> parseSpecs(String specs) {
        if (specs == null || specs.isBlank()) return List.of();
        try {
            return json.readValue(specs, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    public String writeSpecs(List<String> specs) {
        try {
            return json.writeValueAsString(specs == null ? List.of() : specs);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static boolean toBool(Integer i) {
        return i != null && i != 0;
    }

    private void putCommon(Map<String, Object> m, Long id, Long userId, String name, String city,
                           String district, String about, Double lat, Double lng, String telegram,
                           Long createdAt, String phone) {
        m.put("id", id);
        if (userId != null) m.put("user_id", userId);
        m.put("name", name);
        m.put("city", city);
        m.put("district", district);
        m.put("about", about);
        m.put("lat", lat);
        m.put("lng", lng);
        m.put("telegram", telegram);
        m.put("created_at", createdAt);
        if (phone != null) m.put("phone", phone);
    }

    public Map<String, Object> worker(Worker w, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", w.getId());
        m.put("user_id", w.getUserId());
        m.put("name", w.getName());
        m.put("city", w.getCity());
        m.put("district", w.getDistrict());
        m.put("specs", parseSpecs(w.getSpecs()));
        m.put("experience", w.getExperience());
        m.put("about", w.getAbout());
        m.put("rating", w.getRating());
        m.put("jobs", w.getJobsDone());
        m.put("verified", toBool(w.getVerified()));
        m.put("top", toBool(w.getTop()));
        m.put("lat", w.getLat());
        m.put("lng", w.getLng());
        m.put("telegram", w.getTelegram());
        m.put("salaryFrom", w.getSalaryFrom());
        m.put("salaryTo", w.getSalaryTo());
        m.put("workType", w.getWorkType());
        m.put("created_at", w.getCreatedAt());
        if (phone != null) m.put("phone", phone);
        return m;
    }

    public Map<String, Object> job(Job j, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", j.getId());
        m.put("user_id", j.getUserId());
        m.put("title", j.getTitle());
        m.put("company", j.getCompany());
        m.put("type", j.getType());
        m.put("workType", j.getWorkType());
        m.put("city", j.getCity());
        m.put("district", j.getDistrict());
        m.put("experience", j.getExperience());
        m.put("salaryFrom", j.getSalaryFrom());
        m.put("salaryTo", j.getSalaryTo());
        m.put("specs", parseSpecs(j.getSpecs()));
        m.put("description", j.getDescription());
        m.put("badge", j.getBadge());
        m.put("lat", j.getLat());
        m.put("lng", j.getLng());
        m.put("created_at", j.getCreatedAt());
        if (phone != null) m.put("phone", phone);
        return m;
    }

    public Map<String, Object> wasteBuyer(WasteBuyer w, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, w.getId(), w.getUserId(), w.getName(), w.getCity(), w.getDistrict(), w.getAbout(),
                w.getLat(), w.getLng(), w.getTelegram(), w.getCreatedAt(), phone);
        m.put("priceTermo", w.getPriceTermo());
        m.put("pricePvxOq", w.getPricePvxOq());
        m.put("pricePvxRangli", w.getPricePvxRangli());
        m.put("priceAlyumin", w.getPriceAlyumin());
        m.put("priceAlikabond", w.getPriceAlikabond());
        m.put("rating", w.getRating());
        m.put("verified", toBool(w.getVerified()));
        m.put("top", toBool(w.getTop()));
        return m;
    }

    public Map<String, Object> usluga(UslugaProvider u, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, u.getId(), u.getUserId(), u.getName(), u.getCity(), u.getDistrict(), u.getAbout(),
                u.getLat(), u.getLng(), u.getTelegram(), u.getCreatedAt(), phone);
        m.put("specs", parseSpecs(u.getSpecs()));
        m.put("priceTermo", u.getPriceTermo());
        m.put("pricePvx", u.getPricePvx());
        m.put("priceAlyumin", u.getPriceAlyumin());
        m.put("priceSurma", u.getPriceSurma());
        m.put("verified", toBool(u.getVerified()));
        return m;
    }

    public Map<String, Object> stanok(StanokMaster s, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, s.getId(), s.getUserId(), s.getName(), s.getCity(), s.getDistrict(), s.getAbout(),
                s.getLat(), s.getLng(), s.getTelegram(), s.getCreatedAt(), phone);
        m.put("specs", parseSpecs(s.getSpecs()));
        m.put("priceDiagnostika", s.getPriceDiagnostika());
        m.put("priceCharxlash", s.getPriceCharxlash());
        m.put("urgent", toBool(s.getUrgent()));
        m.put("experience", s.getExperience());
        m.put("verified", toBool(s.getVerified()));
        return m;
    }

    public Map<String, Object> delivery(DeliveryDriver d, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, d.getId(), d.getUserId(), d.getName(), d.getCity(), d.getDistrict(), d.getAbout(),
                d.getLat(), d.getLng(), d.getTelegram(), d.getCreatedAt(), phone);
        m.put("vehicleModel", d.getVehicleModel());
        m.put("isCustomVehicle", toBool(d.getIsCustomVehicle()));
        m.put("vehicleImageUrl", d.getVehicleImageUrl());
        m.put("verified", toBool(d.getVerified()));
        return m;
    }

    public Map<String, Object> stanokAd(StanokAd a, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("user_id", a.getUserId());
        m.put("title", a.getTitle());
        m.put("stanokType", a.getStanokType());
        m.put("condition", a.getCondition());
        m.put("price", a.getPrice());
        m.put("imageUrl", a.getImageUrl());
        m.put("description", a.getDescription());
        m.put("city", a.getCity());
        m.put("district", a.getDistrict());
        m.put("lat", a.getLat());
        m.put("lng", a.getLng());
        m.put("telegram", a.getTelegram());
        m.put("verified", toBool(a.getVerified()));
        m.put("created_at", a.getCreatedAt());
        if (phone != null) m.put("phone", phone);
        return m;
    }

    public Map<String, Object> installBrigade(InstallBrigade b, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, b.getId(), b.getUserId(), b.getName(), b.getCity(), b.getDistrict(), b.getAbout(),
                b.getLat(), b.getLng(), b.getTelegram(), b.getCreatedAt(), phone);
        m.put("specs", parseSpecs(b.getSpecs()));
        m.put("teamSize", b.getTeamSize());
        m.put("experience", b.getExperience());
        m.put("priceTermo", b.getPriceTermo());
        m.put("pricePvx", b.getPricePvx());
        m.put("priceAlyumin", b.getPriceAlyumin());
        m.put("priceJpFasad", b.getPriceJpFasad());
        m.put("verified", toBool(b.getVerified()));
        return m;
    }

    public Map<String, Object> arkachi(Arkachi a, String phone) {
        Map<String, Object> m = new LinkedHashMap<>();
        putCommon(m, a.getId(), a.getUserId(), a.getName(), a.getCity(), a.getDistrict(), a.getAbout(),
                a.getLat(), a.getLng(), a.getTelegram(), a.getCreatedAt(), phone);
        m.put("specs", parseSpecs(a.getSpecs()));
        m.put("experience", a.getExperience());
        m.put("priceTermo", a.getPriceTermo());
        m.put("pricePvx", a.getPricePvx());
        m.put("priceAlyumin", a.getPriceAlyumin());
        m.put("priceJpFasad", a.getPriceJpFasad());
        m.put("verified", toBool(a.getVerified()));
        return m;
    }
}
