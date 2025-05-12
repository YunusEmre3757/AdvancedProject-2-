package com.example.backend.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

import com.example.backend.model.Product;
import com.example.backend.service.ProductService;
import com.example.backend.service.StoreService;
import com.example.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stores/{storeId}/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StoreProductController {
    
    private final ProductService productService;
    private final StoreService storeService;
    
    // Mağazaya ait tüm ürünleri getir (public)
    @GetMapping
    public ResponseEntity<List<Product>> getStoreProducts(@PathVariable Long storeId) {
        List<Product> products = productService.getProductsByStoreId(storeId);
        return ResponseEntity.ok(products);
    }
    
    // Satıcı için mağazaya ait ürünleri getir (SELLER role required)
    @GetMapping("/seller")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<Product>> getStoreProductsForSeller(
            @PathVariable Long storeId, 
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Satıcının bu mağazaya erişim yetkisi olup olmadığını kontrol et
        // Bu kontrolü productService içinde yap ya da burada store service kullanarak yap
        
        List<Product> products = productService.getProductsByStoreId(storeId);
        return ResponseEntity.ok(products);
    }
    
    // Mağazaya ait öne çıkan ürünleri getir
    @GetMapping("/featured")
    public ResponseEntity<List<Product>> getFeaturedStoreProducts(
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "8") int limit) {
        List<Product> featuredProducts = productService.getFeaturedProductsByStoreId(storeId, limit);
        return ResponseEntity.ok(featuredProducts);
    }
} 