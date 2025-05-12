package com.example.backend.repository;

import com.example.backend.model.ProductAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductAttributeRepository extends JpaRepository<ProductAttribute, Long> {
    
    /**
     * Bir ürüne ait tüm özellikleri bul
     */
    List<ProductAttribute> findByProductId(Long productId);
    
    /**
     * Bir kategoriye ait tüm özellikleri bul
     */
    List<ProductAttribute> findByCategoryId(Long categoryId);
    
    /**
     * Belirli bir isim ve ürün ID'sine göre özelliği bul
     */
    Optional<ProductAttribute> findByNameAndProductId(String name, Long productId);
    
    /**
     * Bir özelliğin o isimle daha önce tanımlanıp tanımlanmadığını kontrol et
     */
    boolean existsByNameAndProductId(String name, Long productId);

    // Ürüne göre özellikleri getir
    List<ProductAttribute> findByValuesProductId(Long productId);
    
    // Tip ve kategoriye göre özellikleri getir
    List<ProductAttribute> findByTypeAndCategoryId(String type, Long categoryId);
} 