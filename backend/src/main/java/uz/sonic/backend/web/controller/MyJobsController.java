package uz.sonic.backend.web.controller;

import java.util.List;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import uz.sonic.backend.domain.repository.JobRepository;
import uz.sonic.backend.security.AppPrincipal;
import uz.sonic.backend.web.error.ApiException;
import uz.sonic.backend.web.mapper.Mappers;

/**
 * JobController is class-mapped to `/api/jobs`, which makes it inconvenient
 * to host the `/api/me/jobs` lookup the profile page needs. Lives in its own
 * file to mirror the StanokAdController pattern (which also exposes
 * `/api/me/stanok-ads` from a controller without a class-level prefix).
 */
@RestController
public class MyJobsController {

    private final JobRepository jobs;
    private final Mappers mappers;

    public MyJobsController(JobRepository jobs, Mappers mappers) {
        this.jobs = jobs;
        this.mappers = mappers;
    }

    @GetMapping("/api/me/jobs")
    public List<Map<String, Object>> mine(@AuthenticationPrincipal AppPrincipal me) {
        if (me == null) throw ApiException.unauthorized("No token");
        return jobs.findAllByUserIdOrderByIdDesc(me.id()).stream()
                .map(j -> mappers.job(j, null))
                .toList();
    }
}
