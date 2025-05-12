package com.example.backend.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.CascadeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "stores")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"majorCategory", "products"})
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String logo;

    private String bannerImage;

    private Double rating;

    @Column(nullable = false)
    private String status; // "approved", "rejected", "pending", "banned", "inactive"

    private Integer followers;

    private Integer productsCount;
    
    @Column(name = "active_products_count")
    private Integer activeProductsCount;

    private String address;

    private String contactEmail;

    private String contactPhone;

    private String website;
    
    private String facebook;
    
    private String instagram;
    
    private String twitter;

    @ElementCollection
    private List<String> categories = new ArrayList<>();
    
    @JsonIgnore
    @OneToOne(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    private StoreMajorCategory majorCategory;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @JsonIgnore
    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Product> products = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) {
            status = "pending"; // Default to pending
        }
        if (followers == null) {
            followers = 0;
        }
        if (productsCount == null) {
            productsCount = 0;
        }
        if (activeProductsCount == null) {
            activeProductsCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void incrementProductsCount() {
        this.productsCount = (this.productsCount == null ? 0 : this.productsCount) + 1;
        this.activeProductsCount = (this.activeProductsCount == null ? 0 : this.activeProductsCount) + 1;
    }

    public void decrementProductsCount() {
        if (this.productsCount != null && this.productsCount > 0) {
            this.productsCount--;
        }
        if (this.activeProductsCount != null && this.activeProductsCount > 0) {
            this.activeProductsCount--;
        }
    }
    
    public void incrementActiveProductsCount() {
        this.activeProductsCount = (this.activeProductsCount == null ? 0 : this.activeProductsCount) + 1;
    }
    
    public void decrementActiveProductsCount() {
        if (this.activeProductsCount != null && this.activeProductsCount > 0) {
            this.activeProductsCount--;
        }
    }

    public void incrementFollowers() {
        this.followers = (this.followers == null ? 0 : this.followers) + 1;
    }

    public void decrementFollowers() {
        if (this.followers != null && this.followers > 0) {
            this.followers--;
        }
    }

    // Custom hashCode and equals to break infinite recursion
    @Override
    public int hashCode() {
        return Objects.hash(id, name, status, createdAt);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Store)) return false;
        Store store = (Store) o;
        return Objects.equals(id, store.id);
    }
} 