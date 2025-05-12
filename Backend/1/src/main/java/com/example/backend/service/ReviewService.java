package com.example.backend.service;

import com.example.backend.dto.review.ReviewRequest;
import com.example.backend.dto.review.ReviewResponse;
import com.example.backend.dto.review.ReviewSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ReviewService {
    // Bir ürüne yeni yorum ekle
    ReviewResponse addReview(Long userId, ReviewRequest reviewRequest);
    
    // Belirli bir ürüne ait tüm yorumları getir (sayfalama ile)
    Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable);
    
    // Belirli bir ürüne ait tüm yorumları getir (sayfalama ve filtreleme ile)
    Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable, Integer rating);
    
    // Bir ürün için yorum özeti getir (ortalama puan, toplam yorum sayısı vb.)
    ReviewSummary getReviewSummary(Long productId);
    
    // Bir yorumu sil
    void deleteReview(Long reviewId, Long userId);
    
    // Bir yorumu güncelle
    ReviewResponse updateReview(Long reviewId, Long userId, ReviewRequest reviewRequest);
    
    // Bir yorumu yararlı olarak işaretle
    void markReviewAsHelpful(Long reviewId, Long userId);
    
    // Bir yorum için "yararlı işaretlemesini" kaldır
    void unmarkReviewAsHelpful(Long reviewId, Long userId);
    
    // Kullanıcının yorumu yararlı olarak işaretleyip işaretlemediğini kontrol et
    boolean hasUserMarkedReviewAsHelpful(Long reviewId, Long userId);
    
    // Kullanıcının yararlı olarak işaretlediği tüm yorum ID'lerini getir
    List<Long> getUserHelpfulReviewIds(Long userId);
    
    // Belirli bir yorum detayını getir
    ReviewResponse getReviewById(Long reviewId);
    
    // Bir kullanıcının tüm yorumlarını getir
    Page<ReviewResponse> getUserReviews(Long userId, Pageable pageable);
    
    // Kullanıcının ürünü satın alıp almadığını kontrol et
    boolean verifyPurchase(Long productId, Long userId);
} 