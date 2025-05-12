package com.example.backend.repository;

import com.example.backend.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    // Bir ürüne ait tüm yorumları getir (sayfalama ile)
    Page<Review> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);
    
    // Bir ürüne ait tüm yorumları getir (liste olarak)
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
    
    // Bir kullanıcının tüm yorumlarını getir
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    // Kullanıcının yorumlarını sayfalama ile getir
    Page<Review> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    // Belirli bir ürün için ortalama puanı hesapla
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = ?1")
    Double calculateAverageRatingForProduct(Long productId);
    
    // Bir ürün için yıldız sayısına göre yorum sayısını getir (1'den 5'e kadar)
    @Query("SELECT r.rating, COUNT(r.id) FROM Review r WHERE r.product.id = ?1 GROUP BY r.rating ORDER BY r.rating")
    List<Object[]> countReviewsByRatingForProduct(Long productId);
    
    // Belirli bir ürün için toplam yorum sayısını sayma
    long countByProductId(Long productId);
    
    // Belirli bir kullanıcının belirli bir ürün için yorum yapıp yapmadığını kontrol et
    boolean existsByUserIdAndProductId(Long userId, Long productId);
    
    // Belirli bir puan üzerindeki yorumları getir
    List<Review> findByProductIdAndRatingGreaterThanEqualOrderByCreatedAtDesc(Long productId, Integer rating);
    
    // Belirli bir puan altındaki yorumları getir
    List<Review> findByProductIdAndRatingLessThanEqualOrderByCreatedAtDesc(Long productId, Integer rating);
    
    // En yararlı veya en son yorumları getir
    Page<Review> findByProductIdOrderByHelpfulCountDescCreatedAtDesc(Long productId, Pageable pageable);
    
    // Kullanıcının ürünü satın alıp almadığını kontrol et
    @Query("SELECT COUNT(o) > 0 FROM Order o JOIN o.items oi WHERE o.user.id = ?1 AND oi.productId = ?2 AND (o.status = 'COMPLETED' OR o.status = 'DELIVERED')")
    boolean hasUserPurchasedProduct(Long userId, Long productId);
    
    // Belirli bir puana ait yorumları sayfalama ile getir
    Page<Review> findByProductIdAndRating(Long productId, Integer rating, Pageable pageable);
} 