package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductAttributeDTO {
    private Long id;
    private String name;
    private String type; // COLOR, SIZE, NUMERIC, MATERIAL, WEIGHT, VOLUME, OPTION
    private boolean required;
    private List<AttributeValueDTO> values;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttributeValueDTO {
        private Long id;
        private String value;
        private String displayText;
        private String colorCode; // Renk için
        private String imageUrl;  // Görsellerle seçim için
        private boolean inStock;  // Stokta var mı?
        private Double priceAdjustment; // Fiyat farkı
    }
} 