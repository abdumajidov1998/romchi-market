package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stanok_ads", indexes = {
        @Index(name = "idx_stanok_ads_user_id", columnList = "user_id"),
        @Index(name = "idx_stanok_ads_city", columnList = "city"),
        @Index(name = "idx_stanok_ads_condition", columnList = "condition_")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StanokAd {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(name = "stanok_type")
    private String stanokType;

    // `condition` is a reserved word in some dialects — quote via underscored col.
    @Column(name = "condition_", nullable = false)
    private String condition;

    @Column(nullable = false)
    private Integer price = 0;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String district;

    private Double lat;

    private Double lng;

    private String telegram;

    private Integer verified = 0;

    @Column(name = "created_at")
    private Long createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = System.currentTimeMillis() / 1000;
    }
}
