package com.example.backend.repository;

import com.example.backend.model.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {
    
    // Aktif markaları getir
    List<Brand> findByActiveTrue();
    
    // Aktif markaları sayfalı getir
    Page<Brand> findByActiveTrue(Pageable pageable);
    
    // Marka adına göre bul (büyük-küçük harf duyarsız)
    Optional<Brand> findByNameIgnoreCase(String name);
    
    // Slug'a göre bul
    Optional<Brand> findBySlug(String slug);
    
    // En çok ürüne sahip markaları getir
    @Query("SELECT b FROM Brand b JOIN b.products p WHERE b.active = true GROUP BY b.id ORDER BY COUNT(p) DESC")
    Page<Brand> findTopBrandsByProductCount(Pageable pageable);
    
    // İsme göre ara
    @Query("SELECT b FROM Brand b WHERE b.active = true AND LOWER(b.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Brand> searchBrands(@Param("query") String query, Pageable pageable);
    
    // Kategoriye göre markaları getir (kategorinin kendisi ve alt kategorileri dahil)
    @Query("SELECT DISTINCT b FROM Brand b " +
           "JOIN b.products p " +
           "JOIN p.category c " +
           "WHERE (c.id = :categoryId OR c.parent.id = :categoryId OR " +
           "      (c.parent.parent IS NOT NULL AND c.parent.parent.id = :categoryId)) " +
           "AND b.active = true")
    List<Brand> findBrandsByCategoryId(@Param("categoryId") Long categoryId);
    
    // Kategoriye göre markaları sayfalı getir (kategorinin kendisi ve alt kategorileri dahil)
    @Query("SELECT DISTINCT b FROM Brand b " +
           "JOIN b.products p " +
           "JOIN p.category c " +
           "WHERE (c.id = :categoryId OR c.parent.id = :categoryId OR " +
           "      (c.parent.parent IS NOT NULL AND c.parent.parent.id = :categoryId)) " +
           "AND b.active = true")
    Page<Brand> findBrandsByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);
} 