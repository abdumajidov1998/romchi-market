package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.Arkachi;
import uz.sonic.backend.domain.repository.ArkachiRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/arkachilar")
public class ArkachiController {

    private final ArkachiRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;

    public ArkachiController(ArkachiRepository repo, Mappers mappers, ListingSearch search) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveArkachi(String name, String city, String district, String about,
                              List<String> specs, String experience,
                              Integer priceTermo, Integer pricePvx, Integer priceAlyumin,
                              Integer priceJpFasad, Double lat, Double lng, String telegram) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(Arkachi.class, "Arkachi",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qName", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::arkachi);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        Arkachi a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.arkachi(a, search.findPhoneFor(a.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveArkachi body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null
                || body.specs() == null || body.specs().isEmpty()) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        Arkachi a = repo.findByUserId(me.id()).orElseGet(Arkachi::new);
        a.setUserId(me.id());
        a.setName(body.name()); a.setCity(body.city()); a.setDistrict(body.district());
        a.setAbout(body.about() == null ? "" : body.about());
        a.setSpecs(mappers.writeSpecs(body.specs()));
        a.setExperience(body.experience() == null ? "" : body.experience());
        a.setPriceTermo(body.priceTermo() == null ? 0 : body.priceTermo());
        a.setPricePvx(body.pricePvx() == null ? 0 : body.pricePvx());
        a.setPriceAlyumin(body.priceAlyumin() == null ? 0 : body.priceAlyumin());
        a.setPriceJpFasad(body.priceJpFasad() == null ? 0 : body.priceJpFasad());
        a.setLat(body.lat()); a.setLng(body.lng()); a.setTelegram(tg);
        Arkachi saved = repo.save(a);
        return mappers.arkachi(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
