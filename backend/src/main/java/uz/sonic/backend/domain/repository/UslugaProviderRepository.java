package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.UslugaProvider;

import java.util.Optional;

public interface UslugaProviderRepository extends JpaRepository<UslugaProvider, Long> {
    Optional<UslugaProvider> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
