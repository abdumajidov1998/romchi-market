package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stanok_masters", indexes = {
        @Index(name = "idx_stanok_masters_user_id", columnList = "user_id"),
        @Index(name = "idx_stanok_masters_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StanokMaster {
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

    @Column(columnDefinition = "TEXT")
    private String about = "";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specs = "[]";

    @Column(name = "price_diagnostika")
    private Integer priceDiagnostika = 0;

    @Column(name = "price_charxlash")
    private Integer priceCharxlash = 0;

    private Integer urgent = 0;

    private String experience = "";

    private Integer verified = 0;

    private Double lat;

    private Double lng;

    private String telegram;

    @Column(name = "created_at")
    private Long createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = System.currentTimeMillis() / 1000;
    }
}
