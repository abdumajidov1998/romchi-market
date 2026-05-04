package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "arkachilar", indexes = {
        @Index(name = "idx_arkachilar_user_id", columnList = "user_id"),
        @Index(name = "idx_arkachilar_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Arkachi {
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

    private String experience = "";

    @Column(name = "price_termo")
    private Integer priceTermo = 0;

    @Column(name = "price_pvx")
    private Integer pricePvx = 0;

    @Column(name = "price_alyumin")
    private Integer priceAlyumin = 0;

    @Column(name = "price_jp_fasad")
    private Integer priceJpFasad = 0;

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
