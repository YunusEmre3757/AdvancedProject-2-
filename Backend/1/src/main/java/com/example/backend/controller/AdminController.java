package com.example.backend.controller;

import com.example.backend.dto.user.UserResponse;
import com.example.backend.model.User;
import com.example.backend.model.Product;
import com.example.backend.model.Store;
import com.example.backend.service.UserService;
import com.example.backend.service.OrderService;
import com.example.backend.service.ProductService;
import com.example.backend.service.StoreService;
import com.example.backend.dto.admin.DashboardStatsDTO;
import com.example.backend.dto.admin.StoreApplicationDTO;
import com.example.backend.dto.StoreDTO;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.StoreRepository;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Date;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final UserService userService;
    private final ProductService productService;
    private final OrderService orderService;
    private final StoreService storeService;
    private final StoreRepository storeRepository;

    @Autowired
    public AdminController(UserService userService, ProductService productService, 
                          OrderService orderService, StoreService storeService,
                          StoreRepository storeRepository) {
        this.userService = userService;
        this.productService = productService;
        this.orderService = orderService;
        this.storeService = storeService;
        this.storeRepository = storeRepository;
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }

    @GetMapping("/users/search")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<UserResponse>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(userService.searchUsers(query, pageable));
    }

    @PostMapping("/users/role/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> addAdminRole(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi gereklidir");
        }
        return ResponseEntity.ok(userService.addAdminRole(email));
    }

    @DeleteMapping("/users/role/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> removeAdminRole(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi gereklidir");
        }
        return ResponseEntity.ok(userService.removeAdminRole(email));
    }
    
    @PostMapping("/users/role/seller")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> addSellerRole(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi gereklidir");
        }
        return ResponseEntity.ok(userService.addSellerRole(email));
    }
    
    @DeleteMapping("/users/role/seller")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> removeSellerRole(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi gereklidir");
        }
        return ResponseEntity.ok(userService.removeSellerRole(email));
    }
    
    @GetMapping("/users/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }
    
    @PatchMapping("/users/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<UserResponse> toggleUserStatus(@RequestBody Map<String, Object> request) {
        String email = (String) request.get("email");
        Boolean isActive = (Boolean) request.get("isActive");
        
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("E-posta adresi gereklidir");
        }
        
        if (isActive == null) {
            throw new IllegalArgumentException("isActive değeri gereklidir");
        }
        
        return ResponseEntity.ok(userService.toggleUserStatus(email, isActive));
    }
    
    @PostMapping("/make-admin")
    public ResponseEntity<String> makeAdmin() {
        try {
            // ekmemk7@gmail.com kullanıcısına admin yetkisi ver
            userService.addAdminRole("ekmemk7@gmail.com");
            return ResponseEntity.ok("ekmemk7@gmail.com kullanıcısına admin yetkisi verildi.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Hata: " + e.getMessage());
        }
    }
    
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        // Veritabanından gerçek verileri almalıyız
        long totalUsers = userService.getUserCount();
        long newUsers = userService.getNewUserCount(7); // Son 7 gündeki yeni kullanıcılar
        
        long totalOrders = orderService.getOrderCount();
        int ordersPercentage = orderService.getOrderPercentageIncrease(30); // Son 30 gündeki artış
        
        long totalStores = storeService.getStoreCount();
        long newStores = storeService.getNewStoreCount(30); // Son 30 gündeki yeni mağazalar
        
        long totalProducts = productService.getProductCount();
        long newProducts = productService.getNewProductCount(30); // Son 30 gündeki yeni ürünler
        
        DashboardStatsDTO stats = new DashboardStatsDTO(
            totalUsers, newUsers, 
            totalOrders, ordersPercentage, 
            totalStores, newStores, 
            totalProducts, newProducts
        );
        
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/store-applications")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<StoreApplicationDTO>> getStoreApplications() {
        // Bekleyen mağaza başvurularını al
        return ResponseEntity.ok(storeService.getPendingStoreApplications());
    }
    
    @PatchMapping("/store-applications/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<StoreApplicationDTO> updateStoreApplication(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        
        String status = request.get("status");
        if (status == null || (!status.equals("approved") && !status.equals("rejected"))) {
            throw new IllegalArgumentException("Durum 'approved' veya 'rejected' olmalıdır");
        }
        
        return ResponseEntity.ok(storeService.updateStoreApplication(id, status));
    }
    
    /**
     * Mağazayı yasakla (ban) ve tüm ürünlerini inactive yap
     */
    @PatchMapping("/stores/{id}/ban")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> banStore(@PathVariable Long id) {
        try {
            // Mağazayı yasakla
            storeService.banStore(id);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mağaza başarıyla yasaklandı ve tüm ürünleri inactive olarak işaretlendi.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mağaza yasaklanırken bir hata oluştu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Mağazayı yasaklı durumdan çıkar (unban) ve ürünlerini tekrar aktif yap
     */
    @PatchMapping("/stores/{id}/unban")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> unbanStore(@PathVariable Long id) {
        try {
            // Önce mağazayı alıp durumunu kontrol et
            Store store = storeRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
            
            // Eğer mağaza zaten "banned" durumunda değilse
            if (!"banned".equals(store.getStatus())) {
                Map<String, String> response = new HashMap<>();
                response.put("message", "Mağaza yasaklı durumda değil.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Mağazayı "approved" durumuna getir
            storeService.updateVerification(id, "approved");
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mağaza yasağı kaldırıldı ve ürünleri tekrar aktifleştirildi.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mağaza yasağı kaldırılırken bir hata oluştu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // ----- Admin Sipariş Yönetimi Endpointleri -----
    
    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<com.example.backend.dto.order.OrderDto>> getAllOrders(
            @RequestParam(required = false) String status) {
        
        List<com.example.backend.dto.order.OrderDto> orders;
        if (status != null && !status.equals("ALL")) {
            // Belirli bir statüdeki siparişleri getir (ileride OrderRepository'de metot eklenecek)
            orders = orderService.getAllOrdersByStatus(status);
        } else {
            // Tüm siparişleri getir
            orders = orderService.getAllOrders();
        }
        
        return ResponseEntity.ok(orders);
    }
    
    @GetMapping("/orders/search")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<com.example.backend.dto.order.OrderDto>> searchOrders(
            @RequestParam String q,
            @RequestParam(required = false) String status) {
        
        List<com.example.backend.dto.order.OrderDto> orders;
        if (status != null && !status.equals("ALL")) {
            // Belirli bir statüde arama (gelecekte implement edilecek)
            orders = orderService.searchOrdersWithStatus(q, status);
        } else {
            // Genel arama
            orders = orderService.searchOrders(q);
        }
        
        return ResponseEntity.ok(orders);
    }
    
    @PatchMapping("/orders/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<com.example.backend.dto.order.OrderDto> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        
        String status = request.get("status");
        if (status == null) {
            throw new IllegalArgumentException("Sipariş durumu belirtilmelidir");
        }
        
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUserById(@PathVariable Long id) {
        Map<String, String> response = new HashMap<>();
        
        try {
            userService.deleteUserByAdmin(id);
            response.put("message", "Kullanıcı başarıyla silindi");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log the exception
            System.err.println("Kullanıcı silme hatası: " + e.getMessage());
            e.printStackTrace();
            
            // Daha detaylı hata yanıtı hazırla
            response.put("message", "Kullanıcı silinirken bir hata oluştu: " + e.getMessage());
            response.put("error", e.getClass().getName());
            
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @DeleteMapping("/orders/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteOrderById(@PathVariable Long id) {
        Map<String, String> response = new HashMap<>();
        
        try {
            orderService.deleteOrder(id);
            response.put("message", "Sipariş başarıyla silindi");
            response.put("status", "success");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log the exception
            System.err.println("Sipariş silme hatası: " + e.getMessage());
            e.printStackTrace();
            
            // Daha detaylı hata yanıtı hazırla
            response.put("message", "Sipariş silinirken bir hata oluştu: " + e.getMessage());
            response.put("status", "error");
            
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Admin için tüm mağazaları (her statüden) getir
     */
    @GetMapping("/stores/all")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<StoreDTO>> getAllStores() {
        // StoreService kullanarak tüm mağazaları getir (statülerinden bağımsız)
        List<Store> stores = storeRepository.findAll();
        // Store nesnelerini StoreDTO'ya dönüştür
        List<StoreDTO> storeDTOs = stores.stream()
                .map(store -> storeService.convertToDTO(store))
                .collect(Collectors.toList());
        return ResponseEntity.ok(storeDTOs);
    }
   
    /**
     * Mağazayı ve ilişkili tüm verileri sil
     */
    @DeleteMapping("/stores/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> deleteStore(@PathVariable Long id) {
        try {
            // Mağazayı ve ilişkili verileri sil
            storeService.deleteStore(id);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mağaza ve ilişkili tüm veriler başarıyla silindi.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mağaza silinirken bir hata oluştu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PatchMapping("/products/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<com.example.backend.model.Product> updateProductStatus(
        @PathVariable Long id, 
        @RequestBody Map<String, String> statusUpdate) {
        
        String status = statusUpdate.get("status");
        if (status == null) {
            throw new IllegalArgumentException("Status değeri gereklidir");
        }
        
        // Durum değeri geçerli mi kontrol et
        if (!status.equals("active") && !status.equals("inactive")) {
            throw new IllegalArgumentException("Status değeri 'active' veya 'inactive' olmalıdır");
        }
        
        // Ürün hizmetini kullanarak durumu güncelle - bu aynı zamanda varyantları da güncelleyecek
        return ResponseEntity.ok(productService.updateStatus(id, status));
    }
    
    /**
     * Mağazayı pasif duruma getir (inactive)
     */
    @PatchMapping("/stores/{id}/set-inactive")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> setStoreInactive(@PathVariable Long id) {
        try {
            // Mağazayı pasif duruma getir - bu, ürünlerini ve varyantlarını da pasif yapacak
            StoreDTO updatedStore = storeService.setStoreInactive(id);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mağaza başarıyla pasif duruma getirildi ve tüm ürünleri ve varyantları devre dışı bırakıldı.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mağaza pasif duruma getirilirken bir hata oluştu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    
    
    /**
     * Mağaza durumunu güncelleyen genel endpoint (approved/rejected/inactive)
     */
    @PatchMapping("/stores/{id}/status")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateStoreStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            if (status == null || (!status.equals("approved") && !status.equals("rejected") && !status.equals("inactive"))) {
                throw new IllegalArgumentException("Durum 'approved', 'rejected' veya 'inactive' olmalıdır");
            }
            
            // Mağaza durumunu güncelle
            StoreDTO updatedStore = storeService.updateVerification(id, status);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mağaza durumu başarıyla '" + status + "' olarak güncellendi.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mağaza durumu güncellenirken bir hata oluştu: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
} 