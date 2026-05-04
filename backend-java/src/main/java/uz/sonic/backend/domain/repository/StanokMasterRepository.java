package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.StanokMaster;

import java.util.Optional;

public interface StanokMasterRepository extends JpaRepository<StanokMaster, Long> {
    Optional<StanokMaster> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
