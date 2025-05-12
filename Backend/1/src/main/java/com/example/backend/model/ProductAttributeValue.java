package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_attribute_values")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductAttributeValue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String value;           // Değer (örn: "Kırmızı", "38", "500GB")
    
    @Column
    private String displayValue;    // Görüntülenecek değer (örn: "Kırmızı", "38 Numara", "500 GB")
    
    @Column
    private String colorCode;       // Renk kodu (renk özelliği için)
    
    @Column
    private String imageUrl;        // Görsel URL (varsa)
    
    @Column
    private Double priceAdjustment; // Fiyat farkı (varsa)
    
    @Column(nullable = false)
    private boolean inStock = true; // Stok durumu
    
    @JsonIgnore
    @ManyToOne(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "attribute_id", nullable = false)
    private ProductAttribute attribute;
    
    @JsonIgnore
    @ManyToOne(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    @JsonIgnore
    @ManyToMany(mappedBy = "attributeValues", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    private List<ProductVariant> variants = new ArrayList<>();
    
    @PreRemove
    private void preRemove() {
        // Many-to-Many ilişkisini temizle
        variants.forEach(variant -> variant.getAttributeValues().remove(this));
        variants.clear();
    }
} 