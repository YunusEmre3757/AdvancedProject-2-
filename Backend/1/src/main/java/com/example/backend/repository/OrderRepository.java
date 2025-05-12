package com.example.backend.repository;

import com.example.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByDateDesc(Long userId);
    Optional<Order> findByOrderNumber(String orderNumber);
    long countByDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    // Tarihten sonraki siparişleri sayar
    long countByDateAfter(LocalDateTime date);
    
    // İki tarih arasındaki siparişleri sayar
    long countByDateAfterAndDateBefore(LocalDateTime startDate, LocalDateTime endDate);
    
    // Sipariş durumuna göre siparişleri bulur
    List<Order> findByStatus(String status);
    
    // Kullanıcı adına göre arama yapar
    @Query("SELECT o FROM Order o JOIN o.user u WHERE " +
           "LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.surname) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Order> findByUserNameContainingIgnoreCase(@Param("query") String query);
} 