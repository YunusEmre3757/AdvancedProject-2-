package com.example.backend.service.impl;

import com.example.backend.dto.payment.PaymentConfirmRequest;
import com.example.backend.dto.payment.PaymentIntentRequest;
import com.example.backend.dto.payment.PaymentIntentResponse;
import com.example.backend.dto.payment.RefundRequestDto;
import com.example.backend.dto.payment.RefundResponseDto;
import com.example.backend.service.PaymentService;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class);

    @Value("${stripe.api.key.secret}")
    private String secretKey;

    @Override
    public PaymentIntentResponse createPaymentIntent(PaymentIntentRequest request) throws StripeException {
        try {
            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                    .setAmount(request.getAmount())
                    .setCurrency(request.getCurrency())
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                                    .build()
                    )
                    .setReceiptEmail(null) // Müşteri e-posta adresi eklenebilir
                    .setDescription(request.getDescription());

            // Metadata eklenebilir
            if (request.getOrderId() != null) {
                paramsBuilder.putMetadata("orderId", request.getOrderId().toString());
            }

            PaymentIntent paymentIntent = PaymentIntent.create(paramsBuilder.build());

            logger.info("Payment intent created: {}", paymentIntent.getId());
            
            return PaymentIntentResponse.builder()
                    .id(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .status(paymentIntent.getStatus())
                    .amount(paymentIntent.getAmount())
                    .currency(paymentIntent.getCurrency())
                    .build();
        } catch (StripeException e) {
            logger.error("Error creating payment intent: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public PaymentIntentResponse confirmPayment(PaymentConfirmRequest request) throws StripeException {
        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(request.getPaymentIntentId());
            
            PaymentIntentConfirmParams params = PaymentIntentConfirmParams.builder()
                    .setPaymentMethod(request.getPaymentMethodId())
                    .setReturnUrl("http://localhost:4200/payment-result") // Kullanıcının yönlendirileceği URL
                    .build();
            
            paymentIntent = paymentIntent.confirm(params);
            
            logger.info("Payment intent confirmed: {}, status: {}", paymentIntent.getId(), paymentIntent.getStatus());
            
            return PaymentIntentResponse.builder()
                    .id(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .status(paymentIntent.getStatus())
                    .amount(paymentIntent.getAmount())
                    .currency(paymentIntent.getCurrency())
                    .build();
        } catch (StripeException e) {
            logger.error("Error confirming payment: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public PaymentIntentResponse cancelPayment(String paymentIntentId) throws StripeException {
        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
            paymentIntent = paymentIntent.cancel();
            
            logger.info("Payment intent cancelled: {}", paymentIntent.getId());
            
            return PaymentIntentResponse.builder()
                    .id(paymentIntent.getId())
                    .clientSecret(paymentIntent.getClientSecret())
                    .status(paymentIntent.getStatus())
                    .amount(paymentIntent.getAmount())
                    .currency(paymentIntent.getCurrency())
                    .build();
        } catch (StripeException e) {
            logger.error("Error cancelling payment: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public RefundResponseDto refundPayment(RefundRequestDto request) throws StripeException {
        try {
            String paymentId = request.getPaymentIntentId();
            
            // Validate payment ID format
            if (paymentId == null) {
                logger.error("Ödeme ID'si null olamaz");
                throw new StripeException("Ödeme ID'si bulunamadı", null, null, null) {};
            }
          
            
            // RefundCreateParams builder oluştur
            RefundCreateParams.Builder paramsBuilder = RefundCreateParams.builder()
                    .setPaymentIntent(paymentId)
                    .setAmount(request.getAmount());
            
            // Eğer sebep belirtilmişse ekle
            if (request.getReason() != null && !request.getReason().isEmpty()) {
                paramsBuilder.setReason(mapReason(request.getReason()));
            }
            
            // Refund işlemini oluştur
            Refund refund = Refund.create(paramsBuilder.build());
            
            logger.info("Ödeme iadesi başarılı: {}, durum: {}", refund.getId(), refund.getStatus());
            
            // RefundResponseDto'yu doldur ve döndür
            return new RefundResponseDto(
                    refund.getId(),
                    refund.getStatus(),
                    refund.getAmount(),
                    refund.getPaymentIntent()
            );
        } catch (StripeException e) {
            logger.error("Ödeme iadesi hatası: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Stripe API'nin beklediği format için sebep dönüşümünü yapar
     */
    private RefundCreateParams.Reason mapReason(String reason) {
        switch (reason.toLowerCase()) {
            case "duplicate":
                return RefundCreateParams.Reason.DUPLICATE;
            case "fraudulent":
                return RefundCreateParams.Reason.FRAUDULENT;
            case "requested_by_customer":
                return RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER;
            default:
                return null;
        }
    }
} 