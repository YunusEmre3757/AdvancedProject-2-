package com.example.backend.controller;

import com.example.backend.model.ProductVariant;
import com.example.backend.service.ProductVariantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/variants")
public class ProductVariantController {

    @Autowired
    private ProductVariantService productVariantService;

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ProductVariant>> getVariantsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.getVariantsByProduct(productId));
    }

    @GetMapping("/product/{productId}/active")
    public ResponseEntity<List<ProductVariant>> getActiveVariantsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.getActiveVariantsByProduct(productId));
    }

    @GetMapping("/product/{productId}/status/{status}")
    public ResponseEntity<List<ProductVariant>> getVariantsByProductAndStatus(
            @PathVariable Long productId,
            @PathVariable String status) {
        return ResponseEntity.ok(productVariantService.getVariantsByProductAndStatus(productId, status));
    }

    @GetMapping("/product/{productId}/in-stock")
    public ResponseEntity<List<ProductVariant>> getInStockVariantsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.getInStockVariantsByProduct(productId));
    }

    @GetMapping("/sku/{sku}")
    public ResponseEntity<ProductVariant> getVariantBySku(@PathVariable String sku) {
        Optional<ProductVariant> variant = productVariantService.getVariantBySku(sku);
        return variant.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductVariant> createVariant(@RequestBody ProductVariant variant) {
        return ResponseEntity.ok(productVariantService.saveVariant(variant));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVariant(@PathVariable Long id) {
        productVariantService.deleteVariant(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{sku}/stock")
    public ResponseEntity<Void> updateStock(
            @PathVariable String sku,
            @RequestParam Integer quantity) {
        productVariantService.updateStock(sku, quantity);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        if (!status.equals("active") && !status.equals("inactive")) {
            return ResponseEntity.badRequest().build();
        }
        productVariantService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }
} 