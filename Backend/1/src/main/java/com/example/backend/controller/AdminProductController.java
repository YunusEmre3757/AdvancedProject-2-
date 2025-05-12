package com.example.backend.controller;

import com.example.backend.dto.ProductAttributeDTO;
import com.example.backend.dto.ProductVariantDTO;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import com.example.backend.service.ProductService;
import com.example.backend.service.ProductVariantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products")
@CrossOrigin(origins = "*")
public class AdminProductController {

    @Autowired
    private ProductService productService;
    
    @Autowired
    private ProductVariantService productVariantService;

    /**
     * Admin: Yeni ürün ekle
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        try {
            System.out.println("Admin: Yeni ürün ekleme isteği alındı");
            System.out.println("Ürün Adı: " + product.getName());
            System.out.println("Ürün JSON: " + product);
            
            // Kategori kontrolü
            if (product.getCategory() == null) {
                System.out.println("HATA: Kategori eksik!");
                return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
            } else {
                System.out.println("Kategori ID: " + product.getCategory().getId());
            }
            
            // Brand kontrolü
            if (product.getBrand() != null) {
                System.out.println("Brand ID: " + product.getBrand().getId());
                System.out.println("Brand Detay: " + product.getBrand());
            } else {
                System.out.println("Brand belirtilmemiş");
            }
            
            // Store kontrolü
            if (product.getStore() != null) {
                System.out.println("Store ID: " + product.getStore().getId());
                System.out.println("Store Detay: " + product.getStore());
            } else {
                System.out.println("Store belirtilmemiş");
            }
            
            Product createdProduct = productService.addProduct(product);
            return new ResponseEntity<>(createdProduct, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Admin: Ürün güncelle
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Product> updateProduct(@PathVariable("id") long id, @RequestBody Product product) {
        try {
            Product updatedProduct = productService.updateProduct(id, product);
            return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Admin: Ürün sil
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<HttpStatus> deleteProduct(@PathVariable("id") long id) {
        try {
            productService.deleteProduct(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

 
    
    /**
     * Admin: Ürüne ait varyantları getir
     */
    @GetMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('ADMIN')")
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
     * Admin: Yeni varyant ekle
     */
    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ProductVariantDTO> addProductVariant(
            @PathVariable("id") long id,
            @RequestBody ProductVariantDTO variantDTO) {
        try {
            ProductVariantDTO createdVariant = productService.addProductVariant(id, variantDTO);
            return new ResponseEntity<>(createdVariant, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Admin: Varyant güncelle
     */
    @PutMapping("/variants/{variantId}")
    @PreAuthorize("hasAuthority('ADMIN')")
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
     * Admin: Varyant sil
     */
    @DeleteMapping("/variants/{variantId}")
    @PreAuthorize("hasAuthority('ADMIN')")
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
     * Admin: Varyant durumunu güncelle
     */
    @PutMapping("/variants/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> updateVariantStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        if (!status.equals("active") && !status.equals("inactive")) {
            return ResponseEntity.badRequest().build();
        }
        productVariantService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }
} 