package com.example.backend.controller;

import com.example.backend.model.Brand;
import com.example.backend.model.Category;
import com.example.backend.service.BrandService;
import com.example.backend.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class CategoryController {

    private final CategoryService categoryService;
    private final BrandService brandService;

    // Tüm kategorileri getir
    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryService.findAll());
    }

    // Ana kategorileri getir (Level 1)
    @GetMapping("/root")
    public ResponseEntity<List<Category>> getRootCategories() {
        return ResponseEntity.ok(categoryService.findRootCategories());
    }

    // Bir kategorinin alt kategorilerini getir
    @GetMapping("/{id}/subcategories")
    public ResponseEntity<List<Category>> getSubcategories(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.findSubcategoriesByParentId(id));
    }

    // Hiyerarşik kategori yapısını getir
    @GetMapping("/hierarchy")
    public ResponseEntity<List<Map<String, Object>>> getCategoryHierarchy() {
        return ResponseEntity.ok(categoryService.getCategoryHierarchy());
    }

    // Kategori detayını getir
    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.findById(id));
    }

    // İsme göre kategori ara
    @GetMapping("/search")
    public ResponseEntity<List<Category>> searchCategories(@RequestParam String name) {
        return ResponseEntity.ok(categoryService.searchCategories(name));
    }
    
    // Kategoriye göre markaları getir
    @GetMapping("/{id}/brands")
    public ResponseEntity<Map<String, Object>> getBrandsByCategory(
            @PathVariable("id") Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
            
        try {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            Sort.Direction direction = sortParams.length > 1 ? 
                (sortParams[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC) : 
                Sort.Direction.ASC;
                
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
            Page<Brand> brandPage = brandService.getBrandsByCategoryId(categoryId, pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", brandPage.getContent());
            response.put("total", brandPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            errorResponse.put("items", List.of());
            errorResponse.put("total", 0);
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/debug/by-slug/{slug}")
    public ResponseEntity<?> debugCategoryBySlug(@PathVariable String slug) {
        try {
            System.out.println("DEBUG: Looking for category with slug: " + slug);
            Category category = categoryService.getCategoryBySlug(slug);
            if (category != null) {
                Map<String, Object> result = new HashMap<>();
                result.put("category", category);
                result.put("id", category.getId());
                result.put("slug", category.getSlug());
                result.put("parent", category.getParent() != null ? category.getParent().getId() : null);
                
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(404).body("Category not found with slug: " + slug);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
} 