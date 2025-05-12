package com.example.backend.controller;

import com.example.backend.model.ProductAttribute;
import com.example.backend.service.ProductAttributeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attributes")
public class ProductAttributeController {

    @Autowired
    private ProductAttributeService productAttributeService;

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ProductAttribute>> getAttributesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(productAttributeService.getAttributesByCategory(categoryId));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ProductAttribute>> getAttributesByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(productAttributeService.getAttributesByProduct(productId));
    }

    @GetMapping("/type/{type}/category/{categoryId}")
    public ResponseEntity<List<ProductAttribute>> getAttributesByTypeAndCategory(
            @PathVariable String type,
            @PathVariable Long categoryId) {
        return ResponseEntity.ok(productAttributeService.getAttributesByTypeAndCategory(type, categoryId));
    }

    @PostMapping
    public ResponseEntity<ProductAttribute> createAttribute(@RequestBody ProductAttribute attribute) {
        return ResponseEntity.ok(productAttributeService.saveAttribute(attribute));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttribute(@PathVariable Long id) {
        productAttributeService.deleteAttribute(id);
        return ResponseEntity.ok().build();
    }
} 