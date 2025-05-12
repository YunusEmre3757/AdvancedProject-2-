package com.example.backend.repository;

import com.example.backend.model.ReviewHelpful;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReviewHelpful entity için repository sınıfı.
 * Bu repository, kullanıcıların hangi yorumları yararlı bulduğunu takip etmek için kullanılır.
 */
@Repository
public interface ReviewHelpfulRepository extends JpaRepository<ReviewHelpful, Long> {
    
    /**
     * Belirli bir kullanıcının belirli bir yorumu yararlı olarak işaretleyip işaretlemediğini kontrol eder.
     * 
     * @param userId Kullanıcı ID
     * @param reviewId Yorum ID
     * @return Eğer kullanıcı yorumu yararlı olarak işaretlediyse true, aksi halde false
     */
    boolean existsByUserIdAndReviewId(Long userId, Long reviewId);
    
    /**
     * Belirli bir kullanıcının yararlı olarak işaretlediği tüm yorumları getirir.
     * 
     * @param userId Kullanıcı ID
     * @return Kullanıcının yararlı olarak işaretlediği yorumların listesi
     */
    List<ReviewHelpful> findByUserId(Long userId);
    
    /**
     * Belirli bir yorumu yararlı olarak işaretleyen tüm kullanıcıları getirir.
     * 
     * @param reviewId Yorum ID
     * @return Yorumu yararlı olarak işaretleyen kullanıcıların listesi
     */
    List<ReviewHelpful> findByReviewId(Long reviewId);
    
    /**
     * Belirli bir yorumu yararlı olarak işaretleyen kullanıcı sayısını sayar.
     * 
     * @param reviewId Yorum ID
     * @return Yorumu yararlı olarak işaretleyen kullanıcı sayısı
     */
    long countByReviewId(Long reviewId);
    
    /**
     * Belirli bir kullanıcının yararlı olarak işaretlediği yorumları siler.
     * 
     * @param userId Kullanıcı ID
     * @param reviewId Yorum ID
     * @return Silinen kayıt sayısı
     */
    void deleteByUserIdAndReviewId(Long userId, Long reviewId);
} 