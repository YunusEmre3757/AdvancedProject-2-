package com.example.backend.service;

import com.example.backend.dto.auth.AuthResponse;
import com.example.backend.dto.auth.RegisterRequest;
import com.example.backend.dto.user.EmailVerificationRequest;
import com.example.backend.dto.user.UpdateProfileRequest;
import com.example.backend.dto.user.UserResponse;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.dto.address.AddressResponse;
import com.example.backend.model.User;
import com.example.backend.model.DeletedUser;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.DeletedUserRepository;
import com.example.backend.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.ArrayList;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final DeletedUserRepository deletedUserRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService, DeletedUserRepository deletedUserRepository, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.deletedUserRepository = deletedUserRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public User registerUser(RegisterRequest registerRequest) {
        // Normal kullanıcı tablosunda email kontrolü
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        // Silinmiş kullanıcılarda email kontrolü (opsiyonel)
        if (deletedUserRepository.existsByOriginalEmail(registerRequest.getEmail())) {
            // Burada sadece log tutabilir veya istatistik için kullanabilirsiniz
            // Genellikle kullanımını engellemek istemeyiz
            System.out.println("Bu e-posta adresi daha önce silinen bir hesapta kullanılmış: " + registerRequest.getEmail());
        }

        // Create new user entity
        User user = new User();
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setName(registerRequest.getName());
        user.setSurname(registerRequest.getSurname());
        user.setGender(registerRequest.getGender());
        user.setBirthDate(registerRequest.getBirthDate());
        user.setActive(true); // Default to active
        user.setRoles(Collections.singleton("USER")); // Default role

        return userRepository.save(user);
    }

    public AuthResponse buildUserResponse(User user) {
        return AuthResponse.builder()
                .accessToken(null) // To be set by calling service
                .refreshToken(null) // To be set by calling service
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    public UserResponse getUserByEmail(String email) {
        User user = findUserByEmail(email);
        return mapUserToUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findUserByEmail(email);
        
        // Update basic info
        user.setName(request.getName());
        user.setSurname(request.getSurname());
        
        // Format telefon numarası
        if (request.getPhoneNumber() != null) {
            String formattedPhoneNumber = formatPhoneNumber(request.getPhoneNumber());
            user.setPhoneNumber(formattedPhoneNumber);
        } else {
            user.setPhoneNumber(null);
        }
        
        // Only update email if it's changed and verified
        if (!email.equals(request.getEmail())) {
            // Email change requires verification, handled separately
        }
        
        // Update other fields if provided
        if (request.getBirthDate() != null) {
            user.setBirthDate(java.time.LocalDate.ofEpochDay(request.getBirthDate().getTime() / (24 * 60 * 60 * 1000)));
        }
        
        if (request.getGender() != null) {
            user.setGender(request.getGender().toString());
        }
        
        // Save changes
        User updatedUser = userRepository.save(user);
        return mapUserToUserResponse(updatedUser);
    }

    /**
     * Telefon numarasını temizler ve standart formata getirir
     * @param phoneNumber Orjinal telefon numarası
     * @return Formatlanmış telefon numarası
     */
    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }
        
        // Sadece rakamları al
        String digitsOnly = phoneNumber.replaceAll("\\D", "");
        
        // 10 veya 11 rakam olmalı (başında 0 olabilir veya olmayabilir)
        if (digitsOnly.length() == 10 && !digitsOnly.startsWith("0")) {
            digitsOnly = "0" + digitsOnly;
        } else if (digitsOnly.length() != 11) {
            // Geçerli format değilse orijinal numarayı döndür
            return phoneNumber;
        }
        
        // 11 rakam varsa "05XXXXXXXXX" formatında olmalı
        if (!digitsOnly.startsWith("05")) {
            return phoneNumber; // Geçerli format değilse orijinal numarayı döndür
        }
        
        return digitsOnly;
    }

    public void sendVerificationEmail(EmailVerificationRequest request) {
        User user = findUserByEmail(request.getCurrentEmail());
        
        // Yeni e-posta adresi belirtilmişse ve bu bir "new" type doğrulama ise
        if ("new".equalsIgnoreCase(request.getType()) && request.getNewEmail() != null) {
            // Yeni e-posta adresi zaten sistemde var mı kontrol et
            if (userRepository.existsByEmail(request.getNewEmail())) {
                throw new RuntimeException("Bu e-posta adresi zaten başka bir hesapta kullanılmaktadır.");
            }
            user.setNewEmail(request.getNewEmail());
        }
        
        // Generate a verification code (6 digits)
        String verificationCode = generateVerificationCode();
        
        // Store the verification code
        user.setEmailVerificationToken(verificationCode);
        user.setEmailVerificationTokenExpiry(LocalDateTime.now().plusMinutes(30)); // Valid for 30 minutes
        
        userRepository.save(user);
        
        // Send verification email
        String emailTo = "current".equalsIgnoreCase(request.getType()) 
            ? request.getCurrentEmail() 
            : request.getNewEmail();
            
        // Gerçek e-posta gönderimi için emailService.sendVerificationEmail kullanın
        // Test/geliştirme ortamı için mock metodu kullanılabilir
        try {
            // Canlı ortamda bu satırı aktif edin
            emailService.sendVerificationEmail(emailTo, verificationCode);
            
            // Şimdilik mock metodunu kullanıyoruz (gerçek e-posta göndermez)
            // emailService.sendVerificationEmailMock(emailTo, verificationCode);
        } catch (Exception e) {
            // E-posta gönderim hatası olursa
            throw new RuntimeException("E-posta gönderilirken bir hata oluştu: " + e.getMessage());
        }
    }

    @Transactional
    public UserResponse confirmEmailChange(String newEmail, String verificationCode) {
        // Find user by verification code and new email
        User user = userRepository.findByEmailVerificationTokenAndNewEmail(verificationCode, newEmail)
            .orElseThrow(() -> new RuntimeException("Invalid or expired verification code"));
        
        // Verify that the code is not expired
        if (user.getEmailVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Verification code expired");
        }
        
        // Update email
        user.setEmail(newEmail);
        user.setNewEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
        user.setEmailVerified(true);
        
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }

    @Transactional
    public void logoutFromAllDevices(String email) {
        User user = findUserByEmail(email);
        
        // Increment token version to invalidate all existing tokens
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));
        
        // Save user information to deletedUser table
        DeletedUser deletedUser = new DeletedUser();
        deletedUser.setOriginalUserId(user.getId());
        deletedUser.setOriginalEmail(user.getEmail());
        deletedUser.setDeletedAt(LocalDateTime.now());
        deletedUser.setDeletedBy("USER"); // User initiated deletion
        
        deletedUserRepository.save(deletedUser);
        
        // Delete all refresh tokens associated with the user first
        refreshTokenRepository.deleteByUserId(userId);
        
        // Then delete the user
        userRepository.delete(user);
    }
    
    @Transactional
    public void deleteAccount(String email) {
        User user = findUserByEmail(email);
        deleteAccount(user.getId());
    }
    
    // Helper methods
    private UserResponse mapUserToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .surname(user.getSurname())
                .phoneNumber(user.getPhoneNumber())
                .gender(user.getGender() != null && !user.getGender().isEmpty() 
                    ? com.example.backend.model.Gender.valueOf(user.getGender()) 
                    : null)
                .roles(user.getRoles().stream().collect(Collectors.toList()))
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt()) // Use the actual creation date from the database
                .updatedAt(user.getCreatedAt()) // Use the creation date since updatedAt isn't available
                .build();
    }
    
    private String generateVerificationCode() {
        // Generate a random 6-digit code
        return String.format("%06d", (int) (Math.random() * 1000000));
    }

    /**
     * Kullanıcıları sayfalı olarak listeler
     * @param pageable Sayfalama parametreleri
     * @return Kullanıcı listesi
     */
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        return users.map(this::mapUserToUserResponse);
    }
    
    /**
     * Kullanıcıları e-posta veya isim ile arar
     * @param query Arama sorgusu
     * @param pageable Sayfalama parametreleri
     * @return Eşleşen kullanıcı listesi
     */
    public Page<UserResponse> searchUsers(String query, Pageable pageable) {
        if (query == null || query.trim().isEmpty()) {
            return getAllUsers(pageable);
        }
        
        // E-posta veya isim içindeki sorguya göre arama yapar
        String searchTerm = "%" + query.toLowerCase() + "%";
        Page<User> users = userRepository.findByEmailLikeIgnoreCaseOrNameLikeIgnoreCaseOrSurnameLikeIgnoreCase(
            searchTerm, searchTerm, searchTerm, pageable);
        
        return users.map(this::mapUserToUserResponse);
    }
    
    /**
     * Kullanıcıya ADMIN rolü ekler
     * @param email Kullanıcı e-posta adresi
     * @return Güncellenmiş kullanıcı bilgileri
     */
    @Transactional
    public UserResponse addAdminRole(String email) {
        User user = findUserByEmail(email);
        
        // Zaten admin ise işlem yapma
        if (user.getRoles().contains("ADMIN")) {
            return mapUserToUserResponse(user);
        }
        
        // ADMIN rolünü ekle
        user.getRoles().add("ADMIN");
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }
    
    /**
     * Kullanıcıdan ADMIN rolünü kaldırır
     * @param email Kullanıcı e-posta adresi
     * @return Güncellenmiş kullanıcı bilgileri
     */
    @Transactional
    public UserResponse removeAdminRole(String email) {
        User user = findUserByEmail(email);
        
        // Admin değilse işlem yapma
        if (!user.getRoles().contains("ADMIN")) {
            return mapUserToUserResponse(user);
        }
        
        // ADMIN rolünü kaldır
        user.getRoles().remove("ADMIN");
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }

    /**
     * Kullanıcıya SELLER rolü ekler
     * @param email Kullanıcı e-posta adresi
     * @return Güncellenmiş kullanıcı bilgileri
     */
    @Transactional
    public UserResponse addSellerRole(String email) {
        User user = findUserByEmail(email);
        
        // Zaten satıcı ise işlem yapma
        if (user.getRoles().contains("SELLER")) {
            return mapUserToUserResponse(user);
        }
        
        // SELLER rolünü ekle
        user.getRoles().add("SELLER");
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }
    
    /**
     * Kullanıcıdan SELLER rolünü kaldırır
     * @param email Kullanıcı e-posta adresi
     * @return Güncellenmiş kullanıcı bilgileri
     */
    @Transactional
    public UserResponse removeSellerRole(String email) {
        User user = findUserByEmail(email);
        
        // Satıcı değilse işlem yapma
        if (!user.getRoles().contains("SELLER")) {
            return mapUserToUserResponse(user);
        }
        
        // SELLER rolünü kaldır
        user.getRoles().remove("SELLER");
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }

    /**
     * Toplam kullanıcı sayısını döndürür
     */
    public long getUserCount() {
        return userRepository.count();
    }
    
    /**
     * Belirtilen gün sayısı içinde kaydolan yeni kullanıcı sayısını döndürür
     */
    public long getNewUserCount(int days) {
        LocalDateTime daysAgo = LocalDateTime.now().minusDays(days);
        return userRepository.countByCreatedAtAfter(daysAgo);
    }

    /**
     * Kullanıcıyı ID'sine göre getir
     * @param id Kullanıcı ID
     * @return Kullanıcı detayları
     */
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("ID'ye göre kullanıcı bulunamadı: " + id));
        return mapUserToUserResponse(user);
    }
    
    /**
     * Kullanıcının durumunu değiştir (aktif/pasif)
     * @param email Kullanıcı e-posta
     * @param isActive Yeni durum (true=aktif, false=pasif)
     * @return Güncellenmiş kullanıcı bilgileri
     */
    @Transactional
    public UserResponse toggleUserStatus(String email, Boolean isActive) {
        User user = findUserByEmail(email);
        
        // Durumu güncelle
        user.setActive(isActive);
        
        // Kaydet
        User updatedUser = userRepository.save(user);
        
        return mapUserToUserResponse(updatedUser);
    }

    /**
     * Admin tarafından kullanıcıyı siler ve ilişkili kayıtları temizler
     * @param userId Silinecek kullanıcının ID'si
     */
    @Transactional(noRollbackFor = Exception.class)
    public void deleteUserByAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));
        
        log.info("Deleting user with ID: {} and email: {}", userId, user.getEmail());
        
        // 1. İlişkili verileri temizlemeyi dene
        try {
            // Kullanıcı silinmeden önce silinme kaydı oluştur
            DeletedUser deletedUser = new DeletedUser();
            deletedUser.setOriginalUserId(user.getId());
            deletedUser.setOriginalEmail(user.getEmail());
            deletedUser.setDeletedAt(LocalDateTime.now());
            deletedUser.setDeletedBy("ADMIN"); // Admin tarafından silindi
            
            // Kaydı şimdi ekle
            log.info("Saving deleted user record for user ID: {}", userId);
            deletedUserRepository.save(deletedUser);
        } catch (Exception e) {
            log.error("Error saving deleted user record: {}", e.getMessage());
            // Devam et, kritik değil
        }
        
        // Farklı adımları ayrı try-catch bloklarında işle - böylece bir adım başarısız olsa bile diğerlerini deneyebiliriz
        
        // 2. Refresh tokenları sil (en kritik bağımlılık)
        try {
            log.info("Deleting refresh tokens for user ID: {}", userId);
            refreshTokenRepository.deleteByUserId(userId);
        } catch (Exception e) {
            log.error("Error deleting refresh tokens: {}", e.getMessage());
        }
        
        // 3. Manuel olarak kullanıcı rollerini sil
        try {
            log.info("Deleting user roles for user ID: {}", userId);
            entityManager.createNativeQuery("DELETE FROM user_roles WHERE user_id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
        } catch (Exception e) {
            log.error("Error deleting user roles: {}", e.getMessage());
        }
        
        // 4. Sipariş kalemlerini ve siparişleri yönet
        try {
            // Siparişleri bulalım ve kalemlerden başlayalım
            List<Long> orderIds = entityManager.createQuery(
                "SELECT o.id FROM Order o WHERE o.user.id = :userId", Long.class)
                .setParameter("userId", userId)
                .getResultList();
            
            log.info("Found {} orders for user ID: {}", orderIds.size(), userId);
            
            if (!orderIds.isEmpty()) {
                // Sipariş kalemlerini silelim
                for (Long orderId : orderIds) {
                    try {
                        entityManager.createNativeQuery(
                            "DELETE FROM order_items WHERE order_id = :orderId")
                            .setParameter("orderId", orderId)
                            .executeUpdate();
                        log.info("Deleted order items for order ID: {}", orderId);
                    } catch (Exception e) {
                        log.error("Error deleting order items for order ID {}: {}", orderId, e.getMessage());
                    }
                }
                
                // Şimdi siparişleri silelim
                try {
                    entityManager.createNativeQuery(
                        "DELETE FROM orders WHERE user_id = :userId")
                        .setParameter("userId", userId)
                        .executeUpdate();
                    log.info("Deleted orders for user ID: {}", userId);
                } catch (Exception e) {
                    log.error("Error deleting orders: {}", e.getMessage());
                    
                    // Son çare: Siparişleri kullanıcıdan ayırma
                    try {
                        // Sistem kullanıcısı (ID=-999) oluştur veya kullan
                        entityManager.createNativeQuery(
                            "INSERT IGNORE INTO users (id, email, password, name, created_at, is_active) " +
                            "VALUES (-999, 'deleted-user@system.local', 'deleted', 'Deleted User', NOW(), 0)")
                            .executeUpdate();
                        
                        // Siparişleri sistem kullanıcısına ata
                        entityManager.createNativeQuery(
                            "UPDATE orders SET user_id = -999 WHERE user_id = :userId")
                            .setParameter("userId", userId)
                            .executeUpdate();
                        log.info("Moved orders to system user (ID=-999)");
                    } catch (Exception ex) {
                        log.error("Final error dealing with orders: {}", ex.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error handling orders: {}", e.getMessage());
        }
        
        // 5. Adresleri sil
        try {
            log.info("Deleting addresses for user ID: {}", userId);
            entityManager.createNativeQuery("DELETE FROM adresler WHERE user_id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
        } catch (Exception e) {
            log.error("Error deleting addresses: {}", e.getMessage());
        }
        
        // 6. Mağazaları ve ürünleri temizle
        try {
            // Mağazaları bul
            List<Long> storeIds = entityManager.createQuery(
                "SELECT s.id FROM Store s WHERE s.owner.id = :userId", Long.class)
                .setParameter("userId", userId)
                .getResultList();
            
            log.info("Found {} stores for user ID: {}", storeIds.size(), userId);
            
            // Her mağazanın ürünlerini sil
            for (Long storeId : storeIds) {
                try {
                    entityManager.createNativeQuery(
                        "DELETE FROM products WHERE store_id = :storeId")
                        .setParameter("storeId", storeId)
                        .executeUpdate();
                    log.info("Deleted products for store ID: {}", storeId);
                } catch (Exception e) {
                    log.error("Error deleting products for store ID {}: {}", storeId, e.getMessage());
                }
            }
            
            // Mağazaları sil
            entityManager.createNativeQuery("DELETE FROM stores WHERE owner_id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
            log.info("Deleted stores for user ID: {}", userId);
        } catch (Exception e) {
            log.error("Error deleting stores: {}", e.getMessage());
        }
        
        // 7. Diğer tüm temizlik işlemlerini buraya ekle...
        
        // 8. Son olarak kullanıcıyı sil
        try {
            log.info("Deleting user from users table, ID: {}", userId);
            userRepository.delete(user);
            log.info("User successfully deleted: ID={}, Email={}", userId, user.getEmail());
        } catch (Exception e) {
            log.error("Error deleting user: {}", e.getMessage(), e);
            throw new RuntimeException("Kullanıcı silinirken bir hata oluştu: " + e.getMessage());
        }
    }
    
    /**
     * Admin tarafından kullanıcıyı e-posta ile siler
     * @param email Silinecek kullanıcının e-posta adresi
     */
    @Transactional
    public void deleteUserByAdmin(String email) {
        User user = findUserByEmail(email);
        deleteUserByAdmin(user.getId());
    }
    
} 