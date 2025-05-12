package com.example.backend.service;

import com.example.backend.model.ProductVariant;
import com.example.backend.repository.ProductVariantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ProductVariantService {

    @Autowired
    private ProductVariantRepository productVariantRepository;
    
    @Autowired
    private ProductService productService;

    @Transactional(readOnly = true)
    public List<ProductVariant> getVariantsByProduct(Long productId) {
        return productVariantRepository.findByProductId(productId);
    }

    @Transactional(readOnly = true)
    public List<ProductVariant> getActiveVariantsByProduct(Long productId) {
        return productVariantRepository.findByProductIdAndActiveTrue(productId);
    }

    @Transactional(readOnly = true)
    public List<ProductVariant> getVariantsByProductAndStatus(Long productId, String status) {
        return productVariantRepository.findByProductIdAndStatus(productId, status);
    }

    @Transactional(readOnly = true)
    public List<ProductVariant> getInStockVariantsByProduct(Long productId) {
        return productVariantRepository.findByProductIdAndStockQuantityGreaterThan(productId, 0);
    }

    @Transactional(readOnly = true)
    public Optional<ProductVariant> getVariantBySku(String sku) {
        return productVariantRepository.findBySku(sku);
    }

    @Transactional
    public ProductVariant saveVariant(ProductVariant variant) {
        ProductVariant savedVariant = productVariantRepository.save(variant);
        
        // Ürünün toplam stok bilgisini güncelle
        if (variant.getProduct() != null) {
            productService.updateProductTotalStock(variant.getProduct().getId());
        }
        
        return savedVariant;
    }

    @Transactional
    public void deleteVariant(Long id) {
        ProductVariant variant = productVariantRepository.findById(id).orElse(null);
        Long productId = null;
        
        // Eğer varyant bulunduysa, ürün ID'sini kaydet
        if (variant != null && variant.getProduct() != null) {
            productId = variant.getProduct().getId();
        }
        
        // Varyantı sil
        productVariantRepository.deleteById(id);
        
        // Ürün ID'si varsa toplam stok bilgisini güncelle
        if (productId != null) {
            productService.updateProductTotalStock(productId);
        }
    }

    @Transactional
    public void updateStock(String sku, Integer quantity) {
        productVariantRepository.findBySku(sku).ifPresent(variant -> {
            variant.setStockQuantity(quantity);
            productVariantRepository.save(variant);
            
            // Ürünün toplam stok bilgisini güncelle
            if (variant.getProduct() != null) {
                productService.updateProductTotalStock(variant.getProduct().getId());
            }
        });
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        productVariantRepository.findById(id).ifPresent(variant -> {
            variant.setStatus(status);
            productVariantRepository.save(variant);
            
            // Ürünün toplam stok bilgisini güncelle
            if (variant.getProduct() != null) {
                productService.updateProductTotalStock(variant.getProduct().getId());
            }
        });
    }
} 