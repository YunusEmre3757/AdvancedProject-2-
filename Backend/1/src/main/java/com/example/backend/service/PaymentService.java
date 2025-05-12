package com.example.backend.service;

import com.example.backend.dto.payment.PaymentConfirmRequest;
import com.example.backend.dto.payment.PaymentIntentRequest;
import com.example.backend.dto.payment.PaymentIntentResponse;
import com.example.backend.dto.payment.RefundRequestDto;
import com.example.backend.dto.payment.RefundResponseDto;
import com.stripe.exception.StripeException;

public interface PaymentService {
    
    /**
     * Yeni bir ödeme niyeti (PaymentIntent) oluşturur
     * 
     * @param request Ödeme niyeti oluşturma isteği
     * @return Ödeme niyeti yanıtı
     * @throws StripeException Stripe API hatası durumunda
     */
    PaymentIntentResponse createPaymentIntent(PaymentIntentRequest request) throws StripeException;
    
    /**
     * Bir ödeme niyetini onaylar
     * 
     * @param request Ödeme onay isteği
     * @return Onaylanan ödeme niyeti yanıtı
     * @throws StripeException Stripe API hatası durumunda
     */
    PaymentIntentResponse confirmPayment(PaymentConfirmRequest request) throws StripeException;
    
    /**
     * Bir ödeme niyetini iptal eder
     * 
     * @param paymentIntentId İptal edilecek ödeme niyeti ID'si
     * @return İptal edilen ödeme niyeti yanıtı
     * @throws StripeException Stripe API hatası durumunda
     */
    PaymentIntentResponse cancelPayment(String paymentIntentId) throws StripeException;
    
    /**
     * Bir ödeme için iade işlemi başlatır
     * 
     * @param request İade isteği detayları
     * @return İade işlemi yanıtı
     * @throws StripeException Stripe API hatası durumunda
     */
    RefundResponseDto refundPayment(RefundRequestDto request) throws StripeException;
} 