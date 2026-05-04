package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "jobs", indexes = {
        @Index(name = "idx_jobs_user_id", columnList = "user_id"),
        @Index(name = "idx_jobs_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String type;

    @Column(name = "work_type", nullable = false)
    private String workType;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false)
    private String experience;

    @Column(name = "salary_from", nullable = false)
    private Integer salaryFrom;

    @Column(name = "salary_to", nullable = false)
    private Integer salaryTo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specs;

    @Column(columnDefinition = "TEXT")
    private String description = "";

    private String badge;

    private Double lat;

    private Double lng;

    @Column(name = "created_at")
    private Long createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = System.currentTimeMillis() / 1000;
    }
}
