package com.example.backend.controller;

import com.example.backend.dto.payment.PaymentConfirmRequest;
import com.example.backend.dto.payment.PaymentIntentRequest;
import com.example.backend.dto.payment.PaymentIntentResponse;
import com.example.backend.service.PaymentService;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);
    
    private final PaymentService paymentService;

    @Autowired
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Yeni bir ödeme niyeti (payment intent) oluşturur
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody PaymentIntentRequest request) {
        try {
            logger.info("Creating payment intent for amount: {}", request.getAmount());
            PaymentIntentResponse response = paymentService.createPaymentIntent(request);
            return ResponseEntity.ok(response);
        } catch (StripeException e) {
            logger.error("Error creating payment intent: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Bir ödeme niyetini onaylar
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<?> confirmPayment(@RequestBody PaymentConfirmRequest request) {
        try {
            logger.info("Confirming payment for intent: {}", request.getPaymentIntentId());
            PaymentIntentResponse response = paymentService.confirmPayment(request);
            return ResponseEntity.ok(response);
        } catch (StripeException e) {
            logger.error("Error confirming payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Bir ödeme niyetini iptal eder
     */
    @PostMapping("/cancel-payment/{paymentIntentId}")
    public ResponseEntity<?> cancelPayment(@PathVariable String paymentIntentId) {
        try {
            logger.info("Cancelling payment intent: {}", paymentIntentId);
            PaymentIntentResponse response = paymentService.cancelPayment(paymentIntentId);
            return ResponseEntity.ok(response);
        } catch (StripeException e) {
            logger.error("Error cancelling payment: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
} 