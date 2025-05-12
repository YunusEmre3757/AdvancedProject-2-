package com.example.backend.service;

import com.example.backend.model.RefreshToken;
import com.example.backend.model.User;
import com.example.backend.repository.RefreshTokenRepository;
import com.example.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final Logger logger = LoggerFactory.getLogger(RefreshTokenService.class);

    @Value("${jwt.refresh.token.expiration}")
    private Long refreshTokenDurationMs;
    
    @Value("${refresh.token.max-usage:5}")
    private int maxRefreshTokenUsage;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            UserRepository userRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRepository = userRepository;
    }

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setUsageCount(0);
        refreshToken.setMaxUsageCount(maxRefreshTokenUsage);

        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.isExpired()) {
            refreshTokenRepository.delete(token);
            logger.warn("Refresh token expired for user: {}", token.getUser().getEmail());
            throw new RuntimeException("Refresh token was expired. Please make a new login.");
        }
        
        if (token.isMaxUsageReached()) {
            refreshTokenRepository.delete(token);
            logger.warn("Refresh token maximum usage count reached for user: {}", token.getUser().getEmail());
            throw new RuntimeException("Refresh token maximum usage count reached. Please login again.");
        }
        
        // Kullanım sayısını arttır
        token.incrementUsageCount();
        logger.info("Refresh token used for user: {}, current usage: {}/{}", 
                token.getUser().getEmail(), 
                token.getUsageCount(), 
                token.getMaxUsageCount());
                
        return refreshTokenRepository.save(token);
    }

    @Transactional
    public void deleteByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        refreshTokenRepository.deleteByUser(user);
    }

    @Transactional
    public void deleteToken(RefreshToken refreshToken) {
        refreshTokenRepository.delete(refreshToken);
        logger.info("Refresh token deleted as part of token rotation for user: {}", 
                refreshToken.getUser().getEmail());
    }
    
    @Transactional
    public void deleteByToken(String token) {
        refreshTokenRepository.findByToken(token)
            .ifPresent(refreshToken -> {
                refreshTokenRepository.delete(refreshToken);
                logger.info("Refresh token deleted by token value for user: {}", 
                    refreshToken.getUser().getEmail());
            });
    }

    @Transactional
    @Scheduled(cron = "0 0 * * * *") // Her saat başı çalışır
    public void cleanExpiredTokens() {
        logger.info("Cleaning expired refresh tokens");
        refreshTokenRepository.deleteAllExpiredTokens(Instant.now());
    }
} 