package com.example.backend.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationRequest {
    @NotBlank(message = "Current email is required")
    @Email(message = "Current email should be valid")
    private String currentEmail;
    
    @Email(message = "New email should be valid")
    private String newEmail;
    
    @NotBlank(message = "Type is required")
    private String type;
} 