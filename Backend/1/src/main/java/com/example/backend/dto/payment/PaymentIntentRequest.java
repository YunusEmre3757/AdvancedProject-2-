package com.example.backend.dto.payment;

import lombok.Data;

@Data
public class PaymentIntentRequest {
    private Long amount; // Kuruş cinsinden tutar (örn. 1000 = 10.00 TL)
    private String currency = "try"; // Varsayılan olarak Türk Lirası
    private String description;
    private Long orderId;
} 