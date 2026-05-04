package uz.sonic.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sms_codes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmsCode {
    @Id
    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private Long expiresAt;

    @Column(nullable = false)
    private Integer attempts = 0;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;
}
