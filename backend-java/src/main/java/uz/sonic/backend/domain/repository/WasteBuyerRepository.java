package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.WasteBuyer;

import java.util.Optional;

public interface WasteBuyerRepository extends JpaRepository<WasteBuyer, Long> {
    Optional<WasteBuyer> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
