package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import uz.sonic.backend.domain.entity.SmsCode;

public interface SmsCodeRepository extends JpaRepository<SmsCode, String> {
    @Modifying
    @Transactional
    @Query("DELETE FROM SmsCode s WHERE s.expiresAt < :now")
    int deleteExpired(long now);

    @Modifying
    @Transactional
    @Query("UPDATE SmsCode s SET s.attempts = s.attempts + 1 WHERE s.phone = :phone")
    int bumpAttempts(String phone);
}
