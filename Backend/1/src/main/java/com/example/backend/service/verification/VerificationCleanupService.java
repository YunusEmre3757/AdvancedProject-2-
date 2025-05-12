package com.example.backend.service.verification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.repository.PendingUserRepository;

import java.time.LocalDateTime;

@Service
@Slf4j
public class VerificationCleanupService {

    private final PendingUserRepository pendingUserRepository;

    public VerificationCleanupService(PendingUserRepository pendingUserRepository) {
        this.pendingUserRepository = pendingUserRepository;
    }

    @Transactional
    @Scheduled(cron = "0 0 1 * * ?") // Her gün saat 01:00'de çalıştır
    public void cleanupExpiredVerifications() {
        log.info("Cleaning up expired verification records...");
        LocalDateTime now = LocalDateTime.now();
        
        try {
            int count = pendingUserRepository.findByExpiresAtBefore(now).size();
            pendingUserRepository.deleteByExpiresAtBefore(now);
            log.info("Cleaned up {} expired verification records", count);
        } catch (Exception e) {
            log.error("Error cleaning up expired verifications: {}", e.getMessage(), e);
        }
    }
} 