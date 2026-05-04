package uz.sonic.backend.domain.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import uz.sonic.backend.domain.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);

    @Query("SELECT u FROM User u WHERE LOWER(u.phone) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY u.id DESC")
    List<User> searchByPhone(String q, Pageable pageable);

    @Query("SELECT u FROM User u ORDER BY u.id DESC")
    List<User> findAllOrdered(Pageable pageable);
}
