package com.example.backend.repository;

import com.example.backend.model.ProductAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Long> {
    
    /**
     * Bir özelliğe ait tüm değerleri listele
     */
    List<ProductAttributeValue> findByAttributeId(Long attributeId);
    
    /**
     * Bir ürüne ait tüm özellik değerlerini listele
     */
    List<ProductAttributeValue> findByProductId(Long productId);
    
    /**
     * Belirli bir ürün, özellik ve değer kombinasyonunu bul
     */
    Optional<ProductAttributeValue> findByProductIdAndAttributeIdAndValue(Long productId, Long attributeId, String value);
    
    /**
     * Belirli bir özellik ve değer kombinasyonunu bul
     */
    List<ProductAttributeValue> findByAttributeIdAndValue(Long attributeId, String value);
    
    /**
     * Stoktaki değerleri listele
     */
    List<ProductAttributeValue> findByAttributeIdAndInStockTrue(Long attributeId);
} 