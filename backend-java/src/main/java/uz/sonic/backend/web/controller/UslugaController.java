package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.UslugaProvider;
import uz.sonic.backend.domain.repository.UslugaProviderRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usluga")
public class UslugaController {

    private final UslugaProviderRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;

    public UslugaController(UslugaProviderRepository repo, Mappers mappers, ListingSearch search) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveUsluga(String name, String city, String district, String about,
                             List<String> specs, Integer priceTermo, Integer pricePvx,
                             Integer priceAlyumin, Integer priceSurma,
                             Double lat, Double lng, String telegram) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(UslugaProvider.class, "UslugaProvider",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qName", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::usluga);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        UslugaProvider u = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.usluga(u, search.findPhoneFor(u.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveUsluga body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null
                || body.specs() == null || body.specs().isEmpty()) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        UslugaProvider u = repo.findByUserId(me.id()).orElseGet(UslugaProvider::new);
        u.setUserId(me.id());
        u.setName(body.name()); u.setCity(body.city()); u.setDistrict(body.district());
        u.setAbout(body.about() == null ? "" : body.about());
        u.setSpecs(mappers.writeSpecs(body.specs()));
        u.setPriceTermo(body.priceTermo() == null ? 0 : body.priceTermo());
        u.setPricePvx(body.pricePvx() == null ? 0 : body.pricePvx());
        u.setPriceAlyumin(body.priceAlyumin() == null ? 0 : body.priceAlyumin());
        u.setPriceSurma(body.priceSurma() == null ? 0 : body.priceSurma());
        u.setLat(body.lat()); u.setLng(body.lng()); u.setTelegram(tg);
        UslugaProvider saved = repo.save(u);
        return mappers.usluga(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
