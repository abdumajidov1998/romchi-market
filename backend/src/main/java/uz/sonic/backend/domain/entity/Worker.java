package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workers", indexes = {
        @Index(name = "idx_workers_user_id", columnList = "user_id"),
        @Index(name = "idx_workers_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Worker {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specs;

    @Column(nullable = false)
    private String experience;

    @Column(columnDefinition = "TEXT")
    private String about = "";

    private Double rating = 0.0;

    @Column(name = "jobs_done")
    private Integer jobsDone = 0;

    private Integer verified = 0;

    private Integer top = 0;

    private Double lat;

    private Double lng;

    private String telegram;

    @Column(name = "salary_from")
    private Integer salaryFrom;

    @Column(name = "salary_to")
    private Integer salaryTo;

    @Column(name = "work_type")
    private String workType = "";

    @Column(name = "created_at")
    private Long createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = System.currentTimeMillis() / 1000;
    }
}
