package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.model.PendingUser;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.verification.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/verification")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", maxAge = 3600)
@Slf4j
public class VerificationController {

    private final EmailVerificationService emailVerificationService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public VerificationController(
            EmailVerificationService emailVerificationService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.emailVerificationService = emailVerificationService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerWithVerification(@Valid @RequestBody RegisterRequest request) {
        // Email zaten var mı kontrol et
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bu email zaten kullanılıyor"));
        }

        // PendingUser oluştur
        PendingUser pendingUser = new PendingUser();
        pendingUser.setName(request.getName());
        pendingUser.setSurname(request.getSurname());
        pendingUser.setEmail(request.getEmail());
        pendingUser.setPassword(passwordEncoder.encode(request.getPassword()));
        pendingUser.setGender(request.getGender());
        pendingUser.setBirthDate(request.getBirthDate());

        // Email doğrulama sürecini başlat
        emailVerificationService.initiateEmailVerification(pendingUser);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Doğrulama emaili gönderildi. Lütfen email adresinizi kontrol edin.");
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam String token) {
        emailVerificationService.verifyEmail(token);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Email adresiniz başarıyla doğrulandı. Şimdi giriş yapabilirsiniz.");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-email")
    public ResponseEntity<Map<String, String>> changeEmail(
            Authentication authentication,
            @Valid @RequestBody ChangeEmailRequest request) {
        
        // Kullanıcıyı bul
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Yeni email adresi zaten kullanılıyor mu kontrol et
        if (userRepository.existsByEmail(request.getNewEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bu email zaten kullanılıyor"));
        }
        
        // Email değiştirme sürecini başlat
        emailVerificationService.initiateEmailChange(user, request.getNewEmail());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Doğrulama kodu yeni email adresinize gönderildi");
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/verify-email-change")
    public ResponseEntity<Map<String, String>> verifyEmailChange(@Valid @RequestBody VerifyCodeRequest request) {
        emailVerificationService.verifyEmailChange(request.getCode());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Email adresiniz başarıyla değiştirildi");
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/send-verification")
    public ResponseEntity<Map<String, String>> sendVerification(Authentication authentication) {
        // Kullanıcıyı bul
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        // Doğrulama kodunu email adresine gönder
        emailVerificationService.sendVerificationToCurrentEmail(user);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Doğrulama kodu email adresinize gönderildi");
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/verify-current-email")
    public ResponseEntity<Map<String, String>> verifyCurrentEmail(@Valid @RequestBody VerifyCurrentEmailRequest request) {
        boolean verified = emailVerificationService.verifyCurrentEmail(request.getEmail(), request.getCode());
        
        Map<String, String> response = new HashMap<>();
        if (verified) {
            response.put("message", "Email doğrulama başarılı");
        } else {
            response.put("message", "Email doğrulama başarısız");
        }
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/resend-registration")
    public ResponseEntity<Map<String, Object>> resendRegistrationVerification(@RequestBody ResendRegistrationRequest request) {
        log.info("Resending verification email for: {}", request.getEmail());
        
        try {
            // Yeniden doğrulama emaili gönder
            boolean sent = emailVerificationService.resendVerificationEmail(request.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            if (sent) {
                response.put("success", true);
                response.put("message", "Yeni doğrulama linki email adresinize gönderildi.");
            } else {
                response.put("success", false);
                response.put("message", "Bu email adresine sahip bekleyen bir kayıt bulunamadı.");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error resending verification email", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/check-status")
    public ResponseEntity<Map<String, Object>> checkVerificationStatus(@RequestParam String email) {
        log.info("Checking verification status for: {}", email);
        
        Map<String, Object> response = new HashMap<>();
        
        // Önce kayıtlı kullanıcıda kontrol et
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent()) {
            response.put("emailVerified", true);
            response.put("message", "Bu email adresi zaten doğrulanmış.");
            return ResponseEntity.ok(response);
        }
        
        // Bekleyen kullanıcıda kontrol et
        boolean isPending = emailVerificationService.isPendingUserExists(email);
        if (isPending) {
            response.put("emailVerified", false);
            response.put("message", "Bu email adresi için doğrulama beklemekte.");
            return ResponseEntity.ok(response);
        }
        
        response.put("emailVerified", false);
        response.put("message", "Bu email adresi için kayıt bulunamadı.");
        return ResponseEntity.ok(response);
    }
}

// DTO sınıfları
class RegisterRequest {
    private String name;
    private String surname;
    private String email;
    private String password;
    private String gender;
    private java.time.LocalDate birthDate;
    
    // Getter ve setter metodları
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    
    public java.time.LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(java.time.LocalDate birthDate) { this.birthDate = birthDate; }
}

class ChangeEmailRequest {
    private String newEmail;
    
    // Getter ve setter metodları
    public String getNewEmail() { return newEmail; }
    public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
}

class VerifyCodeRequest {
    private String code;
    
    // Getter ve setter metodları
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

class VerifyCurrentEmailRequest {
    private String email;
    private String code;
    
    // Getter ve setter metodları
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}

class ResendRegistrationRequest {
    private String email;
    
    // Getter ve setter metodları
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
} 