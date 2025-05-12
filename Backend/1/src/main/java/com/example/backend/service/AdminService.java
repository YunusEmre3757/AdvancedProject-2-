package com.example.backend.service;

import com.example.backend.dto.admin.PendingUserDto;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.User;
import com.example.backend.model.PendingUser;
import com.example.backend.repository.PendingUserRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.verification.EmailVerificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminService {

    private final PendingUserRepository pendingUserRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;

    /**
     * Retrieves a paginated list of all pending users
     */
    public Page<PendingUserDto> getPendingUsers(Pageable pageable) {
        Page<PendingUser> pendingUsersPage = pendingUserRepository.findAll(pageable);
        return pendingUsersPage.map(this::mapPendingUserToDto);
    }

    /**
     * Searches for pending users by name, surname, or email
     */
    public Page<PendingUserDto> searchPendingUsers(String query, Pageable pageable) {
        Page<PendingUser> pendingUsersPage = pendingUserRepository.searchByNameSurnameOrEmail(query, pageable);
        return pendingUsersPage.map(this::mapPendingUserToDto);
    }

    /**
     * Approves a pending user, creating a new user account
     */
    @Transactional
    public void approvePendingUser(Long id) {
        PendingUser pendingUser = pendingUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pending user not found with id: " + id));
        
        // Check if email is already in use
        if (userRepository.existsByEmail(pendingUser.getEmail())) {
            throw new IllegalStateException("Email already in use: " + pendingUser.getEmail());
        }
        
        // Create user from pending user
        User user = new User();
        user.setEmail(pendingUser.getEmail());
        user.setPassword(pendingUser.getPassword()); // Password is already encoded
        user.setName(pendingUser.getName());
        user.setSurname(pendingUser.getSurname());
        user.setGender(pendingUser.getGender());
        user.setBirthDate(pendingUser.getBirthDate());
        user.setActive(true);
        user.setEmailVerified(true); // Admin approval means email is verified
        user.setRoles(Collections.singleton("USER")); // Default role
        
        userRepository.save(user);
        
        // Delete pending user
        pendingUserRepository.delete(pendingUser);
        
        log.info("Pending user approved: {}", pendingUser.getEmail());
    }

    /**
     * Deletes a pending user without creating a user account
     */
    @Transactional
    public void deletePendingUser(Long id) {
        PendingUser pendingUser = pendingUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pending user not found with id: " + id));
        
        pendingUserRepository.delete(pendingUser);
        
        log.info("Pending user deleted: {}", pendingUser.getEmail());
    }

    /**
     * Resends the verification email to a pending user
     */
    @Transactional
    public void resendVerificationEmail(Long id) {
        PendingUser pendingUser = pendingUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pending user not found with id: " + id));
        
        // Update verification token and expiry
        String verificationToken = java.util.UUID.randomUUID().toString();
        pendingUser.setVerificationToken(verificationToken);
        pendingUser.setExpiresAt(LocalDateTime.now().plusHours(24));
        
        pendingUserRepository.save(pendingUser);
        
        // Resend verification email
        emailVerificationService.initiateEmailVerification(pendingUser);
        
        log.info("Verification email resent to pending user: {}", pendingUser.getEmail());
    }

    /**
     * Maps a PendingUser entity to a PendingUserDto
     */
    private PendingUserDto mapPendingUserToDto(PendingUser pendingUser) {
        return PendingUserDto.builder()
                .id(pendingUser.getId())
                .name(pendingUser.getName())
                .surname(pendingUser.getSurname())
                .email(pendingUser.getEmail())
                .gender(pendingUser.getGender())
                .birthDate(pendingUser.getBirthDate() != null ? 
                        Date.from(pendingUser.getBirthDate().atStartOfDay(ZoneId.systemDefault()).toInstant()) : 
                        null)
                .expiresAt(pendingUser.getExpiresAt() != null ? 
                        Date.from(pendingUser.getExpiresAt().atZone(ZoneId.systemDefault()).toInstant()) : 
                        null)
                .createdAt(pendingUser.getCreatedAt() != null ? 
                        Date.from(pendingUser.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()) : 
                        null)
                .build();
    }
} 