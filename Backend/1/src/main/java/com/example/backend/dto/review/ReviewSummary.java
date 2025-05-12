package com.example.backend.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSummary {
    private Long productId;
    private Double averageRating;
    private Integer totalReviewCount;
    private Map<Integer, Integer> ratingDistribution; // Key: Yıldız sayısı (1-5), Value: Yorum sayısı
    private List<ReviewResponse> featuredReviews; // En yararlı veya en son yorumlar
} 