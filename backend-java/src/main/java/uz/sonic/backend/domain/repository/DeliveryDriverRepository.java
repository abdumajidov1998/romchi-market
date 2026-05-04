package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.DeliveryDriver;

import java.util.Optional;

public interface DeliveryDriverRepository extends JpaRepository<DeliveryDriver, Long> {
    Optional<DeliveryDriver> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
