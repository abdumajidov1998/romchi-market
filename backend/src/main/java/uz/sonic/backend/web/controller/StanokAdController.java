package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.sonic.backend.domain.entity.StanokAd;
import uz.sonic.backend.domain.repository.StanokAdRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.storage.FileStorage;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
public class StanokAdController {

    private final StanokAdRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;
    private final FileStorage storage;

    public StanokAdController(StanokAdRepository repo, Mappers mappers,
                              ListingSearch search, FileStorage storage) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
        this.storage = storage;
    }

    @GetMapping("/api/stanok-ads")
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String condition,
                                          @RequestParam(required = false) String type,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(StanokAd.class, "StanokAd",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "condition", condition == null ? "" : condition,
                        "stanokType", type == null ? "" : type,
                        "qTitleOrDescription", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::stanokAd);
    }

    @GetMapping("/api/stanok-ads/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        StanokAd a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.stanokAd(a, search.findPhoneFor(a.getUserId()));
    }

    @PostMapping(value = "/api/stanok-ads", consumes = {"multipart/form-data"})
    @Transactional
    public Map<String, Object> create(
            @RequestParam("title") String title,
            @RequestParam("condition") String condition,
            @RequestParam("description") String description,
            @RequestParam("city") String city,
            @RequestParam("district") String district,
            @RequestParam(value = "stanokType", required = false) String stanokType,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "telegram", required = false) String telegram,
            @RequestParam(value = "lat", required = false) String lat,
            @RequestParam(value = "lng", required = false) String lng,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        StanokAd a = StanokAd.builder()
                .userId(me.id())
                .title(title).condition(condition).description(description)
                .city(city).district(district)
                .stanokType((stanokType == null || stanokType.isBlank()) ? null : stanokType)
                .price(parseI(price, 0))
                .telegram(telegram == null ? null : telegram.replaceFirst("^@", "").trim())
                .lat(parseD(lat)).lng(parseD(lng))
                .imageUrl(image == null || image.isEmpty() ? null : storage.saveImage(image))
                .build();
        return mappers.stanokAd(repo.save(a), search.findPhoneFor(me.id()));
    }

    @PatchMapping(value = "/api/stanok-ads/{id}", consumes = {"multipart/form-data"})
    @Transactional
    public Map<String, Object> patch(
            @PathVariable Long id,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "condition", required = false) String condition,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "stanokType", required = false) String stanokType,
            @RequestParam(value = "price", required = false) String price,
            @RequestParam(value = "telegram", required = false) String telegram,
            @RequestParam(value = "lat", required = false) String lat,
            @RequestParam(value = "lng", required = false) String lng,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        StanokAd a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        if (a.getUserId() == null || !a.getUserId().equals(me.id())) {
            throw ApiException.forbidden("Not your ad");
        }
        if (title != null) a.setTitle(title);
        if (condition != null) a.setCondition(condition);
        if (description != null) a.setDescription(description);
        if (city != null) a.setCity(city);
        if (district != null) a.setDistrict(district);
        if (stanokType != null) a.setStanokType(stanokType.isBlank() ? null : stanokType);
        if (price != null) a.setPrice(parseI(price, a.getPrice()));
        if (telegram != null) a.setTelegram(telegram.replaceFirst("^@", "").trim());
        if (lat != null) a.setLat(parseD(lat));
        if (lng != null) a.setLng(parseD(lng));
        if (image != null && !image.isEmpty()) {
            storage.deleteIfManaged(a.getImageUrl());
            a.setImageUrl(storage.saveImage(image));
        }
        return mappers.stanokAd(repo.save(a), search.findPhoneFor(a.getUserId()));
    }

    @DeleteMapping("/api/stanok-ads/{id}")
    @Transactional
    public Map<String, Object> delete(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        StanokAd a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        if (a.getUserId() == null || !a.getUserId().equals(me.id())) {
            throw ApiException.forbidden("Not your ad");
        }
        storage.deleteIfManaged(a.getImageUrl());
        repo.deleteById(id);
        return Map.of("ok", true);
    }

    @GetMapping("/api/me/stanok-ads")
    public List<Map<String, Object>> mine(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        return repo.findAllByUserIdOrderByIdDesc(me.id()).stream()
                .map(a -> mappers.stanokAd(a, null))
                .toList();
    }

    private static Double parseD(String v) {
        if (v == null || v.isBlank()) return null;
        try { return Double.parseDouble(v); } catch (NumberFormatException e) { return null; }
    }

    private static Integer parseI(String v, Integer def) {
        if (v == null || v.isBlank()) return def;
        try { return Integer.parseInt(v); } catch (NumberFormatException e) { return def; }
    }
}
