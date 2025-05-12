package com.example.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingUserDto {
    private Long id;
    private String name;
    private String surname;
    private String email;
    private String gender;
    private Date birthDate;
    private Date expiresAt;
    private Date createdAt;
} 