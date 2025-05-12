package com.example.backend.repository;

import com.example.backend.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductId(Long productId);
    
    List<ProductImage> findByProductIdOrderByDisplayOrderAsc(Long productId);
    
    void deleteByProductId(Long productId);
} 