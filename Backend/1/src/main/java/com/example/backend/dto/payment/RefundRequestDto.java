package com.example.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestDto {
    private String paymentIntentId;
    private Long amount; // Kuruş cinsinden miktar
    private String reason; // Opsiyonel iade sebebi
} 