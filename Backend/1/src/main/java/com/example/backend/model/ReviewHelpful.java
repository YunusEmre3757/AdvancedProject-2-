package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Kullanıcıların yorumları yararlı olarak işaretlemesini takip eden entity.
 * Bu sınıf, bir kullanıcının hangi yorumları yararlı olarak işaretlediğini takip eder.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "review_helpful", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"user_id", "review_id"})
       })
public class ReviewHelpful {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @PreRemove
    protected void preRemove() {
        // İlişkileri temizle
        review = null;
        user = null;
    }
} 