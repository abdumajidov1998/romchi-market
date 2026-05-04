package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.Worker;
import uz.sonic.backend.domain.repository.WorkerRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workers")
public class WorkerController {

    private final WorkerRepository workers;
    private final Mappers mappers;
    private final ListingSearch search;

    public WorkerController(WorkerRepository workers, Mappers mappers, ListingSearch search) {
        this.workers = workers;
        this.mappers = mappers;
        this.search = search;
    }

    public record SaveWorker(String name, String city, String district, List<String> specs,
                             String experience, String about, Double lat, Double lng, String telegram,
                             Integer salaryFrom, Integer salaryTo, String workType) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(Worker.class, "Worker",
                "e.top DESC, e.rating DESC, e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qNameOrAbout", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::worker);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        Worker w = workers.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.worker(w, search.findPhoneFor(w.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody SaveWorker body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.name() == null || body.city() == null || body.district() == null
                || body.specs() == null || body.experience() == null) {
            throw ApiException.badRequest("Missing fields");
        }
        String tg = body.telegram() == null ? null : body.telegram().replaceFirst("^@", "").trim();
        Worker w = workers.findByUserId(me.id()).orElseGet(Worker::new);
        w.setUserId(me.id());
        w.setName(body.name());
        w.setCity(body.city());
        w.setDistrict(body.district());
        w.setSpecs(mappers.writeSpecs(body.specs()));
        w.setExperience(body.experience());
        w.setAbout(body.about() == null ? "" : body.about());
        w.setLat(body.lat()); w.setLng(body.lng()); w.setTelegram(tg);
        w.setSalaryFrom(body.salaryFrom()); w.setSalaryTo(body.salaryTo());
        w.setWorkType(body.workType() == null ? "" : body.workType());
        Worker saved = workers.save(w);
        return mappers.worker(saved, search.findPhoneFor(saved.getUserId()));
    }

    @DeleteMapping
    @Transactional
    public Map<String, Object> delete(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        workers.deleteByUserId(me.id());
        return Map.of("ok", true);
    }
}
