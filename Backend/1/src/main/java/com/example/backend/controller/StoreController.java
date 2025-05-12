package com.example.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import com.example.backend.dto.StoreCreateDTO;
import com.example.backend.dto.StoreDTO;
import com.example.backend.dto.admin.StoreApplicationDTO;
import com.example.backend.model.Product;
import com.example.backend.model.User;
import com.example.backend.model.Store;
import com.example.backend.security.UserPrincipal;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.ProductService;
import com.example.backend.service.StoreService;
import com.example.backend.util.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StoreController {
    
    private final StoreService storeService;
    private final ProductService productService;
    private final UserRepository userRepository;
    
    // Tüm mağazaları getir - public
    @GetMapping
    public ResponseEntity<List<StoreDTO>> getAllStores() {
        return ResponseEntity.ok(storeService.getAllStores());
    }
    
    // ID'ye göre mağaza getir - public
    @GetMapping("/{id}")
    public ResponseEntity<StoreDTO> getStoreById(@PathVariable Long id, Authentication authentication) {
        StoreDTO store = storeService.getStoreById(id);
        
        // Status kontrolü - normal kullanıcılar sadece approved mağazalara erişebilir
        // Seller veya Admin rolüne sahip kullanıcılar inactive mağazalara da erişebilir
        if (!"approved".equals(store.getStatus())) {
            // Eğer mağaza inactive ve kullanıcı SELLER veya ADMIN ise erişime izin ver
            boolean hasRequiredRole = false;
            
            if (authentication != null && authentication.isAuthenticated()) {
                hasRequiredRole = authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_SELLER") || 
                                     auth.getAuthority().equals("ROLE_ADMIN"));
            }
            
            // Eğer kullanıcı yetkili değilse veya mağaza 'inactive' değilse erişimi engelle
            if (!hasRequiredRole || !"inactive".equals(store.getStatus())) {
            throw new ResourceNotFoundException("Mağaza bulunamadı: " + id);
            }
        }
        
        return ResponseEntity.ok(store);
    }
    
    // Popüler mağazaları getir - public
    @GetMapping("/popular")
    public ResponseEntity<List<StoreDTO>> getPopularStores(
            @RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(storeService.getPopularStores(limit));
    }
    
    // Arama sonuçlarında öne çıkan ürünleri getir - public
    @GetMapping("/search/products/featured")
    public ResponseEntity<List<Product>> getFeaturedProductsForSearch(
            @RequestParam(defaultValue = "8") int limit) {
        List<Product> featuredProducts = productService.getFeaturedProducts();
        // Sonuçları limit ile sınırlandırılıyor
        if (featuredProducts.size() > limit) {
            featuredProducts = featuredProducts.subList(0, limit);
        }
        return ResponseEntity.ok(featuredProducts);
    }
    
    // Mağaza ara - public
    @GetMapping("/search")
    public ResponseEntity<Page<StoreDTO>> searchStores(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        if (q == null || q.trim().isEmpty()) {
            // q parametresi boş ise tüm mağazalar döndürülür
            List<StoreDTO> allStores = storeService.getAllStores();
            // List'i Page'e dönüştürmek için PageImpl kullanıyoruz
            Pageable pageable = PageRequest.of(page, size);
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), allStores.size());
            Page<StoreDTO> storePage = new PageImpl<>(
                allStores.subList(start, end), 
                pageable, 
                allStores.size());
            return ResponseEntity.ok(storePage);
        }
        
        return ResponseEntity.ok(storeService.searchStores(q, page, size));
    }
    
    // Kategoriye göre mağazaları getir - public
    @GetMapping("/category/{category}")
    public ResponseEntity<List<StoreDTO>> getStoresByCategory(@PathVariable String category) {
        return ResponseEntity.ok(storeService.getStoresByCategory(category));
    }
    
    // Ürün kategorisine göre mağazaları getir - public
    @GetMapping("/product-category/{categoryId}")
    public ResponseEntity<List<StoreDTO>> getStoresByProductCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(storeService.getStoresByProductCategory(categoryId));
    }
    
    // Kullanıcıya göre mağazaları getir - kullanıcıya özel
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<List<StoreDTO>> getStoresByOwner(@PathVariable Long userId) {
        return ResponseEntity.ok(storeService.getStoresByOwner(userId));
    }
    
    // Giriş yapmış kullanıcının mağazalarını getir - satıcıya özel
    @GetMapping("/my-stores")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<List<StoreDTO>> getMyStores(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        return ResponseEntity.ok(storeService.getStoresByOwner(userId));
    }
    
    // Yeni mağaza oluştur - sadece satıcı rolü olan kullanıcı
    @PostMapping
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<StoreDTO> createStore(
            @Valid @RequestBody StoreCreateDTO storeDTO,
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        return new ResponseEntity<>(storeService.createStore(storeDTO, userId), HttpStatus.CREATED);
    }
    
    // Mağaza güncelle - satıcıya özel
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<StoreDTO> updateStore(
            @PathVariable Long id,
            @Valid @RequestBody StoreCreateDTO storeDTO,
            Authentication authentication) {
        // Yetki kontrolü ekleyelim (mağaza sahibi veya admin olmalı)
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        // Servis katmanında yetki kontrolü yapılmalı
        return ResponseEntity.ok(storeService.updateStore(id, storeDTO));
    }
    
    // Mağaza doğrulama durumunu güncelle (Sadece admin)
    @PatchMapping("/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StoreDTO> verifyStore(
            @PathVariable Long id,
            @RequestBody Map<String, String> verifyMap) {
        String status = verifyMap.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(storeService.updateVerification(id, status));
    }

    /**
     * Satıcılar için mağaza durumunu güncelleyen endpoint
     */
    @PatchMapping("/{id}/update-status")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<StoreDTO> updateStoreStatusForSeller(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusMap,
            Authentication authentication) {
        
        // Yetki kontrolü - sadece kendi mağazasının durumunu değiştirebilir
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        
        // Mağazayı doğrulama
        StoreDTO store = storeService.getStoreById(id);
        
        // Owner bilgisini kontrol et
        if (store.getOwner() == null || store.getOwner().getId() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        
        Long storeOwnerId = store.getOwner().getId();
        
        // Yetki kontrolü - sadece kendi mağazasını güncelleyebilir
        if (!storeOwnerId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        String status = statusMap.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().build();
        }
        
        // Sadece approved ve inactive değerleri için değişime izin ver
        if (!"approved".equals(status) && !"inactive".equals(status)) {
            return ResponseEntity.badRequest().build();
        }
        
        // Özel bir boolean parametresi ekleyerek email gönderimi engellenir
        boolean sendEmail = false; // Kendisi değiştirdiğinde email gönderme
        
        return ResponseEntity.ok(storeService.updateVerification(id, status, sendEmail));
    }

    // Mağaza sil (Sadece satıcı veya admin)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteStore(
            @PathVariable Long id,
            Authentication authentication) {
        // Yetki kontrolü ekleyelim (mağaza sahibi veya admin olmalı)
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Long userId = userPrincipal.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        // Servis katmanında yetki kontrolü yapılmalı
        storeService.deleteStore(id);
        return ResponseEntity.ok(new ApiResponse(true, "Mağaza başarıyla silindi"));
    }
    
    // Mağaza başvurularını listele (Sadece admin)
    @GetMapping("/applications")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getStoreApplications(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(storeService.getStoreApplicationsByStatus(status));
        }
        return ResponseEntity.ok(storeService.getPendingStoreApplications());
    }

    // Kullanıcının kendi başvurularını getir
    @GetMapping("/applications/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCurrentUserApplications(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Bu işlem için giriş yapmalısınız"));
        }
        
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Long userId = userPrincipal.getId();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
            return ResponseEntity.ok(storeService.getUserStoreApplications(userId));
        } catch (ClassCastException ex) {
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Geçersiz oturum bilgisi"));
        } catch (Exception ex) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse(false, "Mağaza başvuruları getirilemedi: " + ex.getMessage()));
        }
    }

    // Kullanıcının kendi başvurusunu geri çekmesi için endpoint
    @PostMapping("/applications/{id}/withdraw")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> withdrawStoreApplication(
            @PathVariable Long id,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Bu işlem için giriş yapmalısınız"));
        }
        
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Long userId = userPrincipal.getId();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
            
            // Kullanıcının kendi başvurusunu mu iptal ettiğini kontrol et
            Store storeApplication = storeService.verifyApplicationOwnership(id, userId);
            if (storeApplication == null) {
                return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "Bu başvuruyu iptal etme yetkiniz yok"));
            }
            
            // Başvurunun durumunu kontrol et (sadece bekleyen başvurular iptal edilebilir)
            if (!"pending".equals(storeApplication.getStatus())) {
                return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Sadece bekleyen durumdaki başvurular iptal edilebilir"));
            }
            
            // Başvuruyu kullanıcı tarafından iptal et (sendEmail=false parametresi ekle)
            StoreDTO updatedStore = storeService.updateApplicationStatus(id, "withdrawn", false); 
            
            return ResponseEntity.ok(updatedStore);
        } catch (Exception ex) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse(false, "Başvuru iptal edilemedi: " + ex.getMessage()));
        }
    }

    // Satıcı için özel mağaza detay sayfası - inactive dahil tüm mağazaları görebilir
    @GetMapping("/seller/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<StoreDTO> getStoreDetailsForSeller(@PathVariable Long id) {
        StoreDTO store = storeService.getStoreById(id);
        // Burada statüs kontrolü yapmıyoruz - satıcılar tüm durumlardaki mağazaları görebilir
        return ResponseEntity.ok(store);
    }
   
    
    // Yeni mağaza başvurusu oluştur
    @PostMapping("/applications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createStoreApplication(
            @RequestBody Map<String, Object> applicationData,
            Authentication authentication) {
        try {
            // UserPrincipal'dan kullanıcı ID'sini al
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            Long userId = userPrincipal.getId();
            
            // Kullanıcıyı getir
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
            
            // Frontend'den gelen verileri almak
            String name = (String) applicationData.get("name");
            String description = (String) applicationData.get("description");
            String phone = (String) applicationData.get("phone");
            String email = (String) applicationData.get("email");
            String taxNumber = (String) applicationData.get("taxNumber");
            
            // Kategori bilgisini al
            String categoryId = null;
            if(applicationData.containsKey("categoryId")) {
                categoryId = String.valueOf(applicationData.get("categoryId"));
                System.out.println("Kategori ID alındı: " + categoryId);
            }
            
            if (name == null || description == null) {
                return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "İsim ve açıklama alanları zorunludur"));
            }
            
            // StoreApplication'dan StoreCreateDTO'ya dönüştürme
            StoreCreateDTO storeDTO = StoreCreateDTO.builder()
                .name(name)
                .description(description)
                // logo için geçici bir değer atayalım, gerçek uygulamada bir logo URL'si olmalı
                .logo("/assets/images/store/default-logo.png") 
                .contactPhone(phone)
                .contactEmail(email)
                .category(categoryId) // Kategori ID'sini ekle
                .build();
            
            System.out.println("StoreCreateDTO oluşturuldu, kategori: " + storeDTO.getCategory());
            
            // Yeni mağaza "pending" durumunda oluşturulur
            StoreDTO createdStore = storeService.createStore(storeDTO, userId);
            
            // StoreApplicationDTO olarak dönüştür ve dön
            StoreApplicationDTO application = StoreApplicationDTO.builder()
                .id(String.valueOf(createdStore.getId()))
                .name(createdStore.getName())
                .logo(createdStore.getLogo())
                .owner(user.getFullName())
                .date(createdStore.getCreatedAt())
                .status("pending")
                .build();
                
            return new ResponseEntity<>(application, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace(); // Loglama için
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse(false, "Mağaza başvurusu oluşturulamadı: " + e.getMessage()));
        }
    }

    /**
     * Mağaza logo görseli yükleme
     */
    @PostMapping("/{id}/logo")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadLogo(@PathVariable Long id, @RequestParam("logo") MultipartFile file) {
        try {
            // Geçerli mağazayı kontrol et
            StoreDTO storeDTO = storeService.getStoreById(id);
            
            // Dosya adını benzersiz yap
            String fileName = StringUtils.cleanPath(file.getOriginalFilename());
            String uniqueFileName = id + "_logo_" + System.currentTimeMillis() + "_" + fileName;
            
            // Dosya yolu oluştur
            String uploadDir = "uploads/stores/" + id;
            Path uploadPath = Paths.get(uploadDir);
            
            // Klasör yoksa oluştur
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Dosyayı kaydet
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Mağaza nesnesini güncelle
            String logoUrl = "http://localhost:8080/api/files/stores/" + id + "/" + uniqueFileName;
            
            // StoreCreateDTO oluşturup sadece logo alanını güncelleyelim
            StoreCreateDTO storeUpdateDTO = new StoreCreateDTO();
            storeUpdateDTO.setName(storeDTO.getName());
            storeUpdateDTO.setDescription(storeDTO.getDescription());
            storeUpdateDTO.setLogo(logoUrl);
            storeUpdateDTO.setBannerImage(storeDTO.getBannerImage());
            
            storeService.updateStore(id, storeUpdateDTO);
            
            // Yanıt döndür
            Map<String, String> response = new HashMap<>();
            response.put("logoUrl", logoUrl);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Logo yükleme işlemi başarısız: " + e.getMessage());
        }
    }
    
    /**
     * Mağaza banner görseli yükleme
     */
    @PostMapping("/{id}/banner")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadBanner(@PathVariable Long id, @RequestParam("banner") MultipartFile file) {
        try {
            // Geçerli mağazayı kontrol et
            StoreDTO storeDTO = storeService.getStoreById(id);
                
            // Dosya adını benzersiz yap
            String fileName = StringUtils.cleanPath(file.getOriginalFilename());
            String uniqueFileName = id + "_banner_" + System.currentTimeMillis() + "_" + fileName;
            
            // Dosya yolu oluştur
            String uploadDir = "uploads/stores/" + id;
            Path uploadPath = Paths.get(uploadDir);
            
            // Klasör yoksa oluştur
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Dosyayı kaydet
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Mağaza nesnesini güncelle
            String bannerUrl = "http://localhost:8080/api/files/stores/" + id + "/" + uniqueFileName;
            
            // StoreCreateDTO oluşturup sadece banner alanını güncelleyelim
            StoreCreateDTO storeUpdateDTO = new StoreCreateDTO();
            storeUpdateDTO.setName(storeDTO.getName());
            storeUpdateDTO.setDescription(storeDTO.getDescription());
            storeUpdateDTO.setLogo(storeDTO.getLogo());
            storeUpdateDTO.setBannerImage(bannerUrl);
            
            storeService.updateStore(id, storeUpdateDTO);
            
            // Yanıt döndür
            Map<String, String> response = new HashMap<>();
            response.put("bannerUrl", bannerUrl);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Banner yükleme işlemi başarısız: " + e.getMessage());
        }
    }
} 