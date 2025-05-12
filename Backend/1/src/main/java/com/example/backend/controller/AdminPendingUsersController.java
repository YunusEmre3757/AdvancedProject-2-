package com.example.backend.controller;

import com.example.backend.dto.admin.PendingUserDto;
import com.example.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/verification")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminPendingUsersController {

    private final AdminService adminService;

    /**
     * Get all pending users with pagination
     */
    @GetMapping("/pending-users")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<PendingUserDto>> getPendingUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.getPendingUsers(pageable));
    }

    /**
     * Search pending users by name, surname, or email
     */
    @GetMapping("/search")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Page<PendingUserDto>> searchPendingUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.searchPendingUsers(query, pageable));
    }

    /**
     * Approve a pending user
     */
    @PostMapping("/approve/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> approvePendingUser(@PathVariable Long id) {
        adminService.approvePendingUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete/reject a pending user
     */
    @DeleteMapping("/reject/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> deletePendingUser(@PathVariable Long id) {
        adminService.deletePendingUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Resend verification email to a pending user
     */
    @PostMapping("/{id}/resend-verification")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> resendVerificationEmail(@PathVariable Long id) {
        adminService.resendVerificationEmail(id);
        return ResponseEntity.ok().build();
    }
} 