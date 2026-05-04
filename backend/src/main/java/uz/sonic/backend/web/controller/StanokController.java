package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.StanokMaster;
import uz.sonic.backend.domain.repository.StanokMasterRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stanok")
public class StanokController {

    private final StanokMasterRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;

    public StanokController(StanokMasterRepository repo, Mappers mappers, ListingSearch search) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveStanok(String name, String city, String district, String about,
                             List<String> specs, Integer priceDiagnostika, Integer priceCharxlash,
                             Boolean urgent, String experience,
                             Double lat, Double lng, String telegram) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(StanokMaster.class, "StanokMaster",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qName", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::stanok);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        StanokMaster s = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.stanok(s, search.findPhoneFor(s.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveStanok body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null
                || body.specs() == null || body.specs().isEmpty()) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        StanokMaster s = repo.findByUserId(me.id()).orElseGet(StanokMaster::new);
        s.setUserId(me.id());
        s.setName(body.name()); s.setCity(body.city()); s.setDistrict(body.district());
        s.setAbout(body.about() == null ? "" : body.about());
        s.setSpecs(mappers.writeSpecs(body.specs()));
        s.setPriceDiagnostika(body.priceDiagnostika() == null ? 0 : body.priceDiagnostika());
        s.setPriceCharxlash(body.priceCharxlash() == null ? 0 : body.priceCharxlash());
        s.setUrgent(Boolean.TRUE.equals(body.urgent()) ? 1 : 0);
        s.setExperience(body.experience() == null ? "" : body.experience());
        s.setLat(body.lat()); s.setLng(body.lng()); s.setTelegram(tg);
        StanokMaster saved = repo.save(s);
        return mappers.stanok(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
