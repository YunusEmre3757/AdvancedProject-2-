package com.example.backend.controller;

import com.example.backend.model.Brand;
import com.example.backend.model.Product;
import com.example.backend.service.BrandService;
import com.example.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/brands")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;
    private final ProductService productService;

    // Tüm markaları getir
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllBrands(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        try {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            Sort.Direction direction = sortParams.length > 1 ? 
                (sortParams[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC) : 
                Sort.Direction.ASC;
            
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
            Page<Brand> brandPage = brandService.getBrands(pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", brandPage.getContent());
            response.put("total", brandPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ID ile marka getir
    @GetMapping("/{id}")
    public ResponseEntity<Brand> getBrandById(@PathVariable("id") long id) {
        try {
            Brand brand = brandService.getBrandById(id);
            return new ResponseEntity<>(brand, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    // Slug ile marka getir
    @GetMapping("/slug/{slug}")
    public ResponseEntity<Brand> getBrandBySlug(@PathVariable("slug") String slug) {
        try {
            Brand brand = brandService.getBrandBySlug(slug);
            return new ResponseEntity<>(brand, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    // Markaya ait ürünleri getir
    @GetMapping("/{id}/products")
    public ResponseEntity<Map<String, Object>> getProductsByBrand(
            @PathVariable("id") long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        try {
            Page<Product> productPage = productService.getProductsByBrand(id, page, size, sort);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", productPage.getContent());
            response.put("total", productPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // En popüler markaları getir
    @GetMapping("/popular")
    public ResponseEntity<List<Brand>> getPopularBrands(
            @RequestParam(defaultValue = "10") int limit) {
        
        try {
            Pageable pageable = PageRequest.of(0, limit);
            Page<Brand> brandPage = brandService.getPopularBrands(pageable);
            
            return new ResponseEntity<>(brandPage.getContent(), HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Arama sorgusu ile markaları getir
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchBrands(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Brand> brandPage = brandService.searchBrands(q, pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", brandPage.getContent());
            response.put("total", brandPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Yeni marka ekle
    @PostMapping
    public ResponseEntity<Brand> createBrand(@RequestBody Brand brand) {
        try {
            Brand createdBrand = brandService.addBrand(brand);
            return new ResponseEntity<>(createdBrand, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Marka güncelle
    @PutMapping("/{id}")
    public ResponseEntity<Brand> updateBrand(
            @PathVariable("id") long id,
            @RequestBody Brand brand) {
        
        try {
            Brand updatedBrand = brandService.updateBrand(id, brand);
            return new ResponseEntity<>(updatedBrand, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    // Marka sil
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteBrand(@PathVariable("id") long id) {
        try {
            brandService.deleteBrand(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
} 