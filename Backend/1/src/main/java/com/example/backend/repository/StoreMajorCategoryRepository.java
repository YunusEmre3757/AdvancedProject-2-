package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.StoreMajorCategory;
import com.example.backend.model.Store;
import com.example.backend.model.Category;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreMajorCategoryRepository extends JpaRepository<StoreMajorCategory, Long> {
    
    Optional<StoreMajorCategory> findByStore(Store store);
    
    Optional<StoreMajorCategory> findByStoreId(Long storeId);
    
    List<StoreMajorCategory> findByCategory(Category category);
    
    List<StoreMajorCategory> findByCategoryId(Long categoryId);
    
    void deleteByStore(Store store);
    
    void deleteByStoreId(Long storeId);
} 