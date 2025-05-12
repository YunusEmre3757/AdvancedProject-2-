package com.example.backend.repository;

import com.example.backend.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    
    /**
     * Find all variants for a product
     */
    List<ProductVariant> findByProductId(Long productId);
    
    /**
     * Find variant by SKU
     */
    Optional<ProductVariant> findBySku(String sku);
    
    /**
     * Find active variants for a product
     */
    List<ProductVariant> findByProductIdAndActiveTrue(Long productId);
    
    /**
     * Find variants by product ID and status
     */
    List<ProductVariant> findByProductIdAndStatus(Long productId, String status);
    
    /**
     * Find variants with stock quantity greater than a given quantity for a product
     */
    List<ProductVariant> findByProductIdAndStockQuantityGreaterThan(Long productId, Integer quantity);
} 