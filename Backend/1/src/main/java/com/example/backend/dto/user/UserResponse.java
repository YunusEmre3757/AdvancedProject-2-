package com.example.backend.dto.user;

import com.example.backend.dto.address.AddressResponse;
import com.example.backend.model.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String surname;
    private String phoneNumber;
    private Date birthDate;
    private Gender gender;
    private List<String> roles;
    private Boolean emailVerified;
    private List<AddressResponse> addresses;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 