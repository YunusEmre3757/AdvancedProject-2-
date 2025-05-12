package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Category;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    List<Category> findByParentIsNull();
    List<Category> findByParent(Category parent);
    List<Category> findByNameContainingIgnoreCase(String name);
    List<Category> findByLevel(Integer level);
    List<Category> findByActiveTrue();
    boolean existsByName(String name);
    Optional<Category> findBySlug(String slug);
} 