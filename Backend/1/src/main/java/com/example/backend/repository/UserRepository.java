package com.example.backend.repository;

import com.example.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    List<User> findByIsActive(boolean isActive);
    
    Page<User> findByEmailContainingIgnoreCaseOrPhoneNumberContaining(String email, String phoneNumber, Pageable pageable);
    
    Optional<User> findByEmailVerificationToken(String token);
    
    List<User> findByEmailVerified(boolean emailVerified);
    
    Optional<User> findByIdAndIsActiveTrue(Long id);
    
    Page<User> findAllByIsActiveTrue(Pageable pageable);
    
    Optional<User> findByEmailVerificationTokenAndNewEmail(String verificationToken, String newEmail);
    
    // Kullanıcıları e-posta, ad veya soyada göre arama
    Page<User> findByEmailLikeIgnoreCaseOrNameLikeIgnoreCaseOrSurnameLikeIgnoreCase(
            String email, String name, String surname, Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime date);
    
    // Find user by reset password token
    Optional<User> findByResetPasswordToken(String token);
} 