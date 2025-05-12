package com.example.backend.service;

import com.example.backend.model.Category;
import com.example.backend.repository.CategoryRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    // Tüm kategorileri getir
    @Transactional(readOnly = true)
    public List<Category> findAll() {
        return categoryRepository.findAll();
    }

    // Ana kategorileri getir (Level 1)
    @Transactional(readOnly = true)
    public List<Category> findRootCategories() {
        return categoryRepository.findByParentIsNull();
    }

    // Bir kategorinin alt kategorilerini getir
    @Transactional(readOnly = true)
    public List<Category> findSubcategoriesByParentId(Long id) {
        Category parent = categoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Category not found"));
        return categoryRepository.findByParent(parent);
    }

    // Kategori detayını getir
    @Transactional(readOnly = true)
    public Category findById(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Category not found"));
    }

    // İsme göre kategori ara
    @Transactional(readOnly = true)
    public List<Category> searchCategories(String name) {
        return categoryRepository.findByNameContainingIgnoreCase(name);
    }

    // Slug'a göre kategori getir
    @Transactional(readOnly = true)
    public Category getCategoryBySlug(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Category not found with slug: " + slug));
    }

    // Hiyerarşik kategori yapısını getir
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryHierarchy() {
        List<Category> mainCategories = findRootCategories();
        return mainCategories.stream()
            .map(this::buildCategoryHierarchy)
            .collect(Collectors.toList());
    }

    private Map<String, Object> buildCategoryHierarchy(Category category) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", category.getId());
        result.put("name", category.getName());
        result.put("description", category.getDescription());
        result.put("level", category.getLevel());

        List<Category> subcategories = categoryRepository.findByParent(category);
        if (!subcategories.isEmpty()) {
            result.put("subcategories", subcategories.stream()
                .map(this::buildCategoryHierarchy)
                .collect(Collectors.toList()));
        }

        return result;
    }
} 