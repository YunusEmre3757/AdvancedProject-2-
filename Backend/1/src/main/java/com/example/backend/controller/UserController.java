package com.example.backend.controller;

import com.example.backend.dto.user.UserResponse;
import com.example.backend.dto.user.UpdateProfileRequest;
import com.example.backend.dto.user.EmailVerificationRequest;
import com.example.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true", maxAge = 3600)
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getCurrentUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return ResponseEntity.ok(userService.updateProfile(email, request));
    }


    
    @PostMapping("/verify-email/send")
    public ResponseEntity<Map<String, String>> sendVerificationEmail(@Valid @RequestBody EmailVerificationRequest request) {
        userService.sendVerificationEmail(request);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Verification email sent successfully");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email/confirm")
    public ResponseEntity<UserResponse> confirmEmailChange(@RequestBody Map<String, String> request) {
        String newEmail = request.get("newEmail");
        String verificationCode = request.get("verificationCode");
        
        if (newEmail == null || verificationCode == null) {
            throw new IllegalArgumentException("New email and verification code are required");
        }
        
        return ResponseEntity.ok(userService.confirmEmailChange(newEmail, verificationCode));
    }

    @PostMapping("/auth/logout-all")
    public ResponseEntity<Map<String, String>> logoutFromAllDevices() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        userService.logoutFromAllDevices(email);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out from all devices");
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/account")
    public ResponseEntity<Map<String, String>> deleteAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        userService.deleteAccount(email);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Account deleted successfully");
        
        return ResponseEntity.ok(response);
    }
} 