package com.example.backend.service;

import com.example.backend.dto.order.CreateOrderRequest;
import com.example.backend.dto.order.OrderDto;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderService {
    OrderDto createOrder(Long userId, CreateOrderRequest request);
    OrderDto getOrderById(Long id);
    List<OrderDto> getUserOrders(Long userId);
    List<OrderDto> getStoreOrders(Long storeId);
    OrderDto cancelOrder(Long orderId, Long userId);
    OrderDto updateOrderStatus(Long orderId, String status);
    OrderDto updateOrderStatusByStore(Long orderId, Long storeId, String status);
    
    // Yeni eklendi: Sipariş öğesinin durumunu güncelle (Satıcı için)
    OrderDto updateOrderItemStatus(Long storeId, Long orderId, Long itemId, String status);
    
    // Yeni eklendi: Müşterinin belirli sipariş öğesini iptal etmesi
    OrderDto cancelOrderItem(Long orderId, Long itemId, Long userId);
    
    // Yeni eklendi: Sipariş öğesinin takip numarasını güncelle
    OrderDto updateOrderItemTrackingNumber(Long orderId, Long itemId, String trackingNumber);
    
    // Toplam sipariş sayısını döndürür
    long getOrderCount();
    
    // Son belirtilen gün içindeki sipariş artış yüzdesini döndürür
    int getOrderPercentageIncrease(int days);
    
    // Admin için tüm siparişleri getir
    List<OrderDto> getAllOrders();
    
    // Admin için belirli statüdeki siparişleri getir
    List<OrderDto> getAllOrdersByStatus(String status);
    
    // Admin için sipariş arama
    List<OrderDto> searchOrders(String query);
    
    // Admin için belirli statüdeki siparişlerde arama
    List<OrderDto> searchOrdersWithStatus(String query, String status);
    
    // Admin için sipariş silme
    void deleteOrder(Long orderId);
    
    // Satıcı dashboard istatistikleri için metodlar
    int countStoreOrdersBetweenDates(Long storeId, LocalDateTime startDate, LocalDateTime endDate);
    
    int countStorePendingOrders(Long storeId);

    double calculateStoreRevenueBetweenDates(Long storeId, LocalDateTime startDate, LocalDateTime endDate);

    int getStoreProductCount(Long storeId);
} 