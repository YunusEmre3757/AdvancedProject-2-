package com.example.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponseDto {
    private String refundId;
    private String status;
    private Long amount; // Kuruş cinsinden miktar
    private String paymentIntentId;
} 