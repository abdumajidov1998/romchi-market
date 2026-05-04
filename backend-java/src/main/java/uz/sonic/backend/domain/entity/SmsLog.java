package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sms_log", indexes = {
        @Index(name = "idx_sms_log_phone_created", columnList = "phone,created_at"),
        @Index(name = "idx_sms_log_ip_created", columnList = "ip,created_at"),
        @Index(name = "idx_sms_log_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmsLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String phone;

    @Column
    private String ip = "";

    @Column(name = "created_at", nullable = false)
    private Long createdAt;
}
