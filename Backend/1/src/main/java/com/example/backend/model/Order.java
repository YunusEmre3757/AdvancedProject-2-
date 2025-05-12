package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_number", unique = true, nullable = false)
    private String orderNumber;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private LocalDateTime date;
    
    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;
    
    @Column(nullable = false)
    private String status;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;
    
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Ödeme ve iade ile ilgili alanlar
    @Column(name = "payment_intent_id")
    private String paymentIntentId;
    
    @Column(name = "payment_method")
    private String paymentMethod;
    
    @Column(name = "payment_status")
    private String paymentStatus;
    
    @Column(name = "refund_id")
    private String refundId;
    
    @Column(name = "refund_status")
    private String refundStatus;
    
    @Column(name = "refund_amount")
    private BigDecimal refundAmount;
    
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        // Otomatik sipariş numarası oluşturma (ORD-YearMonthDay-ID)
        if (this.orderNumber == null) {
            LocalDateTime now = LocalDateTime.now();
            this.orderNumber = String.format("ORD-%d%02d%02d-%d", 
                now.getYear(), now.getMonthValue(), now.getDayOfMonth(), 
                System.nanoTime() % 10000);
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
} 