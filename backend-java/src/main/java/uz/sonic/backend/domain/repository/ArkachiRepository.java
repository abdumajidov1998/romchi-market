package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.Arkachi;

import java.util.Optional;

public interface ArkachiRepository extends JpaRepository<Arkachi, Long> {
    Optional<Arkachi> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
