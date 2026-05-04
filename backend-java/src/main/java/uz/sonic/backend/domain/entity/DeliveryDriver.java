package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "delivery_drivers", indexes = {
        @Index(name = "idx_delivery_drivers_user_id", columnList = "user_id"),
        @Index(name = "idx_delivery_drivers_city", columnList = "city")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryDriver {
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

    @Column(name = "vehicle_model", nullable = false)
    private String vehicleModel;

    @Column(name = "is_custom_vehicle")
    private Integer isCustomVehicle = 0;

    @Column(name = "vehicle_image_url")
    private String vehicleImageUrl;

    @Column(columnDefinition = "TEXT")
    private String about = "";

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
