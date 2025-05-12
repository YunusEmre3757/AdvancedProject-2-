package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private int usageCount = 0;

    @Column(nullable = false)
    private int maxUsageCount = 5; // Varsayılan olarak 5 kez kullanılabilir

    public boolean isExpired() {
        return Instant.now().isAfter(expiryDate);
    }

    public boolean isMaxUsageReached() {
        return usageCount >= maxUsageCount;
    }

    public void incrementUsageCount() {
        this.usageCount++;
    }
} 