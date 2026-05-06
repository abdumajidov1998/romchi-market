package uz.sonic.backend.domain.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.sonic.backend.domain.entity.Job;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findAllByUserIdOrderByIdDesc(Long userId);
}
