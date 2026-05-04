package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.InstallBrigade;

import java.util.Optional;

public interface InstallBrigadeRepository extends JpaRepository<InstallBrigade, Long> {
    Optional<InstallBrigade> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
