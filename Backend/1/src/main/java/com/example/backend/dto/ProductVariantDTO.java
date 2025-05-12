package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.Map;
import java.util.List;

@Data
@NoArgsConstructor
public class ProductVariantDTO {
    private Long id;
    private Long productId;
    private String sku;
    private BigDecimal price;
    private BigDecimal salePrice;
    private Integer stock;
    private Boolean active;
    private String status;
    private String variantDescription;
    
    // Seçilen özellikler (key: özellik adı, value: seçilen değer)
    private Map<String, String> attributes;
    
    // Frontend'den attribute_id bilgisi ile gelen özellikler
    private List<Map<String, Object>> attributesWithIds;
    
    // Varyant görselleri
    private List<String> imageUrls;
    
    public ProductVariantDTO(Long id, Long productId, String sku, BigDecimal price, BigDecimal salePrice,
                            Integer stock, Boolean active, String status, String variantDescription,
                            Map<String, String> attributes, List<String> imageUrls) {
        this.id = id;
        this.productId = productId;
        this.sku = sku;
        this.price = price;
        this.salePrice = salePrice;
        this.stock = stock;
        this.active = active;
        this.status = status != null ? status : "active"; // Default value
        this.variantDescription = variantDescription;
        this.attributes = attributes;
        this.imageUrls = imageUrls;
    }
    
    /**
     * Attributes haritasının varlığını ve boş olup olmadığını kontrol et
     * @return Geçerli bir attributes haritası varsa true
     */
    public boolean hasAttributes() {
        return attributes != null && !attributes.isEmpty();
    }
    
    /**
     * AttributesWithIds listesinin varlığını ve boş olup olmadığını kontrol et
     * @return Geçerli bir attributesWithIds listesi varsa true
     */
    public boolean hasAttributesWithIds() {
        return attributesWithIds != null && !attributesWithIds.isEmpty();
    }
    
    /**
     * Herhangi bir özellik bilgisi içerip içermediğini kontrol et
     * @return Ya attributes ya da attributesWithIds varsa true
     */
    public boolean hasAnyAttributes() {
        return hasAttributes() || hasAttributesWithIds();
    }
} 