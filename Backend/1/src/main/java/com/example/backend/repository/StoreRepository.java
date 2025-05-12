package com.example.backend.repository;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Store;
import com.example.backend.model.User;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    
    Optional<Store> findByName(String name);
    
    List<Store> findByOwner(User owner);
    
    @Query("SELECT s FROM Store s WHERE s.owner.id = :ownerId")
    List<Store> findByOwnerId(@Param("ownerId") Long ownerId);
    
    @Query("SELECT s FROM Store s WHERE s.status = 'approved' ORDER BY s.rating DESC")
    List<Store> findPopularStores(Pageable pageable);
    
    @Query("SELECT DISTINCT s FROM Store s " +
           "LEFT JOIN s.owner o " +
           "LEFT JOIN StoreMajorCategory smc ON smc.store = s " +
           "LEFT JOIN Category c ON c.id = smc.category.id " +
           "WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(REPLACE(s.name, ' ', '')) LIKE LOWER(CONCAT('%', REPLACE(:query, ' ', ''), '%')) OR " +
           "LOWER(o.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(o.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Store> searchStores(@Param("query") String query, Pageable pageable);
    
    @Query("SELECT s FROM Store s WHERE s.status = 'approved' AND LOWER(s.categories) LIKE LOWER(CONCAT('%', :category, '%'))")
    List<Store> findByCategory(@Param("category") String category);
    
    @Query("SELECT DISTINCT s FROM Store s INNER JOIN Product p ON p.store = s WHERE p.category.id = :categoryId AND s.status = 'approved'")
    List<Store> findByProductCategoryId(@Param("categoryId") Long categoryId);
    
    @Query("SELECT DISTINCT s FROM Store s " +
           "JOIN s.products p " +
           "JOIN p.brand b " +
           "WHERE b.id = :brandId")
    List<Store> findByProductBrandId(@Param("brandId") Long brandId);
    
    long countByCreatedAtAfter(LocalDateTime date);
    
    List<Store> findTop5ByOrderByCreatedAtDesc();
    
    List<Store> findTop6ByOrderByFollowersDesc();
    
    List<Store> findByStatus(String status);
    
    List<Store> findTop10ByOrderByCreatedAtDesc();
    
} 