package com.example.backend.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long productId;
    private Long userId;
    private String userName;
    private String userAvatar;
    private String title;
    private String comment;
    private Integer rating;
    private boolean verifiedPurchase;
    private Integer helpfulCount;
    
    // Mevcut kullanıcının bu yorumu yardımcı olarak işaretleyip işaretlemediği
    // Not: Bu değer controller seviyesinde, kullanıcının kimliğine göre doldurulur
    private Boolean isMarkedHelpful;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 