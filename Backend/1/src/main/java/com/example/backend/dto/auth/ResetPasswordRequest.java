package com.example.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResetPasswordRequest {
    
    @NotBlank(message = "Token gereklidir")
    private String token;
    
    @NotBlank(message = "Yeni şifre gereklidir")
    @Size(min = 6, message = "Şifre en az 6 karakter olmalıdır")
    private String newPassword;
} 