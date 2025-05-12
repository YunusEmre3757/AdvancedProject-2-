package com.example.backend.controller;

import com.example.backend.dto.order.OrderDto;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.Store;
import com.example.backend.model.User;
import com.example.backend.repository.StoreRepository;
import com.example.backend.service.OrderService;
import com.example.backend.util.ApiResponse;
import com.example.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/store-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StoreOrderController {

    private final OrderService orderService;
    private final StoreRepository storeRepository;

    /**
     * Mağaza sahibinin mağazasına ait siparişleri getirir
     */
    @GetMapping("/{storeId}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<OrderDto>> getStoreOrders(
            @PathVariable Long storeId,
            Authentication authentication) {
        
        // Kullanıcı yetkisini kontrol et
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        checkStoreOwnership(storeId, userId);
        
        return ResponseEntity.ok(orderService.getStoreOrders(storeId));
    }
    
    /**
     * Mağaza sahibinin bir siparişin durumunu güncellemesini sağlar
     */
    @PatchMapping("/{storeId}/{orderId}/status")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<OrderDto> updateOrderStatus(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @RequestBody Map<String, String> statusUpdate,
            Authentication authentication) {
        
        // Kullanıcı yetkisini kontrol et
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        checkStoreOwnership(storeId, userId);
        
        String newStatus = statusUpdate.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.ok(orderService.updateOrderStatusByStore(orderId, storeId, newStatus));
    }
    
    /**
     * Mağaza sahibine ait tüm mağazaların siparişlerini getirir
     */
    @GetMapping("/my-stores")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<OrderDto>> getAllMyStoresOrders(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Kullanıcı ID'sini kullanarak mağazaları bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        
        // Gerisi aynı kalabilir
        List<OrderDto> allOrders = userStores.stream()
            .flatMap(store -> orderService.getStoreOrders(store.getId()).stream())
            .toList();
        
        return ResponseEntity.ok(allOrders);
    }
    
    /**
     * Satıcının özet istatistiklerini getirir (Toplam ürün, bugünkü satış, aylık gelir, bekleyen sipariş)
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Map<String, Object>> getSellerStats(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Kullanıcının mağazalarını bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        
        // Mağazaların toplam ürün sayısını hesapla
        Integer totalProducts = userStores.stream()
            .mapToInt(store -> orderService.getStoreProductCount(store.getId()))
            .sum();
        
        // Bugünkü satışları hesapla
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        
        Integer todaySales = userStores.stream()
            .mapToInt(store -> orderService.countStoreOrdersBetweenDates(store.getId(), startOfDay, endOfDay))
            .sum();
        
        // Aylık geliri hesapla
        LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIN);
        LocalDateTime endOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth()), LocalTime.MAX);
        
        Double monthlyRevenue = userStores.stream()
            .mapToDouble(store -> orderService.calculateStoreRevenueBetweenDates(store.getId(), startOfMonth, endOfMonth))
            .sum();
        
        // Bekleyen sipariş sayısını hesapla
        Integer pendingOrders = userStores.stream()
            .mapToInt(store -> orderService.countStorePendingOrders(store.getId()))
            .sum();
            
        // Eğilim hesaplamaları (trend)
        // Önceki ayın verileriyle karşılaştırma yaparak eğilim yüzdeleri hesaplanabilir
        LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime endOfPrevMonth = startOfMonth.minusDays(1);
        
        Double prevMonthRevenue = userStores.stream()
            .mapToDouble(store -> orderService.calculateStoreRevenueBetweenDates(store.getId(), startOfPrevMonth, endOfPrevMonth))
            .sum();
        
        // Gelir eğilimi hesapla (% değişim)
        int revenueTrend = 0;
        if (prevMonthRevenue > 0) {
            revenueTrend = (int) ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100);
        }
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProducts", totalProducts);
        stats.put("todaySales", todaySales);
        stats.put("monthlyRevenue", monthlyRevenue);
        stats.put("pendingOrders", pendingOrders);
        stats.put("revenueTrend", revenueTrend);
        
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Belirli bir mağazanın istatistiklerini getirir
     */
    @GetMapping("/store/{storeId}/stats")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Map<String, Object>> getStoreStats(
            @PathVariable Long storeId,
            Authentication authentication) {
        
        // Kullanıcı yetkisini kontrol et
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        Store store = checkStoreOwnership(storeId, userId);
        
        // Mağazanın toplam ürün sayısını hesapla
        Integer totalProducts = orderService.getStoreProductCount(storeId);
        
        // Bugünkü satışları hesapla
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        Integer todaySales = orderService.countStoreOrdersBetweenDates(storeId, startOfDay, endOfDay);
        
        // Aylık geliri hesapla
        LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIN);
        LocalDateTime endOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth()), LocalTime.MAX);
        Double monthlyRevenue = orderService.calculateStoreRevenueBetweenDates(storeId, startOfMonth, endOfMonth);
        
        // Bekleyen sipariş sayısını hesapla
        Integer pendingOrders = orderService.countStorePendingOrders(storeId);
            
        // Eğilim hesaplamaları (trend)
        LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime endOfPrevMonth = startOfMonth.minusDays(1);
        
        Double prevMonthRevenue = orderService.calculateStoreRevenueBetweenDates(storeId, startOfPrevMonth, endOfPrevMonth);
        
        // Gelir eğilimi hesapla (% değişim)
        int revenueTrend = 0;
        if (prevMonthRevenue > 0) {
            revenueTrend = (int) ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100);
        }
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("storeId", storeId);
        stats.put("storeName", store.getName());
        stats.put("totalProducts", totalProducts);
        stats.put("todaySales", todaySales);
        stats.put("monthlyRevenue", monthlyRevenue);
        stats.put("pendingOrders", pendingOrders);
        stats.put("revenueTrend", revenueTrend);
        
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Satıcının tüm mağazalarının istatistiklerini ayrı ayrı getirir
     */
    @GetMapping("/stores/stats")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<Map<String, Object>>> getAllStoresStats(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Kullanıcının mağazalarını bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        List<Map<String, Object>> allStoresStats = new ArrayList<>();
        
        for (Store store : userStores) {
            Long storeId = store.getId();
            
            // Mağazanın toplam ürün sayısını hesapla
            Integer totalProducts = orderService.getStoreProductCount(storeId);
            
            // Bugünkü satışları hesapla
            LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
            LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
            Integer todaySales = orderService.countStoreOrdersBetweenDates(storeId, startOfDay, endOfDay);
            
            // Aylık geliri hesapla
            LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIN);
            LocalDateTime endOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth()), LocalTime.MAX);
            Double monthlyRevenue = orderService.calculateStoreRevenueBetweenDates(storeId, startOfMonth, endOfMonth);
            
            // Bekleyen sipariş sayısını hesapla
            Integer pendingOrders = orderService.countStorePendingOrders(storeId);
                
            // Eğilim hesaplamaları (trend)
            LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);
            LocalDateTime endOfPrevMonth = startOfMonth.minusDays(1);
            
            Double prevMonthRevenue = orderService.calculateStoreRevenueBetweenDates(storeId, startOfPrevMonth, endOfPrevMonth);
            
            // Gelir eğilimi hesapla (% değişim)
            int revenueTrend = 0;
            if (prevMonthRevenue > 0) {
                revenueTrend = (int) ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100);
            }
            
            Map<String, Object> storeStats = new HashMap<>();
            storeStats.put("storeId", storeId);
            storeStats.put("storeName", store.getName());
            storeStats.put("totalProducts", totalProducts);
            storeStats.put("todaySales", todaySales);
            storeStats.put("monthlyRevenue", monthlyRevenue);
            storeStats.put("pendingOrders", pendingOrders);
            storeStats.put("revenueTrend", revenueTrend);
            
            allStoresStats.add(storeStats);
        }
        
        return ResponseEntity.ok(allStoresStats);
    }
    
    /**
     * Satıcının gelir raporunu getirir (aylık bazda)
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Map<String, Object>> getRevenueReport(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Kullanıcının mağazalarını bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        
        Map<String, Object> revenue = new HashMap<>();
        
        // Son 12 ayın gelirlerini hesapla
        Map<String, Double> monthlyData = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        for (int i = 11; i >= 0; i--) {
            LocalDateTime startOfMonth = LocalDateTime.of(now.minusMonths(i).getYear(), now.minusMonths(i).getMonth(), 1, 0, 0);
            LocalDateTime endOfMonth = startOfMonth.plusMonths(1).minusDays(1).withHour(23).withMinute(59).withSecond(59);
            
            Double monthRevenue = userStores.stream()
                .mapToDouble(store -> orderService.calculateStoreRevenueBetweenDates(store.getId(), startOfMonth, endOfMonth))
                .sum();
                
            String monthKey = startOfMonth.getMonth().toString() + " " + startOfMonth.getYear();
            monthlyData.put(monthKey, monthRevenue);
        }
        
        revenue.put("monthlyData", monthlyData);
        
        // Toplam yıllık gelir
        Double yearlyTotal = userStores.stream()
            .mapToDouble(store -> orderService.calculateStoreRevenueBetweenDates(
                store.getId(), 
                LocalDateTime.of(now.getYear(), 1, 1, 0, 0),
                now))
            .sum();
            
        revenue.put("yearlyTotal", yearlyTotal);
        
        return ResponseEntity.ok(revenue);
    }
    
 
    /**
     * OrderItem durumunu güncelle (mağaza sahibi için)
     */
    @PatchMapping("/{storeId}/{orderId}/items/{itemId}/status")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> updateOrderItemStatus(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        
        // Kullanıcı yetkisini kontrol et
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        checkStoreOwnership(storeId, userId);
        
        String status = request.get("status");
        if (status == null) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse(false, "Status alanı gereklidir"));
        }
        
        try {
            // Sipariş öğesinin durumunu güncelle
            OrderDto updatedOrder = orderService.updateOrderItemStatus(storeId, orderId, itemId, status);
            return ResponseEntity.ok(new ApiResponse(true, "Sipariş öğesinin durumu başarıyla güncellendi"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404)
                .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ApiResponse(false, "Sipariş öğesi güncellenirken bir hata oluştu: " + e.getMessage()));
        }
    }
    
    /**
     * Mağaza sahibinin siparişindeki ürünlerin takip numarasını güncellemesini sağlar
     */
    @PatchMapping("/{storeId}/{orderId}/items/{itemId}/tracking")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<?> updateOrderItemTrackingNumber(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @PathVariable Long itemId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        
        // Kullanıcı yetkisini kontrol et
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        checkStoreOwnership(storeId, userId);
        
        String trackingNumber = request.get("trackingNumber");
        if (trackingNumber == null) {
            return ResponseEntity.badRequest()
                .body(new ApiResponse(false, "Takip numarası alanı gereklidir"));
        }
        
        try {
            // Sipariş öğesinin takip numarasını güncelle
            orderService.updateOrderItemTrackingNumber(orderId, itemId, trackingNumber);
            return ResponseEntity.ok(new ApiResponse(true, "Takip numarası başarıyla güncellendi"));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ApiResponse(false, "Takip numarası güncellenirken bir hata oluştu: " + e.getMessage()));
        }
    }
    
    /**
     * Mağaza sahipliğini kontrol eder
     */
    private Store checkStoreOwnership(Long storeId, Long userId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Mağaza bulunamadı"));
        
        if (store.getOwner() == null || !userId.equals(store.getOwner().getId())) {
            throw new IllegalStateException("Bu mağaza için yetkiniz yok");
        }
        
        return store;
    }
} 