package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "waste_buyers", indexes = {
        @Index(name = "idx_waste_buyers_user_id", columnList = "user_id"),
        @Index(name = "idx_waste_buyers_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WasteBuyer {
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

    @Column(name = "price_termo")
    private Integer priceTermo = 0;

    @Column(name = "price_pvx_oq")
    private Integer pricePvxOq = 0;

    @Column(name = "price_pvx_rangli")
    private Integer pricePvxRangli = 0;

    @Column(name = "price_alyumin")
    private Integer priceAlyumin = 0;

    @Column(name = "price_alikabond")
    private Integer priceAlikabond = 0;

    private Double rating = 0.0;

    private Integer verified = 0;

    private Integer top = 0;

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
