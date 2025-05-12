package com.example.backend.dto.payment;

import lombok.Data;

@Data
public class PaymentConfirmRequest {
    private String paymentIntentId;
    private String paymentMethodId;
} 