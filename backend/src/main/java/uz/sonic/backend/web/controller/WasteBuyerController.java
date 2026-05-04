package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.WasteBuyer;
import uz.sonic.backend.domain.repository.WasteBuyerRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waste-buyers")
public class WasteBuyerController {

    private final WasteBuyerRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;

    public WasteBuyerController(WasteBuyerRepository repo, Mappers mappers, ListingSearch search) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveWasteBuyer(String name, String city, String district, String about,
                                 Integer priceTermo, Integer pricePvxOq, Integer pricePvxRangli,
                                 Integer priceAlyumin, Integer priceAlikabond,
                                 Double lat, Double lng, String telegram) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(WasteBuyer.class, "WasteBuyer",
                "e.top DESC, e.rating DESC, e.id DESC",
                Map.of("city", city == null ? "" : city, "qName", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::wasteBuyer);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        WasteBuyer w = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.wasteBuyer(w, search.findPhoneFor(w.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveWasteBuyer body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        WasteBuyer w = repo.findByUserId(me.id()).orElseGet(WasteBuyer::new);
        w.setUserId(me.id());
        w.setName(body.name()); w.setCity(body.city()); w.setDistrict(body.district());
        w.setAbout(body.about() == null ? "" : body.about());
        w.setPriceTermo(body.priceTermo() == null ? 0 : body.priceTermo());
        w.setPricePvxOq(body.pricePvxOq() == null ? 0 : body.pricePvxOq());
        w.setPricePvxRangli(body.pricePvxRangli() == null ? 0 : body.pricePvxRangli());
        w.setPriceAlyumin(body.priceAlyumin() == null ? 0 : body.priceAlyumin());
        w.setPriceAlikabond(body.priceAlikabond() == null ? 0 : body.priceAlikabond());
        w.setLat(body.lat()); w.setLng(body.lng()); w.setTelegram(tg);
        WasteBuyer saved = repo.save(w);
        return mappers.wasteBuyer(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
