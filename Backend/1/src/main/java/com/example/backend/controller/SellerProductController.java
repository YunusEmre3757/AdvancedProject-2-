package com.example.backend.controller;

import com.example.backend.dto.ProductVariantDTO;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.Store;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.StoreRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.security.UserPrincipal;
import com.example.backend.service.ProductService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SellerProductController {

    private final ProductService productService;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    /**
     * Satıcının tüm mağazalarındaki ürün sayısını getirir
     */
    @GetMapping("/seller-products/count")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Integer> getSellerProductsCount(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Kullanıcının mağazalarını bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        
        // Tüm mağazalardaki ürün sayısını topla
        int totalProducts = 0;
        for (Store store : userStores) {
            int storeProductCount = productRepository.countByStoreId(store.getId());
            totalProducts += storeProductCount;
        }
        
        return ResponseEntity.ok(totalProducts);
    }
    
    /**
     * Satıcı: Ürüne ait varyantları getir
     */
    @GetMapping("/seller/products/{id}/variants")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<ProductVariantDTO>> getProductVariants(@PathVariable("id") long id) {
        try {
            List<ProductVariantDTO> variants = productService.getProductVariants(id);
            return new ResponseEntity<>(variants, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Satıcı: Varyant güncelle
     */
    @PutMapping("/seller/products/variants/{variantId}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ProductVariantDTO> updateProductVariant(
            @PathVariable("variantId") long variantId,
            @RequestBody ProductVariantDTO variantDTO) {
        try {
            ProductVariantDTO updatedVariant = productService.updateProductVariant(variantId, variantDTO);
            if (updatedVariant != null) {
                return new ResponseEntity<>(updatedVariant, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Satıcı: Varyant sil
     */
    @DeleteMapping("/seller/products/variants/{variantId}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<HttpStatus> deleteProductVariant(@PathVariable("variantId") long variantId) {
        try {
            productService.deleteProductVariant(variantId);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Satıcı: Varyant durumunu güncelle
     */
    @PatchMapping("/seller/products/variants/{variantId}/status")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<ProductVariantDTO> updateVariantStatus(
            @PathVariable("variantId") long variantId,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String status = statusUpdate.get("status");
            if (status == null) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // Status değeri geçerli mi kontrol et
            if (!status.equals("active") && !status.equals("inactive")) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // Önce mevcut varyantı getir
            Optional<ProductVariant> variantResult = productVariantRepository.findById(variantId);
            if (!variantResult.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            
            ProductVariant currentVariant = variantResult.get();
            
            // DTO oluştur ve sadece değiştirilecek değerleri belirle
            ProductVariantDTO variantDTO = new ProductVariantDTO();
            variantDTO.setId(variantId);
            variantDTO.setProductId(currentVariant.getProduct().getId());
            variantDTO.setSku(currentVariant.getSku());
            variantDTO.setPrice(currentVariant.getPrice());
            variantDTO.setSalePrice(currentVariant.getSalePrice());
            variantDTO.setStock(currentVariant.getStockQuantity());
            variantDTO.setVariantDescription(currentVariant.getMainImageUrl());
            variantDTO.setStatus(status);
            variantDTO.setActive(status.equals("active"));
            
            // Varyantı güncelle
            ProductVariantDTO updatedVariant = productService.updateProductVariant(variantId, variantDTO);
            return new ResponseEntity<>(updatedVariant, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Varyant statüsü güncellenirken hata: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Satıcının stok durumu düşük ürünlerini getir
     */
    @GetMapping("/seller-products/low-stock")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<Object>> getLowStockProducts(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {
        // Bu endpoint için gerekirse implementasyon eklenecek
        // Şu an sadece endpoint URL'i doğru çalışsın diye ekledik
        return ResponseEntity.ok(List.of());
    }
    
    /**
     * Satıcı: Ürün durumunu güncelle
     */
    @PatchMapping("/seller/products/{id}/status")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> updateProductStatus(
            @PathVariable("id") long id,
            @RequestBody Map<String, String> statusUpdate,
            Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Long userId = userPrincipal.getId();
            
            String status = statusUpdate.get("status");
            if (status == null) {
                return new ResponseEntity<>("Status field is required", HttpStatus.BAD_REQUEST);
            }
            
            // Status değeri geçerli mi kontrol et
            if (!status.equals("active") && !status.equals("inactive")) {
                return new ResponseEntity<>("Status must be either 'active' or 'inactive'", HttpStatus.BAD_REQUEST);
            }
            
            // Ürünü güncelle
            return productService.updateProductStatusForSeller(id, status, userId)
                .map(product -> new ResponseEntity<Object>(product, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<Object>("Product not found or you don't have permission", HttpStatus.NOT_FOUND));
        } catch (Exception e) {
            System.out.println("Ürün statüsü güncellenirken hata: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Server error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Satıcı: Belirli bir mağazanın ürünlerini getir
     */
    @GetMapping("/seller/stores/{storeId}/products")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Map<String, Object>> getSellerStoreProducts(
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String sort,
            @RequestParam(required = false) String category,
            Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Long userId = userPrincipal.getId();
            
            // Kullanıcının mağazaya erişim yetkisi kontrolü yapılabilir
            // Burada sadece storeId veriyoruz, yetki kontrolü service katmanında yapılabilir
            
            // Ürünleri getir ve pageable şekilde dön
            org.springframework.data.domain.Page<Product> productPage = 
                productService.getSellerStoreProducts(storeId, userId, page, size, sort, category);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", productPage.getContent());
            response.put("total", productPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Mağaza ürünleri yüklenirken hata: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

} 