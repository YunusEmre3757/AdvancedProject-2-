package com.example.backend.service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.StoreCreateDTO;
import com.example.backend.dto.StoreDTO;
import com.example.backend.dto.UserSummaryDTO;
import com.example.backend.dto.admin.StoreApplicationDTO;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.Category;
import com.example.backend.model.Store;
import com.example.backend.model.StoreMajorCategory;
import com.example.backend.model.User;
import com.example.backend.model.Product;
import com.example.backend.model.Review;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.StoreMajorCategoryRepository;
import com.example.backend.repository.StoreRepository;
import com.example.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Optional;
import org.springframework.data.domain.PageImpl;

@Service
@RequiredArgsConstructor
public class StoreService {
    
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final StoreMajorCategoryRepository storeMajorCategoryRepository;
    private final EmailService emailService;
    private final ProductService productService;
    
    // Tüm mağazaları getir
    public List<StoreDTO> getAllStores() {
        // Sadece approved olan mağazaları getir
        List<Store> stores = storeRepository.findByStatus("approved");
        return stores.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    // ID'ye göre mağaza getir
    public StoreDTO getStoreById(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        // Artık statüs kontrolü burada yapmıyoruz, controller'da yapılacak
        // Böylece seller veya admin rolüne sahip kullanıcılar inactive mağazaları görebilir
        
        return convertToDTO(store);
    }
    
    // Popüler mağazaları getir
    public List<StoreDTO> getPopularStores(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        // Sadece onaylı ve aktif mağazaları getir, ama inactive olanları dahil etme
        List<Store> stores = storeRepository.findPopularStores(pageable)
            .stream()
            .filter(store -> "approved".equals(store.getStatus()) && !"inactive".equals(store.getStatus()))
            .collect(Collectors.toList());
        return stores.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    // Mağaza ara
    public Page<StoreDTO> searchStores(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        
        // Improve search by preprocessing query and logging
        String normalizedQuery = query.trim();
        System.out.println("Mağaza arama terimi: " + normalizedQuery);
        System.out.println("Mağaza arama modeli: %" + normalizedQuery + "%");
        System.out.println("Mağaza ve ilgili tablolara join oluşturuldu");
        
        Page<Store> storePage = storeRepository.searchStores(normalizedQuery, pageable);
        System.out.println("Arama koşulları oluşturuldu ve eklendi");
        
        // Filter only approved stores
        List<Store> filteredStores = storePage.getContent().stream()
            .filter(store -> "approved".equals(store.getStatus()))
            .collect(Collectors.toList());
        
        System.out.println("Toplam mağaza sayısı: " + storePage.getTotalElements());
        System.out.println("Filtrelenen mağaza sayısı: " + filteredStores.size());
        
        List<StoreDTO> dtos = filteredStores.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        
        System.out.println("Arama sonuçları döndü. Toplam mağaza sayısı: " + dtos.size());
        if (dtos.isEmpty()) {
            System.out.println("Aranan terim için mağaza bulunamadı: " + normalizedQuery);
        }
        
        // Return processed results
        return new PageImpl<>(dtos, pageable, filteredStores.size());
    }
    
    // Kategoriye göre mağazaları getir
    public List<StoreDTO> getStoresByCategory(String category) {
        List<Store> stores = storeRepository.findByCategory(category);
        // Sadece onaylı ve aktif mağazaları filtrele
        stores = stores.stream()
            .filter(store -> "approved".equals(store.getStatus()) && !"inactive".equals(store.getStatus()))
            .collect(Collectors.toList());
        return stores.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    // Ürün kategorisine göre mağazaları getir
    public List<StoreDTO> getStoresByProductCategory(Long categoryId) {
        List<Store> stores = storeRepository.findByProductCategoryId(categoryId);
        // Sadece onaylı ve aktif mağazaları filtrele
        stores = stores.stream()
            .filter(store -> "approved".equals(store.getStatus()) && !"inactive".equals(store.getStatus()))
            .collect(Collectors.toList());
        return stores.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    
    // Kullanıcıya göre mağazaları getir
    public List<StoreDTO> getStoresByOwner(Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        List<Store> stores = storeRepository.findByOwner(owner);
        return stores.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    // Yeni mağaza oluştur
    @Transactional
    public StoreDTO createStore(StoreCreateDTO storeDTO, Long userId) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        
        // Create and save the store
        Store store = Store.builder()
                .name(storeDTO.getName())
                .description(storeDTO.getDescription())
                .logo(storeDTO.getLogo())
                .bannerImage(storeDTO.getBannerImage())
                .status("pending")
                .followers(0)
                .productsCount(0)
                .address(storeDTO.getAddress())
                .contactEmail(storeDTO.getContactEmail())
                .contactPhone(storeDTO.getContactPhone())
                .website(storeDTO.getWebsite())
                .facebook(storeDTO.getFacebook())
                .instagram(storeDTO.getInstagram())
                .twitter(storeDTO.getTwitter())
                .categories(storeDTO.getCategories()) // Keep for backward compatibility
                .owner(owner)
                .build();
        
        Store savedStore = storeRepository.save(store);
        
        // Add the major category if provided
        if (storeDTO.getCategory() != null && !storeDTO.getCategory().isEmpty()) {
            try {
                // Parse the category ID 
                Long categoryId = Long.parseLong(storeDTO.getCategory());
                
                // Find the category
                Category category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new ResourceNotFoundException("Kategori bulunamadı: " + categoryId));
                
                // Create the store major category association
                StoreMajorCategory storeMajorCategory = StoreMajorCategory.builder()
                        .store(savedStore)
                        .category(category)
                        .build();
                
                storeMajorCategoryRepository.save(storeMajorCategory);
            } catch (NumberFormatException e) {
                System.err.println("Kategori ID çevrilemedi: " + storeDTO.getCategory());
                // Log error but don't fail the store creation
            }
        }
        
        return convertToDTO(savedStore);
    }
    
    // Mağaza güncelle
    @Transactional
    public StoreDTO updateStore(Long id, StoreCreateDTO storeDTO) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        store.setName(storeDTO.getName());
        store.setDescription(storeDTO.getDescription());
        store.setLogo(storeDTO.getLogo());
        store.setBannerImage(storeDTO.getBannerImage());
        store.setAddress(storeDTO.getAddress());
        store.setContactEmail(storeDTO.getContactEmail());
        store.setContactPhone(storeDTO.getContactPhone());
        store.setWebsite(storeDTO.getWebsite());
        store.setFacebook(storeDTO.getFacebook());
        store.setInstagram(storeDTO.getInstagram());
        store.setTwitter(storeDTO.getTwitter());
        store.setCategories(storeDTO.getCategories()); // Keep for backward compatibility
        
        Store updatedStore = storeRepository.save(store);
        
        // Update the major category if provided
        if (storeDTO.getCategory() != null && !storeDTO.getCategory().isEmpty()) {
            try {
                // Parse the category ID
                Long categoryId = Long.parseLong(storeDTO.getCategory());
                
                // Find the category
                Category category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new ResourceNotFoundException("Kategori bulunamadı: " + categoryId));
                
                // Check if store already has a major category
                Optional<StoreMajorCategory> existingMajorCategory = storeMajorCategoryRepository.findByStore(updatedStore);
                
                if (existingMajorCategory.isPresent()) {
                    // Update the existing association
                    StoreMajorCategory majorCategory = existingMajorCategory.get();
                    majorCategory.setCategory(category);
                    storeMajorCategoryRepository.save(majorCategory);
                } else {
                    // Create a new association
                    StoreMajorCategory newMajorCategory = StoreMajorCategory.builder()
                            .store(updatedStore)
                            .category(category)
                            .build();
                    storeMajorCategoryRepository.save(newMajorCategory);
                }
            } catch (NumberFormatException e) {
                System.err.println("Kategori ID çevrilemedi: " + storeDTO.getCategory());
                // Log error but don't fail the store update
            }
        }
        
        return convertToDTO(updatedStore);
    }
    
    // Mağaza doğrulama durumunu güncelle
    @Transactional
    public StoreDTO updateVerification(Long id, String status) {
        return updateVerification(id, status, true); // Varsayılan olarak email gönder
    }
    
    // Mağaza doğrulama durumunu güncelle (email gönderimi kontrolü ile)
    @Transactional
    public StoreDTO updateVerification(Long id, String status, boolean sendEmail) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        String oldStatus = store.getStatus();
        store.setStatus(status);
        Store updatedStore = storeRepository.save(store);
        
        // Durum değişikliğinin ürünlere ve varyantlara yansıması
        updateProductsBasedOnStoreStatus(store, oldStatus, status);
        
        // Mağaza onaylandıysa ve daha önce onaylı değilse kullanıcıya SELLER rolü ekle
        if ("approved".equals(status) && !"approved".equals(oldStatus)) {
            User owner = store.getOwner();
            if (owner != null) {
                // Kullanıcının rollerini kontrol et
                if (!owner.getRoles().contains("SELLER")) {
                    // SELLER rolünü ekle
                    owner.getRoles().add("SELLER");
                    userRepository.save(owner);
                    System.out.println("Kullanıcıya SELLER rolü eklendi: " + owner.getEmail());
                }
            }
        }
        
        // sendEmail parametresi true ise email gönder
        if (sendEmail && store.getOwner() != null && store.getOwner().getEmail() != null) {
            try {
                String ownerEmail = store.getOwner().getEmail();
                String ownerName = store.getOwner().getFullName();
                String storeName = store.getName();
                
                if ("approved".equals(status) && "banned".equals(oldStatus)) {
                    // Yasağı kaldırıldıysa
                    emailService.sendStoreUnbanEmail(ownerEmail, ownerName, storeName);
                } else if ("approved".equals(status)) {
                    // Normal onay
                    emailService.sendStoreApprovalEmail(ownerEmail, ownerName, storeName);
                } else if ("rejected".equals(status)) {
                    // Red
                    emailService.sendStoreRejectionEmail(ownerEmail, ownerName, storeName);
                }
            } catch (Exception e) {
                // E-posta gönderiminde hata olursa loglayıp devam et
                System.err.println("Mağaza durum e-postası gönderilemedi: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(updatedStore);
    }
    
    /**
     * Mağazayı yasakla (ban) ve tüm ürünlerini inactive yap
     */
    @Transactional
    public StoreDTO banStore(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        String oldStatus = store.getStatus();
        store.setStatus("banned");
        Store updatedStore = storeRepository.save(store);
        
        // Tüm ürünleri inactive yap
        updateProductsBasedOnStoreStatus(store, oldStatus, "banned");
        
        // Mağaza sahibine e-posta gönder
        if (store.getOwner() != null && store.getOwner().getEmail() != null) {
            try {
                String ownerEmail = store.getOwner().getEmail();
                String ownerName = store.getOwner().getFullName();
                String storeName = store.getName();
                
                emailService.sendStoreBanEmail(ownerEmail, ownerName, storeName);
            } catch (Exception e) {
                // E-posta gönderiminde hata olursa loglayıp devam et
                System.err.println("Mağaza ban e-postası gönderilemedi: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(updatedStore);
    }
    
    /**
     * Mağazayı pasif duruma getir (inactive)
     */
    @Transactional
    public StoreDTO setStoreInactive(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        String oldStatus = store.getStatus();
        store.setStatus("inactive");
        Store updatedStore = storeRepository.save(store);
        
        // Tüm ürünleri inactive yap
        updateProductsBasedOnStoreStatus(store, oldStatus, "inactive");
        
        
        return convertToDTO(updatedStore);
    }
    
    /**
     * Mağaza durumuna bağlı olarak ürünlerin ve varyantların durumunu güncelle
     */
    private void updateProductsBasedOnStoreStatus(Store store, String oldStatus, String newStatus) {
        // Mağaza yasaklandı, pasif veya reddedildi ise tüm ürünleri inactive yap
        if ("banned".equals(newStatus) || "rejected".equals(newStatus) || "inactive".equals(newStatus)) {
            productService.deactivateAllProductsByStore(store.getId());
        }
        // Mağaza onaylandı ise ve daha önce yasaklı, pasif veya reddedilmiş ise ürünleri active yap
        else if ("approved".equals(newStatus) && 
                ("banned".equals(oldStatus) || "rejected".equals(oldStatus) || "inactive".equals(oldStatus))) {
            productService.activateAllProductsByStore(store.getId());
            // Ayrıca tüm ürün varyantlarını da aktive et
            productService.activateAllProductVariantsByStore(store.getId());
        }
    }
    
    // Mağaza sil
    @Transactional
    public void deleteStore(Long id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        try {
            // Delete any major category association first
            storeMajorCategoryRepository.deleteByStore(store);
            
            // Önce mağazanın ürünlerini almak için gerekli işlemleri yapıyoruz
            List<Product> products = new ArrayList<>(store.getProducts());
            
            System.out.println("Mağaza silinirken ilişkili veriler temizleniyor. Mağaza ID: " + id);
            System.out.println("Temizlenecek ürün sayısı: " + (products != null ? products.size() : 0));
            
            // Mağaza ile ürünler arasındaki bağlantıyı kaldır
            // Bu önemli, çünkü cascade olmadan önce ilişkileri koparmalıyız
            store.getProducts().clear();
            
            // Ürünlerle ilgili ilişkileri temizle
            if (products != null && !products.isEmpty()) {
                for (Product product : products) {
                    System.out.println("Ürün ID'si: " + product.getId() + " ilişkili verileri temizleniyor");
                    
                    // Ürünün store referansını null yap
                    product.setStore(null);
                    
                    // Ürünün yorumlarını temizle
                    if (product.getReviews() != null && !product.getReviews().isEmpty()) {
                        System.out.println("Ürün ID'si: " + product.getId() + " için " + product.getReviews().size() + " yorum temizleniyor");
                        
                        // Her bir yorum için ilişkili helpful işaretlerini temizle
                        for (Review review : product.getReviews()) {
                            if (review.getHelpfulMarks() != null) {
                                review.getHelpfulMarks().clear();
                            }
                        }
                        
                        // Yorumları temizle
                        product.getReviews().clear();
                    }
                    
                    // Ürünün varyant ilişkilerini temizle
                    if (product.getVariants() != null) {
                        product.getVariants().clear();
                    }
                    
                    // Ürünün öznitelik ilişkilerini temizle
                    if (product.getAttributes() != null) {
                        product.getAttributes().clear();
                    }
                    
                    // Ürünün öznitelik değer ilişkilerini temizle
                    if (product.getAttributeValues() != null) {
                        product.getAttributeValues().clear();
                    }
                    
                    // Her ürünü veritabanından sil
                    // Bu şekilde mağaza ile ürün arasındaki ilişki kırılmış olur
                    productService.deleteProduct(product.getId());
                }
            }
            
            // Mağazayı sil 
            storeRepository.delete(store);
            System.out.println("Mağaza başarıyla silindi: " + id);
        } catch (Exception e) {
            System.err.println("Mağaza silinirken hata oluştu: " + e.getMessage());
            e.printStackTrace();
            throw e; // Hatayı yeniden fırlat
        }
    }
    
    // Store -> StoreDTO dönüşümü
    public StoreDTO convertToDTO(Store store) {
        if (store == null) return null;
        
        // Create the base DTO
        StoreDTO.StoreDTOBuilder builder = StoreDTO.builder()
                .id(store.getId())
                .name(store.getName())
                .description(store.getDescription())
                .logo(store.getLogo())
                .bannerImage(store.getBannerImage())
                .rating(store.getRating())
                .status(store.getStatus())
                .followers(store.getFollowers())
                .productsCount(store.getProductsCount())
                .address(store.getAddress())
                .contactEmail(store.getContactEmail())
                .contactPhone(store.getContactPhone())
                .website(store.getWebsite())
                .facebook(store.getFacebook())
                .instagram(store.getInstagram())
                .twitter(store.getTwitter())
                .categories(store.getCategories()) // Keep existing categories
                .owner(store.getOwner() != null ? convertToUserSummaryDTO(store.getOwner()) : null)
                .createdAt(store.getCreatedAt())
                .updatedAt(store.getUpdatedAt());
        
        // Check if the store has a major category and include its information in categories if needed
        storeMajorCategoryRepository.findByStore(store).ifPresent(majorCategory -> {
            Category category = majorCategory.getCategory();
            if (category != null && store.getCategories() != null && !store.getCategories().contains(category.getName())) {
                List<String> updatedCategories = new ArrayList<>(store.getCategories() != null ? store.getCategories() : new ArrayList<>());
                updatedCategories.add(category.getName());
                builder.categories(updatedCategories);
            }
        });
        
        return builder.build();
    }
    
    // User -> UserSummaryDTO dönüşümü
    private UserSummaryDTO convertToUserSummaryDTO(User user) {
        return UserSummaryDTO.builder()
                .id(user.getId())
                .username(user.getEmail())
                .fullName((user.getName() != null ? user.getName() : "") + " " + 
                         (user.getSurname() != null ? user.getSurname() : ""))
                .email(user.getEmail())
                .profileImage(null)
                .build();
    }
    
    /**
     * Toplam mağaza sayısını döndürür
     */
    public long getStoreCount() {
        return storeRepository.count();
    }
    
    /**
     * Belirtilen gün sayısı içinde açılan yeni mağaza sayısını döndürür
     */
    public long getNewStoreCount(int days) {
        LocalDateTime daysAgo = LocalDateTime.now().minusDays(days);
        return storeRepository.countByCreatedAtAfter(daysAgo);
    }
    
    /**
     * Bekleyen mağaza başvurularını döndürür
     */
    public List<StoreApplicationDTO> getPendingStoreApplications() {
        // Sadece "pending" durumundaki mağazaları getir
        List<Store> stores = storeRepository.findByStatus("pending");
        
        return stores.stream().map(store -> 
            StoreApplicationDTO.builder()
                .id(String.valueOf(store.getId()))
                .name(store.getName())
                .logo(store.getLogo())
                .owner(store.getOwner() != null ? store.getOwner().getFullName() : "")
                .date(store.getCreatedAt())
                .status(store.getStatus())
                .build()
        ).collect(Collectors.toList());
    }
    
    /**
     * Mağaza başvurusunu günceller (onaylar veya reddeder)
     */
    public StoreApplicationDTO updateStoreApplication(String id, String status) {
        Long storeId = Long.parseLong(id);
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + id));
        
        // Status değeri "approved" veya "rejected" olabilir
        String oldStatus = store.getStatus();
        store.setStatus(status);
        storeRepository.save(store);
        
        // Mağaza onaylandıysa kullanıcıya SELLER rolü ekle
        if ("approved".equals(status) && !"approved".equals(oldStatus)) {
            User owner = store.getOwner();
            if (owner != null) {
                if (!owner.getRoles().contains("SELLER")) {
                    owner.getRoles().add("SELLER");
                    userRepository.save(owner);
                    System.out.println("Kullanıcıya SELLER rolü eklendi: " + owner.getEmail());
                }
            }
        }
        
        // Mağaza sahibine e-posta gönder
        if (store.getOwner() != null && store.getOwner().getEmail() != null) {
            try {
                String ownerEmail = store.getOwner().getEmail();
                String ownerName = store.getOwner().getFullName();
                String storeName = store.getName();
                
                if ("approved".equals(status)) {
                    emailService.sendStoreApprovalEmail(ownerEmail, ownerName, storeName);
                } else if ("rejected".equals(status)) {
                    emailService.sendStoreRejectionEmail(ownerEmail, ownerName, storeName);
                }
            } catch (Exception e) {
                // E-posta gönderiminde hata olursa, işlemi durdurmak yerine loglayarak devam et
                System.err.println("Mağaza durumu e-postası gönderilemedi: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return StoreApplicationDTO.builder()
                .id(String.valueOf(store.getId()))
                .name(store.getName())
                .logo(store.getLogo())
                .owner(store.getOwner() != null ? store.getOwner().getFullName() : "")
                .date(store.getCreatedAt())
                .status(status)
                .build();
    }
    
    /**
     * Duruma göre mağaza başvurularını döndürür (onaylanmış, reddedilmiş veya bekleyen)
     */
    public List<StoreApplicationDTO> getStoreApplicationsByStatus(String status) {
        List<Store> stores;
        
        if ("approved".equalsIgnoreCase(status)) {
            stores = storeRepository.findByStatus("approved");
        } else if ("rejected".equalsIgnoreCase(status)) {
            stores = storeRepository.findByStatus("rejected");
        } else if ("pending".equalsIgnoreCase(status)) {
            stores = storeRepository.findByStatus("pending");
        } else {
            // Varsayılan olarak tüm başvuruları gösterelim
            stores = storeRepository.findTop10ByOrderByCreatedAtDesc();
        }
        
        return stores.stream().map(store -> 
            StoreApplicationDTO.builder()
                .id(String.valueOf(store.getId()))
                .name(store.getName())
                .logo(store.getLogo())
                .owner(store.getOwner() != null ? store.getOwner().getFullName() : "")
                .date(store.getCreatedAt())
                .status(store.getStatus())
                .build()
        ).collect(Collectors.toList());
    }
    
    /**
     * Belirli bir kullanıcının mağaza başvurularını döndürür
     */
    public List<StoreApplicationDTO> getUserStoreApplications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
        
        List<Store> userStores = storeRepository.findByOwner(user);
        
        return userStores.stream()
                .map(store -> StoreApplicationDTO.builder()
                        .id(String.valueOf(store.getId()))
                        .name(store.getName())
                        .logo(store.getLogo())
                        .owner(user.getFullName())
                        .date(store.getCreatedAt())
                        .status(store.getStatus())
                        .build())
                .collect(Collectors.toList());
    }
    
    // Başvurunun kullanıcıya ait olup olmadığını doğrula
    public Store verifyApplicationOwnership(Long applicationId, Long userId) {
        Store store = storeRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Mağaza başvurusu bulunamadı: " + applicationId));
                
        // Başvurunun sahibi bu kullanıcı mı kontrol et
        if (store.getOwner() == null || !store.getOwner().getId().equals(userId)) {
            return null; // Başvuru bu kullanıcıya ait değil
        }
        
        return store;
    }
    
    // Başvuru durumunu güncelle - email gönderim kontrolü ile
    @Transactional
    public StoreDTO updateApplicationStatus(Long id, String status, boolean sendEmail) {
        return updateVerification(id, status, sendEmail);
    }
} 