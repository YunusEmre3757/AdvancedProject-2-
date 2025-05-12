package com.example.backend.dto.order;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {
    @NotEmpty(message = "Sipariş öğeleri boş olamaz")
    private List<OrderItemRequest> items;
    
    @Positive(message = "Toplam fiyat pozitif olmalıdır")
    private BigDecimal totalPrice;
    
    @NotBlank(message = "Adres boş olamaz")
    @Size(min = 10, message = "Adres en az 10 karakter olmalıdır")
    private String address;
    
    private String status;
    
    private String paymentIntentId;
    
    private String paymentMethod;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @Positive(message = "Ürün ID pozitif olmalıdır")
        private Long productId;
        
        private Long variantId;
        
        @NotBlank(message = "Ürün adı boş olamaz")
        private String productName;
        
        @Positive(message = "Fiyat pozitif olmalıdır")
        private BigDecimal price;
        
        @Positive(message = "Miktar pozitif olmalıdır")
        private Integer quantity;
        
        private String image;
    }
} 