package com.example.backend.service.verification;

import com.example.backend.model.User;
import com.example.backend.model.PendingUser;
import com.example.backend.repository.PendingUserRepository;
import com.example.backend.repository.UserRepository;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class EmailVerificationService {
    private final JavaMailSender mailSender;
    private final UserRepository userRepository;
    private final PendingUserRepository pendingUserRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    @Autowired
    private TemplateEngine templateEngine;

    public EmailVerificationService(
            JavaMailSender mailSender,
            UserRepository userRepository,
            PendingUserRepository pendingUserRepository,
            PasswordEncoder passwordEncoder) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.pendingUserRepository = pendingUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void initiateEmailVerification(PendingUser pendingUser) {
        String verificationToken = UUID.randomUUID().toString();
        pendingUser.setVerificationToken(verificationToken);
        pendingUser.setExpiresAt(LocalDateTime.now().plusHours(24));
        pendingUserRepository.save(pendingUser);
        
        String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken;
        
        Context context = new Context();
        context.setVariable("name", pendingUser.getName());
        context.setVariable("verificationLink", verificationLink);
        
        String emailContent = templateEngine.process("email/verification-link", context);
        
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(pendingUser.getEmail());
            helper.setSubject("Email Doğrulama");
            helper.setText(emailContent, true);
            
            mailSender.send(message);
            log.info("Verification link sent to: {}", pendingUser.getEmail());
        } catch (Exception e) {
            log.error("Failed to send verification email: {}", e.getMessage());
            throw new RuntimeException("Doğrulama emaili gönderilemedi: " + e.getMessage());
        }
    }

    @Transactional
    public void verifyEmail(String token) {
        PendingUser pendingUser = pendingUserRepository.findByVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Geçersiz veya süresi dolmuş doğrulama kodu."));
        
        if (pendingUser.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Bu doğrulama kodunun süresi dolmuş.");
        }
        
        // Kullanıcı hesabı oluştur
        User user = new User();
        user.setEmail(pendingUser.getEmail());
        user.setPassword(pendingUser.getPassword());
        user.setName(pendingUser.getName());
        user.setSurname(pendingUser.getSurname());
        user.setGender(pendingUser.getGender());
        user.setBirthDate(pendingUser.getBirthDate());
        user.setActive(true);
        user.setEmailVerified(true);
        user.setRoles(Collections.singleton("USER"));
        
        userRepository.save(user);
        
        // Bekleyen kullanıcıyı sil
        pendingUserRepository.delete(pendingUser);
        
        log.info("Email verified and user created: {}", user.getEmail());
    }

    @Transactional
    public void initiateEmailChange(User user, String newEmail) {
        String verificationCode = generateVerificationCode();
        user.setEmailVerificationToken(verificationCode);
        user.setEmailVerificationTokenExpiry(LocalDateTime.now().plusMinutes(30));
        user.setNewEmail(newEmail);
        userRepository.save(user);

        Context context = new Context();
        context.setVariable("name", user.getName());
        context.setVariable("verificationCode", verificationCode);
        
        String emailContent = templateEngine.process("email/verification", context);
        
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(newEmail);
            helper.setSubject("Email Değişikliği Doğrulama");
            helper.setText(emailContent, true);
            
            mailSender.send(message);
            log.info("Email change verification code sent to: {}", newEmail);
        } catch (Exception e) {
            log.error("Failed to send email change verification code: {}", e.getMessage());
            throw new RuntimeException("Doğrulama kodu gönderilemedi: " + e.getMessage());
        }
    }

    @Transactional
    public void verifyEmailChange(String code) {
        User user = userRepository.findByEmailVerificationToken(code)
                .orElseThrow(() -> new RuntimeException("Geçersiz doğrulama kodu."));
        
        if (user.getEmailVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Bu doğrulama kodunun süresi dolmuş.");
        }
        
        if (user.getNewEmail() == null) {
            throw new RuntimeException("Değiştirilecek email adresi bulunamadı.");
        }
        
        user.setEmail(user.getNewEmail());
        user.setNewEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
        userRepository.save(user);
        
        log.info("Email changed to: {}", user.getEmail());
    }

    @Transactional
    public void sendVerificationToCurrentEmail(User user) {
        String verificationCode = generateVerificationCode();
        user.setEmailVerificationToken(verificationCode);
        user.setEmailVerificationTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);
        
        Context context = new Context();
        context.setVariable("name", user.getName());
        context.setVariable("verificationCode", verificationCode);
        
        String emailContent = templateEngine.process("email/verification", context);
        
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(user.getEmail());
            helper.setSubject("Email Doğrulama");
            helper.setText(emailContent, true);
            
            mailSender.send(message);
            log.info("Verification code sent to current email: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send verification code: {}", e.getMessage());
            throw new RuntimeException("Doğrulama kodu gönderilemedi: " + e.getMessage());
        }
    }

    @Transactional
    public boolean verifyCurrentEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        
        if (user.getEmailVerificationToken() == null || !user.getEmailVerificationToken().equals(code)) {
            return false;
        }
        
        if (user.getEmailVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            return false;
        }
        
        user.setEmailVerificationToken(null);
        user.setEmailVerificationTokenExpiry(null);
        userRepository.save(user);
        
        return true;
    }

    // Yardımcı metodlar
    private String generateVerificationCode() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    @Transactional
    public boolean resendVerificationEmail(String email) {
        log.info("Attempting to resend verification email to: {}", email);
        
        // Bekleyen kullanıcıyı bul
        Optional<PendingUser> pendingUserOpt = pendingUserRepository.findByEmail(email);
        if (pendingUserOpt.isEmpty()) {
            log.warn("No pending user found with email: {}", email);
            return false;
        }
        
        PendingUser pendingUser = pendingUserOpt.get();
        
        // Yeni token oluştur
        String verificationToken = UUID.randomUUID().toString();
        pendingUser.setVerificationToken(verificationToken);
        pendingUser.setExpiresAt(LocalDateTime.now().plusHours(24));
        pendingUserRepository.save(pendingUser);
        
        // Doğrulama linkini gönder
        String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken + "&email=" + email;
        
        Context context = new Context();
        context.setVariable("name", pendingUser.getName());
        context.setVariable("verificationLink", verificationLink);
        
        String emailContent = templateEngine.process("email/verification-link", context);
        
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(pendingUser.getEmail());
            helper.setSubject("Email Doğrulama - Yeni Link");
            helper.setText(emailContent, true);
            
            mailSender.send(message);
            log.info("Verification link resent to: {}", pendingUser.getEmail());
            return true;
        } catch (Exception e) {
            log.error("Failed to resend verification email: {}", e.getMessage());
            throw new RuntimeException("Doğrulama emaili gönderilemedi: " + e.getMessage());
        }
    }
    
    /**
     * Belirtilen e-posta adresine sahip bekleyen bir kullanıcı var mı kontrol eder
     * 
     * @param email Kontrol edilecek e-posta adresi
     * @return Bekleyen kullanıcı var mı
     */
    public boolean isPendingUserExists(String email) {
        return pendingUserRepository.findByEmail(email).isPresent();
    }
} 