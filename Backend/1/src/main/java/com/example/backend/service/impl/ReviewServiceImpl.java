package com.example.backend.service.impl;

import com.example.backend.dto.review.ReviewRequest;
import com.example.backend.dto.review.ReviewResponse;
import com.example.backend.dto.review.ReviewSummary;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.model.Product;
import com.example.backend.model.Review;
import com.example.backend.model.ReviewHelpful;
import com.example.backend.model.User;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ReviewHelpfulRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ReviewHelpfulRepository reviewHelpfulRepository;

    @Override
    @Transactional
    public ReviewResponse addReview(Long userId, ReviewRequest reviewRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Product product = productRepository.findById(reviewRequest.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        // Kontrol: Kullanıcı daha önce bu ürün için yorum yapmış mı?
        boolean hasReviewed = reviewRepository.existsByUserIdAndProductId(userId, product.getId());
        if (hasReviewed) {
            throw new IllegalStateException("You have already reviewed this product");
        }
        
        // Kontrol: Kullanıcı bu ürünü satın almış mı?
        boolean hasPurchased = verifyPurchase(product.getId(), userId);
        if (!hasPurchased) {
            throw new UnauthorizedException("You can only review products you have purchased");
        }
        
        Review review = new Review();
        review.setProduct(product);
        review.setUser(user);
        review.setTitle(reviewRequest.getTitle());
        review.setComment(reviewRequest.getComment());
        review.setRating(reviewRequest.getRating());
        review.setVerifiedPurchase(true); // Satın alma doğrulandı
        review.setHelpfulCount(0);
        review.setCreatedAt(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());
        
        Review savedReview = reviewRepository.save(review);
        
        // Ürünün ortalama puanını ve değerlendirme sayısını güncelle
        updateProductRatingInfo(product.getId());
        
        return mapToResponse(savedReview);
    }

    @Override
    public Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable) {
        // Varolan metodu koruyoruz ve rating olmadan çağrı için kullanıyoruz
        return getProductReviews(productId, pageable, 0);
    }

    @Override
    public Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable, Integer rating) {
        // Ürünün varlığını kontrol et
        productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        Page<Review> reviewsPage;
        
        // Eğer rating 0 değilse (yani tümü değilse), belirli bir puanı filtrele
        if (rating != null && rating > 0) {
            // Repository'de yıldız bazlı filtreleme için özel bir metot kullanılabilir
            // Burada pageable kullanarak verileri sayfalı olarak döneceğiz
            reviewsPage = reviewRepository.findByProductIdAndRating(productId, rating, pageable);
        } else {
            // Tüm değerlendirmeler
            reviewsPage = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
        }
        
        List<ReviewResponse> reviewResponses = reviewsPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PageImpl<>(reviewResponses, pageable, reviewsPage.getTotalElements());
    }

    @Override
    public ReviewSummary getReviewSummary(Long productId) {
        // Ürünün varlığını kontrol et
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        // Ortalama puanı hesapla
        Double averageRating = reviewRepository.calculateAverageRatingForProduct(productId);
        if (averageRating == null) {
            averageRating = 0.0;
        }
        
        // Toplam yorum sayısını al
        long totalReviewCount = reviewRepository.countByProductId(productId);
        
        // Puan dağılımını hesapla
        List<Object[]> ratingDistributionData = reviewRepository.countReviewsByRatingForProduct(productId);
        Map<Integer, Integer> ratingDistribution = new HashMap<>();
        
        // Başlangıçta tüm puanlar için 0 değerini ata
        for (int i = 1; i <= 5; i++) {
            ratingDistribution.put(i, 0);
        }
        
        // Veritabanından gelen değerleri güncelle
        for (Object[] row : ratingDistributionData) {
            Integer rating = ((Number) row[0]).intValue();
            Integer count = ((Number) row[1]).intValue();
            ratingDistribution.put(rating, count);
        }
        
        // En yararlı veya en son yorumları getir (ilk 3)
        List<Review> featuredReviews = reviewRepository.findByProductIdOrderByHelpfulCountDescCreatedAtDesc(productId, Pageable.ofSize(3)).getContent();
        List<ReviewResponse> featuredReviewResponses = featuredReviews.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return ReviewSummary.builder()
                .productId(productId)
                .averageRating(averageRating)
                .totalReviewCount((int) totalReviewCount)
                .ratingDistribution(ratingDistribution)
                .featuredReviews(featuredReviewResponses)
                .build();
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        
        // Sadece kendi yorumunu silebilir veya admin
        if (!review.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own reviews");
        }
        
        Long productId = review.getProduct().getId();
        reviewRepository.delete(review);
        
        // Ürünün ortalama puanını ve değerlendirme sayısını güncelle
        updateProductRatingInfo(productId);
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(Long reviewId, Long userId, ReviewRequest reviewRequest) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        
        // Sadece kendi yorumunu güncelleyebilir
        if (!review.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only update your own reviews");
        }
        
        review.setTitle(reviewRequest.getTitle());
        review.setComment(reviewRequest.getComment());
        review.setRating(reviewRequest.getRating());
        review.setUpdatedAt(LocalDateTime.now());
        
        Review updatedReview = reviewRepository.save(review);
        
        // Ürünün ortalama puanını güncelle
        updateProductRatingInfo(review.getProduct().getId());
        
        return mapToResponse(updatedReview);
    }

    @Override
    @Transactional
    public void markReviewAsHelpful(Long reviewId, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Kendi yorumunu yararlı olarak işaretleyemez
        if (review.getUser().getId().equals(userId)) {
            throw new IllegalStateException("You cannot mark your own review as helpful");
        }
        
        // Kullanıcı zaten bu yorumu yararlı olarak işaretlemiş mi kontrol et
        boolean alreadyMarked = reviewHelpfulRepository.existsByUserIdAndReviewId(userId, reviewId);
        if (alreadyMarked) {
            throw new IllegalStateException("You have already marked this review as helpful");
        }
        
        // Yeni ReviewHelpful kaydı oluştur
        ReviewHelpful reviewHelpful = new ReviewHelpful();
        reviewHelpful.setUser(user);
        reviewHelpful.setReview(review);
        reviewHelpful.setCreatedAt(LocalDateTime.now());
        
        // Kaydı veritabanına ekle
        reviewHelpfulRepository.save(reviewHelpful);
        
        // Yorumun yararlı sayısını artır
        review.setHelpfulCount(review.getHelpfulCount() + 1);
        reviewRepository.save(review);
    }

    @Override
    @Transactional
    public void unmarkReviewAsHelpful(Long reviewId, Long userId) {
        // Yorumun var olduğunu kontrol et
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        
        // Kullanıcının var olduğunu kontrol et
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Kullanıcının bu yorumu yararlı olarak işaretlemiş olup olmadığını kontrol et
        boolean alreadyMarked = reviewHelpfulRepository.existsByUserIdAndReviewId(userId, reviewId);
        if (!alreadyMarked) {
            throw new IllegalStateException("You have not marked this review as helpful");
        }
        
        // ReviewHelpful kaydını sil
        reviewHelpfulRepository.deleteByUserIdAndReviewId(userId, reviewId);
        
        // Yorumun yararlı sayısını azalt (0'dan küçük olmamasını sağla)
        int currentHelpfulCount = review.getHelpfulCount();
        review.setHelpfulCount(Math.max(0, currentHelpfulCount - 1));
        reviewRepository.save(review);
    }

    @Override
    public boolean hasUserMarkedReviewAsHelpful(Long reviewId, Long userId) {
        return reviewHelpfulRepository.existsByUserIdAndReviewId(userId, reviewId);
    }

    @Override
    public List<Long> getUserHelpfulReviewIds(Long userId) {
        // Kullanıcının yararlı olarak işaretlediği tüm yorumları al
        return reviewHelpfulRepository.findByUserId(userId)
                .stream()
                .map(helpful -> helpful.getReview().getId())
                .collect(Collectors.toList());
    }

    @Override
    public ReviewResponse getReviewById(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        
        return mapToResponse(review);
    }

    @Override
    public Page<ReviewResponse> getUserReviews(Long userId, Pageable pageable) {
        // Kullanıcının varlığını kontrol et
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Page<Review> reviewsPage = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        
        List<ReviewResponse> reviewResponses = reviewsPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        
        return new PageImpl<>(reviewResponses, pageable, reviewsPage.getTotalElements());
    }
    
    // Helper method to map Review entity to ReviewResponse DTO
    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getName() + " " + review.getUser().getSurname())
                .userAvatar(null) // Kullanıcı avatar bilgisi henüz eklenmemiş
                .title(review.getTitle())
                .comment(review.getComment())
                .rating(review.getRating())
                .verifiedPurchase(review.isVerifiedPurchase())
                .helpfulCount(review.getHelpfulCount())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
    
    // Helper method to update product's rating information
    private void updateProductRatingInfo(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        Double averageRating = reviewRepository.calculateAverageRatingForProduct(productId);
        if (averageRating == null) {
            averageRating = 0.0;
        }
        
        long reviewCount = reviewRepository.countByProductId(productId);
        
        product.setRating(averageRating.floatValue());
        product.setReviewCount((int) reviewCount);
        
        productRepository.save(product);
    }

    @Override
    public boolean verifyPurchase(Long productId, Long userId) {
        // Kullanıcının ve ürünün varlığını kontrol et
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        // Kullanıcının bu ürünü satın alıp almadığını kontrol et
        return reviewRepository.hasUserPurchasedProduct(userId, productId);
    }
} 