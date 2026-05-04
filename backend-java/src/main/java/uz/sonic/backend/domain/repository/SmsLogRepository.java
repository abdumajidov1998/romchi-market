package uz.sonic.backend.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import uz.sonic.backend.domain.entity.SmsLog;

public interface SmsLogRepository extends JpaRepository<SmsLog, Long> {
    @Query("SELECT COUNT(s) FROM SmsLog s WHERE s.phone = :phone AND s.createdAt > :since")
    long countByPhoneSince(String phone, long since);

    @Query("SELECT COUNT(s) FROM SmsLog s WHERE s.ip = :ip AND s.createdAt > :since")
    long countByIpSince(String ip, long since);

    @Query("SELECT COUNT(s) FROM SmsLog s WHERE s.createdAt > :since")
    long countSince(long since);

    @Modifying
    @Transactional
    @Query("DELETE FROM SmsLog s WHERE s.createdAt < :before")
    int deleteOlderThan(long before);
}
