package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_variants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String sku;              // Stok kodu
    
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;        // Fiyat
    
    @Column(precision = 10, scale = 2)
    private BigDecimal salePrice;    // İndirimli fiyat
    
    @Column(nullable = false)
    private Integer stockQuantity;   // Stok miktarı
    
    @Column(nullable = false)
    private boolean active = true;   // Aktif mi?
    
    @Column(name = "status", nullable = false)
    private String status = "active"; // Varsayılan olarak "active"
    
    @JsonIgnore
    @ManyToOne(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;         // Ana ürün
    
    @JsonIgnore
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "variant_attribute_values",
        joinColumns = @JoinColumn(name = "variant_id"),
        inverseJoinColumns = @JoinColumn(name = "attribute_value_id")
    )
    private List<ProductAttributeValue> attributeValues = new ArrayList<>();
    
    @JsonIgnore
    @OneToMany(mappedBy = "variant", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VariantImage> images = new ArrayList<>();
    
    public void addAttributeValue(ProductAttributeValue value) {
        attributeValues.add(value);
        value.getVariants().add(this);
    }
    
    public void removeAttributeValue(ProductAttributeValue value) {
        attributeValues.remove(value);
        value.getVariants().remove(this);
    }
    
    /**
     * Varyantın ana görselini döndürür
     * @return Ana görsel URL'i veya null
     */
    public String getMainImageUrl() {
        return images.stream()
                .filter(VariantImage::getIsMain)
                .map(VariantImage::getImageUrl)
                .findFirst()
                .orElse(null);
    }
    
    @PreRemove
    private void preRemove() {
        // Many-to-Many ilişkisini temizle
        for (ProductAttributeValue value : new ArrayList<>(attributeValues)) {
            removeAttributeValue(value);
        }
    }
} 