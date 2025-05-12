package com.example.backend.controller;

import com.example.backend.dto.order.CreateOrderRequest;
import com.example.backend.dto.order.OrderDto;
import com.example.backend.dto.order.OrderStatusUpdateRequest;
import com.example.backend.dto.order.TrackingNumberUpdateRequest;
import com.example.backend.security.CurrentUser;
import com.example.backend.security.UserPrincipal;
import com.example.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", maxAge = 3600, 
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class OrderController {

    private final OrderService orderService;
    private static final Logger logger = LoggerFactory.getLogger(OrderController.class);

    @PostMapping
    @PreAuthorize("hasAuthority('USER') or hasAuthority('SELLER')")
    public ResponseEntity<OrderDto> createOrder(
            @CurrentUser UserPrincipal currentUser,
            @Valid @RequestBody CreateOrderRequest request) {
        
        // Kullanıcı kontrolü
        if (currentUser == null) {
            System.out.println("createOrder - HATA: currentUser null!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            logger.info("Sipariş oluşturma isteği başlatılıyor. UserID: {}", currentUser.getId());
            
            // OrderService'de createOrder metodunu çağır
            // Not: OrderService içinde tüm OrderItem'ların status'ünü "PENDING" olarak ayarlamalısınız
            OrderDto orderDto = orderService.createOrder(currentUser.getId(), request);
            
            logger.info("Sipariş başarıyla oluşturuldu. OrderID: {}", orderDto.getId());
            return new ResponseEntity<>(orderDto, HttpStatus.CREATED);
        } catch (Exception e) {
            logger.error("Sipariş oluşturulurken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }
    
  


    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER') or hasAuthority('SELLER')")
    public ResponseEntity<OrderDto> getOrderById(
            @CurrentUser UserPrincipal currentUser,
            @PathVariable Long id) {

        
        // Kullanıcı kontrolü
        if (currentUser == null) {
            System.out.println("getOrderById - HATA: currentUser null!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        OrderDto orderDto = orderService.getOrderById(id);
        return ResponseEntity.ok(orderDto);
    }

    
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAuthority('USER')")
    public ResponseEntity<List<OrderDto>> getUserOrders(
            @PathVariable Long userId,
            @CurrentUser UserPrincipal currentUser) {
        
        System.out.println("getUserOrders çağrıldı - userId: " + userId);
        
        // Kullanıcı kimlik kontrolleri
        if (currentUser == null) {
            System.out.println("HATA: currentUser null!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        System.out.println("Kimlik doğrulandı - currentUser.id: " + currentUser.getId());
        
        // Kullanıcı kendi siparişlerini görüntüleyebilir
        if (!currentUser.getId().equals(userId)) {
            System.out.println("Yetki hatası - istek yapılan userId (" + userId + ") oturum açılan kullanıcı ile eşleşmiyor (" + currentUser.getId() + ")");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        List<OrderDto> orders = orderService.getUserOrders(userId);
        return ResponseEntity.ok(orders);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('USER')")
    public ResponseEntity<OrderDto> cancelOrder(
            @CurrentUser UserPrincipal currentUser,
            @PathVariable Long id) {
        
        // Kullanıcı kontrolü
        if (currentUser == null) {
            System.out.println("cancelOrder - HATA: currentUser null!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            // OrderService'de cancelOrder metodunu çağır - kullanıcının ID'sini de gönder
            OrderDto orderDto = orderService.cancelOrder(id, currentUser.getId());
            
            logger.info("Sipariş başarıyla iptal edildi. OrderID: {}", id);
            return ResponseEntity.ok(orderDto);
        } catch (Exception e) {
            logger.error("Sipariş iptal edilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PatchMapping("/{orderId}/items/{itemId}/cancel")
    @PreAuthorize("hasAuthority('USER')")
    public ResponseEntity<OrderDto> cancelOrderItem(
            @CurrentUser UserPrincipal currentUser,
            @PathVariable Long orderId,
            @PathVariable Long itemId) {
        
        // Kullanıcı kontrolü
        if (currentUser == null) {
            System.out.println("cancelOrderItem - HATA: currentUser null!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            // OrderService'de cancelOrderItem metodunu çağır
            OrderDto orderDto = orderService.cancelOrderItem(orderId, itemId, currentUser.getId());
            
            logger.info("Sipariş öğesi başarıyla iptal edildi. OrderID: {}, ItemID: {}", orderId, itemId);
            return ResponseEntity.ok(orderDto);
        } catch (Exception e) {
            logger.error("Sipariş öğesi iptal edilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderDto> updateOrderStatus(
            @PathVariable Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        
        OrderDto orderDto = orderService.updateOrderStatus(id, request.getStatus());
        return ResponseEntity.ok(orderDto);
    }

    @PatchMapping("/{id}/tracking")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderDto> updateOrderTrackingNumber(
            @PathVariable Long id,
            @RequestBody TrackingNumberUpdateRequest request) {
        
        // Önce siparişi getir
        OrderDto order = orderService.getOrderById(id);
        
        // Tüm sipariş öğelerinin takip numarasını güncelle
        for (var item : order.getItems()) {
            orderService.updateOrderItemTrackingNumber(id, item.getId(), request.getTrackingNumber());
        }
        
        // Durum güncellemesi - eğer "SHIPPING" yapmak istiyorsak
        orderService.updateOrderStatus(id, "SHIPPING");
        
        // Güncellenmiş siparişi al ve döndür
        OrderDto updatedOrder = orderService.getOrderById(id);
        return ResponseEntity.ok(updatedOrder);
    }

    @PatchMapping("/{orderId}/items/{itemId}/tracking")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrderDto> updateOrderItemTrackingNumber(
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @RequestBody TrackingNumberUpdateRequest request) {
        
        OrderDto orderDto = orderService.updateOrderItemTrackingNumber(orderId, itemId, request.getTrackingNumber());
        return ResponseEntity.ok(orderDto);
    }
} 