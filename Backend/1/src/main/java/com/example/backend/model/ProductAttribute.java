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
@Table(name = "product_attributes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProductAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;        // Özellik adı (örn: "Renk", "Beden", "Kapasite")
    
    @Column(nullable = false)
    private String type;        // Özellik tipi (COLOR, SIZE, NUMERIC, MATERIAL, WEIGHT, VOLUME, OPTION)
    
    @Column(nullable = false)
    private boolean required;   // Zorunlu mu?
    
    @JsonIgnore
    @OneToMany(mappedBy = "attribute", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductAttributeValue> values = new ArrayList<>();
    
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;  // Hangi kategoriye ait (opsiyonel)

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;    // Hangi ürüne ait
} 