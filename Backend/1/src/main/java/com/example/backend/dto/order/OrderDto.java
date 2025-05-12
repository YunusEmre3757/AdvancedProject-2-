package com.example.backend.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDto {
    private Long id;
    private String orderNumber;
    private LocalDateTime date;
    private BigDecimal totalPrice;
    private String status;
    private String address;
    private List<OrderItemDto> items;
    private String paymentIntentId;
    private String paymentMethod;
    private String paymentStatus;
    private String refundId;
    private String refundStatus;
    private BigDecimal refundAmount;
    private LocalDateTime cancelledAt;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // User details
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhoneNumber;
} 