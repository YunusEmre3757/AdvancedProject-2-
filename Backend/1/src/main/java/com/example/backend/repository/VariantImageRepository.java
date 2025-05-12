package com.example.backend.repository;

import com.example.backend.model.VariantImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VariantImageRepository extends JpaRepository<VariantImage, Long> {
    
    /**
     * Bir varyanta ait tüm görselleri bul
     */
    List<VariantImage> findByVariantId(Long variantId);
    
    /**
     * Bir varyanta ait tüm görselleri sil
     */
    void deleteByVariantId(Long variantId);
    
    /**
     * Ana görselleri bul
     */
    List<VariantImage> findByVariantIdAndIsMainTrue(Long variantId);
} 