package com.example.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Value("${rate-limit.rules./api/auth/refresh-token.max-attempts:5}")
    private int refreshTokenMaxAttempts;

    @Value("${rate-limit.rules./api/auth/refresh-token.window-in-seconds:120}")
    private int refreshTokenWindowSeconds;

    // IP adresi -> {Son istek zamanı, İstek sayısı}
    private final Map<String, TokenBucket> refreshTokenBuckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getServletPath();
        String ipAddress = getClientIp(request);

        // Refresh token endpoint'i için rate limiting uygula
        if (path.equals("/api/auth/refresh-token")) {
            return checkRateLimit(ipAddress, response);
        }

        return true;
    }

    private boolean checkRateLimit(String key, HttpServletResponse response) throws Exception {
        long now = System.currentTimeMillis() / 1000; // Şu anki zaman (saniye)
        TokenBucket bucket = refreshTokenBuckets.computeIfAbsent(key, k -> new TokenBucket(now));

        // Pencere süresi geçtiyse, bucket'ı sıfırla
        if (now - bucket.getLastRequestTime() > refreshTokenWindowSeconds) {
            bucket.reset(now);
        }

        // İstek sayısını kontrol et
        if (bucket.getRequestCount() >= refreshTokenMaxAttempts) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many refresh token requests. Please try again later.\"}");
            return false;
        }

        // İstek sayısını arttır
        bucket.incrementRequestCount(now);
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    // TokenBucket sınıfı - Rate limiting için
    private static class TokenBucket {
        private long lastRequestTime;
        private int requestCount;

        public TokenBucket(long initialTime) {
            this.lastRequestTime = initialTime;
            this.requestCount = 0;
        }

        public long getLastRequestTime() {
            return lastRequestTime;
        }

        public int getRequestCount() {
            return requestCount;
        }

        public void incrementRequestCount(long currentTime) {
            this.requestCount++;
            this.lastRequestTime = currentTime;
        }

        public void reset(long currentTime) {
            this.requestCount = 0;
            this.lastRequestTime = currentTime;
        }
    }
} 