package com.example.backend.controller;

import com.example.backend.dto.review.ReviewRequest;
import com.example.backend.dto.review.ReviewResponse;
import com.example.backend.dto.review.ReviewSummary;
import com.example.backend.security.CurrentUser;
import com.example.backend.security.UserPrincipal;
import com.example.backend.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    
    @GetMapping("/products/{productId}")
    public ResponseEntity<Page<ReviewResponse>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false, defaultValue = "0") Integer rating,
            @CurrentUser UserPrincipal currentUser) {
        
        Sort sort = sortDir.equalsIgnoreCase("asc") ? 
                Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<ReviewResponse> reviews = reviewService.getProductReviews(productId, pageable, rating);
        
        // Eğer kullanıcı giriş yapmışsa, her yorum için kullanıcının işaretlediği durumu kontrol et
        if (currentUser != null) {
            Long userId = currentUser.getId();
            
            // Kullanıcının işaretlediği tüm yorum id'lerini al
            List<Long> markedReviewIds = reviewService.getUserHelpfulReviewIds(userId);
            
            // Her yorumun işaretlenme durumunu güncelle
            reviews.getContent().forEach(review -> {
                boolean isMarked = markedReviewIds.contains(review.getId());
                review.setIsMarkedHelpful(isMarked);
            });
        } else {
            // Giriş yapmamış kullanıcılar için tüm yorumlar işaretlenmemiş olarak ayarlanır
            reviews.getContent().forEach(review -> review.setIsMarkedHelpful(false));
        }
        
        return ResponseEntity.ok(reviews);
    }
    
    @GetMapping("/products/{productId}/summary")
    public ResponseEntity<ReviewSummary> getReviewSummary(@PathVariable Long productId) {
        ReviewSummary summary = reviewService.getReviewSummary(productId);
        return ResponseEntity.ok(summary);
    }
    
    @GetMapping("/products/{productId}/verify-purchase")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Boolean> verifyPurchase(
            @PathVariable Long productId,
            @CurrentUser UserPrincipal currentUser) {
        boolean hasPurchased = reviewService.verifyPurchase(productId, currentUser.getId());
        return ResponseEntity.ok(hasPurchased);
    }
    
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> addReview(
            @CurrentUser UserPrincipal currentUser,
            @Valid @RequestBody ReviewRequest reviewRequest) {
        
        // Check if user has purchased the product
        boolean hasPurchased = reviewService.verifyPurchase(reviewRequest.getProductId(), currentUser.getId());
        if (!hasPurchased) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        }
        
        ReviewResponse newReview = reviewService.addReview(currentUser.getId(), reviewRequest);
        return new ResponseEntity<>(newReview, HttpStatus.CREATED);
    }
    
    @PutMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @CurrentUser UserPrincipal currentUser,
            @Valid @RequestBody ReviewRequest reviewRequest) {
        
        ReviewResponse updatedReview = reviewService.updateReview(reviewId, currentUser.getId(), reviewRequest);
        return ResponseEntity.ok(updatedReview);
    }
    
    @DeleteMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId,
            @CurrentUser UserPrincipal currentUser) {
        
        reviewService.deleteReview(reviewId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{reviewId}/helpful")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsHelpful(
            @PathVariable Long reviewId,
            @CurrentUser UserPrincipal currentUser) {
        
        try {
            // Kullanıcı bu yorumu daha önce yararlı olarak işaretlemiş mi kontrol et
            boolean alreadyMarked = reviewService.hasUserMarkedReviewAsHelpful(reviewId, currentUser.getId());
            if (alreadyMarked) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .header("X-Error-Message", "You have already marked this review as helpful")
                        .build();
            }
            
            reviewService.markReviewAsHelpful(reviewId, currentUser.getId());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            // Kendi yorumunu beğenmeye çalışıyor
            if (e.getMessage().contains("You cannot mark your own review as helpful")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .header("X-Error-Message", "You cannot mark your own review as helpful")
                        .build();
            }
            // Diğer IllegalStateException hataları için
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/{reviewId}/helpful")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> unmarkAsHelpful(
            @PathVariable Long reviewId,
            @CurrentUser UserPrincipal currentUser) {
        
        try {
            // Kullanıcı bu yorumu yararlı olarak işaretlemiş mi kontrol et
            boolean hasMarked = reviewService.hasUserMarkedReviewAsHelpful(reviewId, currentUser.getId());
            if (!hasMarked) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .header("X-Error-Message", "You have not marked this review as helpful")
                        .build();
            }
            
            reviewService.unmarkReviewAsHelpful(reviewId, currentUser.getId());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .header("X-Error-Message", e.getMessage())
                    .build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/helpful")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Long>> getHelpfulReviews(@CurrentUser UserPrincipal currentUser) {
        List<Long> helpfulReviewIds = reviewService.getUserHelpfulReviewIds(currentUser.getId());
        return ResponseEntity.ok(helpfulReviewIds);
    }
    
    @GetMapping("/{reviewId}/is-marked-helpful")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Boolean> isMarkedAsHelpful(
            @PathVariable Long reviewId,
            @CurrentUser UserPrincipal currentUser) {
        
        boolean isMarked = reviewService.hasUserMarkedReviewAsHelpful(reviewId, currentUser.getId());
        return ResponseEntity.ok(isMarked);
    }
    
    @GetMapping("/users/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ReviewResponse>> getMyReviews(
            @CurrentUser UserPrincipal currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewResponse> reviews = reviewService.getUserReviews(currentUser.getId(), pageable);
        return ResponseEntity.ok(reviews);
    }
    
    @GetMapping("/{reviewId}")
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable Long reviewId) {
        ReviewResponse review = reviewService.getReviewById(reviewId);
        return ResponseEntity.ok(review);
    }
} 