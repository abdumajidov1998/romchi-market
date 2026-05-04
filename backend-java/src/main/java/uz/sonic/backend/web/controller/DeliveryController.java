package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.sonic.backend.domain.entity.DeliveryDriver;
import uz.sonic.backend.domain.repository.DeliveryDriverRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.storage.FileStorage;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    private final DeliveryDriverRepository repo;
    private final Mappers mappers;
    private final ListingSearch search;
    private final FileStorage storage;

    public DeliveryController(DeliveryDriverRepository repo, Mappers mappers,
                              ListingSearch search, FileStorage storage) {
        this.repo = repo;
        this.mappers = mappers;
        this.search = search;
        this.storage = storage;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(DeliveryDriver.class, "DeliveryDriver",
                "e.verified DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "vehicleModel", spec == null ? "" : spec,
                        "qNameOrAbout", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::delivery);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        DeliveryDriver d = repo.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.delivery(d, search.findPhoneFor(d.getUserId()));
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @Transactional
    public Map<String, Object> save(
            @RequestParam("name") String name,
            @RequestParam("city") String city,
            @RequestParam("district") String district,
            @RequestParam("vehicleModel") String vehicleModel,
            @RequestParam(value = "isCustomVehicle", required = false) String isCustom,
            @RequestParam(value = "about", required = false) String about,
            @RequestParam(value = "telegram", required = false) String telegram,
            @RequestParam(value = "lat", required = false) String lat,
            @RequestParam(value = "lng", required = false) String lng,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (name == null || city == null || district == null || vehicleModel == null) {
            throw ApiException.badRequest("Missing fields");
        }
        boolean isCustomBool = "true".equalsIgnoreCase(isCustom) || "1".equals(isCustom);
        String tg = telegram == null ? null : telegram.replaceFirst("^@", "").trim();
        Double latD = parseD(lat); Double lngD = parseD(lng);

        Optional<DeliveryDriver> existing = repo.findByUserId(me.id());
        DeliveryDriver d = existing.orElseGet(DeliveryDriver::new);

        String newImage = null;
        if (image != null && !image.isEmpty()) {
            newImage = storage.saveImage(image);
        } else if (existing.isPresent()) {
            newImage = existing.get().getVehicleImageUrl();
        }
        // if not a custom vehicle and no upload, drop any saved image
        if (!isCustomBool && (image == null || image.isEmpty())) {
            newImage = null;
        }
        if (existing.isPresent()) {
            String oldUrl = existing.get().getVehicleImageUrl();
            boolean oldCustom = existing.get().getIsCustomVehicle() != null && existing.get().getIsCustomVehicle() != 0;
            if (oldCustom && oldUrl != null && !oldUrl.equals(newImage)) {
                storage.deleteIfManaged(oldUrl);
            }
        }

        d.setUserId(me.id());
        d.setName(name); d.setCity(city); d.setDistrict(district);
        d.setVehicleModel(vehicleModel);
        d.setIsCustomVehicle(isCustomBool ? 1 : 0);
        d.setVehicleImageUrl(newImage);
        d.setAbout(about == null ? "" : about);
        d.setLat(latD); d.setLng(lngD); d.setTelegram(tg);
        DeliveryDriver saved = repo.save(d);
        return mappers.delivery(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        repo.findByUserId(me.id()).ifPresent(d -> {
            if (d.getIsCustomVehicle() != null && d.getIsCustomVehicle() != 0) {
                storage.deleteIfManaged(d.getVehicleImageUrl());
            }
        });
        repo.deleteByUserId(me.id());
        return Map.of("ok", true);
    }

    private static Double parseD(String v) {
        if (v == null || v.isBlank()) return null;
        try { return Double.parseDouble(v); } catch (NumberFormatException e) { return null; }
    }
}
