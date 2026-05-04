package uz.sonic.backend.web.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import uz.sonic.backend.domain.entity.Job;
import uz.sonic.backend.domain.repository.JobRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobRepository jobs;
    private final Mappers mappers;
    private final ListingSearch search;

    public JobController(JobRepository jobs, Mappers mappers, ListingSearch search) {
        this.jobs = jobs;
        this.mappers = mappers;
        this.search = search;
    }

    public record PostJob(String title, String company, String type, String workType,
                          String city, String district, String experience,
                          Integer salaryFrom, Integer salaryTo, List<String> specs,
                          String description, String badge, Double lat, Double lng) {}

    public record PatchJob(String title, String company, String type, String workType,
                           String city, String district, String experience,
                           Integer salaryFrom, Integer salaryTo, List<String> specs,
                           String description, String badge) {}

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String city,
                                          @RequestParam(required = false) String spec,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(required = false) String limit,
                                          @RequestParam(required = false) String offset) {
        return search.findWithPhone(Job.class, "Job", "e.id DESC",
                Map.of("city", city == null ? "" : city,
                        "specsLike", spec == null ? "" : spec,
                        "qTitleOrCompany", q == null ? "" : q),
                ListingSearch.parseLimit(limit, 50, 200), ListingSearch.parseOffset(offset),
                mappers::job);
    }

    @GetMapping("/{id}")
    public Map<String, Object> byId(@PathVariable Long id) {
        Job j = jobs.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        return mappers.job(j, search.findPhoneFor(j.getUserId()));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> create(@RequestBody PostJob body, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        if (body == null || body.title() == null || body.company() == null
                || body.city() == null || body.district() == null
                || body.salaryFrom() == null || body.salaryTo() == null
                || body.specs() == null) {
            throw ApiException.badRequest("Missing fields");
        }
        Job j = Job.builder()
                .userId(me.id())
                .title(body.title()).company(body.company())
                .type(body.type() == null ? "Factory" : body.type())
                .workType(body.workType() == null ? "Full-time" : body.workType())
                .city(body.city()).district(body.district())
                .experience(body.experience() == null ? "" : body.experience())
                .salaryFrom(body.salaryFrom()).salaryTo(body.salaryTo())
                .specs(mappers.writeSpecs(body.specs()))
                .description(body.description() == null ? "" : body.description())
                .badge(body.badge())
                .lat(body.lat()).lng(body.lng())
                .build();
        return mappers.job(jobs.save(j), search.findPhoneFor(me.id()));
    }

    @PatchMapping("/{id}")
    @Transactional
    public Map<String, Object> patch(@PathVariable Long id, @RequestBody PatchJob body,
                                     @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        Job j = jobs.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        if (j.getUserId() == null || !j.getUserId().equals(me.id())) {
            throw ApiException.forbidden("Not your job");
        }
        if (body.title() != null) j.setTitle(body.title());
        if (body.company() != null) j.setCompany(body.company());
        if (body.type() != null) j.setType(body.type());
        if (body.workType() != null) j.setWorkType(body.workType());
        if (body.city() != null) j.setCity(body.city());
        if (body.district() != null) j.setDistrict(body.district());
        if (body.experience() != null) j.setExperience(body.experience());
        if (body.salaryFrom() != null) j.setSalaryFrom(body.salaryFrom());
        if (body.salaryTo() != null) j.setSalaryTo(body.salaryTo());
        if (body.description() != null) j.setDescription(body.description());
        if (body.badge() != null) j.setBadge(body.badge());
        if (body.specs() != null) j.setSpecs(mappers.writeSpecs(body.specs()));
        return mappers.job(jobs.save(j), search.findPhoneFor(j.getUserId()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Map<String, Object> delete(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        Job j = jobs.findById(id).orElseThrow(() -> ApiException.notFound("Not found"));
        if (j.getUserId() == null || !j.getUserId().equals(me.id())) {
            throw ApiException.forbidden("Not your job");
        }
        jobs.deleteById(id);
        return Map.of("ok", true);
    }
}
