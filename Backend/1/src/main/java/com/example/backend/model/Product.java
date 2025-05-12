package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.stream.Collectors;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "products")
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT")
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false, columnDefinition = "BIGINT")
    private Brand brand;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false, columnDefinition = "BIGINT")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean featured = false;

    @Column(unique = true)
    private String slug;

    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductAttributeValue> attributeValues;

    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductVariant> variants = new HashSet<>();

    @JsonProperty("images")
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<ProductImage> images = new HashSet<>();
    
    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductAttribute> attributes = new ArrayList<>();
    
    @JsonIgnore
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Review> reviews = new ArrayList<>();

    @Column(name = "min_price")
    private BigDecimal minPrice;

    @Column(name = "max_price")
    private BigDecimal maxPrice;

    @Column(name = "total_stock")
    private Integer totalStock;

    @Column(name = "rating")
    private Float rating = 0.0f;

    @Column(name = "review_count")
    private Integer reviewCount = 0;

    @Column(name = "status", nullable = false)
    private String status = "active"; // Varsayılan olarak "active"

    /**
     * Ürünün ana görselini döndürür
     * @return Ana görsel URL'i veya null
     */
    @JsonProperty
    @Transient // Bu alan veritabanında saklanmıyor, hesaplanan bir değer
    public String getImageUrl() {
        // Images koleksiyonu null veya boş değilse
        if (images != null && !images.isEmpty()) {
            // Tüm resimleri döngüyle dolaş ve isMain = true olan ilk resmin URL'sini döndür
            for (ProductImage image : images) {
                if (image != null && Boolean.TRUE.equals(image.getIsMain())) {
                    return image.getImageUrl();
                }
            }
            
            // Eğer ana görsel yoksa herhangi bir görseli döndür
            for (ProductImage image : images) {
                if (image != null && image.getImageUrl() != null) {
                    return image.getImageUrl();
                }
            }
        }
        
        // Hiç görsel yoksa null döndür
        return null;
    }
    
    /**
     * Ürünün tüm görsellerini döndürür
     * @return Tüm görsel URL'lerinin listesi
     */
    @JsonProperty
    @Transient
    public List<String> getAllImageUrls() {
        return images.stream()
                .sorted((a, b) -> a.getDisplayOrder() - b.getDisplayOrder())
                .map(ProductImage::getImageUrl)
                .collect(Collectors.toList());
    }

    public Product(String name, String description, BigDecimal price, Integer stock, 
                  Brand brand, Category category, Store store, String slug) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.stock = stock;
        this.brand = brand;
        this.category = category;
        this.store = store;
        this.slug = slug;
        this.active = true;
        this.featured = false;
        this.status = "active";
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Mağaza ürün sayısını artır
        if (store != null) {
            store.incrementProductsCount();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    @PreRemove
    protected void onRemove() {
        // Mağaza ürün sayısını azalt
        if (store != null) {
            store.decrementProductsCount();
        }
    }

    // Debugging için images koleksiyonuna erişim sağlayan getter metodu
    @JsonProperty("images")
    public Set<ProductImage> getImages() {
        return images;
    }

    // Manuel getters ve setters (Lombok @Data yerine)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Brand getBrand() {
        return brand;
    }

    public void setBrand(Brand brand) {
        this.brand = brand;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Store getStore() {
        return store;
    }

    public void setStore(Store store) {
        this.store = store;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isFeatured() {
        return featured;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public List<ProductAttributeValue> getAttributeValues() {
        return attributeValues;
    }

    public void setAttributeValues(List<ProductAttributeValue> attributeValues) {
        this.attributeValues = attributeValues;
    }

    public Set<ProductVariant> getVariants() {
        return variants;
    }

    public void setVariants(Set<ProductVariant> variants) {
        this.variants = variants;
    }

    public List<ProductAttribute> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<ProductAttribute> attributes) {
        this.attributes = attributes;
    }

    public List<Review> getReviews() {
        return reviews;
    }

    public void setReviews(List<Review> reviews) {
        this.reviews = reviews;
    }

    public BigDecimal getMinPrice() {
        return minPrice;
    }

    public void setMinPrice(BigDecimal minPrice) {
        this.minPrice = minPrice;
    }

    public BigDecimal getMaxPrice() {
        return maxPrice;
    }

    public void setMaxPrice(BigDecimal maxPrice) {
        this.maxPrice = maxPrice;
    }

    public Integer getTotalStock() {
        return totalStock;
    }

    public void setTotalStock(Integer totalStock) {
        this.totalStock = totalStock;
    }

    public Float getRating() {
        return rating;
    }

    public void setRating(Float rating) {
        this.rating = rating;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Integer reviewCount) {
        this.reviewCount = reviewCount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
} 