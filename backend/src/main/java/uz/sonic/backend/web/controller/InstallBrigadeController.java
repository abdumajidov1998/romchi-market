package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.InstallBrigade;
import uz.sonic.backend.domain.repository.InstallBrigadeRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/install-brigada")
public class InstallBrigadeController {

    private final InstallBrigadeRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;

    public InstallBrigadeController(InstallBrigadeRepository repo, Mappers mappers, ListingSearch search) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveBrigade(String name, String city, String district, String about,
                              List<String> specs, Integer teamSize, String experience,
                              Integer priceTermo, Integer pricePvx, Integer priceAlyumin,
                              Integer priceJpFasad, Double lat, Double lng, String telegram) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(InstallBrigade.class, "InstallBrigade",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qName", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::installBrigade);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        InstallBrigade b = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.installBrigade(b, search.findPhoneFor(b.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveBrigade body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null
                || body.specs() == null || body.specs().isEmpty()) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        InstallBrigade b = repo.findByUserId(me.id()).orElseGet(InstallBrigade::new);
        b.setUserId(me.id());
        b.setName(body.name()); b.setCity(body.city()); b.setDistrict(body.district());
        b.setAbout(body.about() == null ? "" : body.about());
        b.setSpecs(mappers.writeSpecs(body.specs()));
        b.setTeamSize(body.teamSize() == null ? 1 : body.teamSize());
        b.setExperience(body.experience() == null ? "" : body.experience());
        b.setPriceTermo(body.priceTermo() == null ? 0 : body.priceTermo());
        b.setPricePvx(body.pricePvx() == null ? 0 : body.pricePvx());
        b.setPriceAlyumin(body.priceAlyumin() == null ? 0 : body.priceAlyumin());
        b.setPriceJpFasad(body.priceJpFasad() == null ? 0 : body.priceJpFasad());
        b.setLat(body.lat()); b.setLng(body.lng()); b.setTelegram(tg);
        InstallBrigade saved = repo.save(b);
        return mappers.installBrigade(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
