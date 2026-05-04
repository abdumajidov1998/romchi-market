package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.StanokAd;

import java.util.List;

public interface StanokAdRepository extends JpaRepository<StanokAd, Long> {
    List<StanokAd> findAllByUserIdOrderByIdDesc(Long userId);
}
