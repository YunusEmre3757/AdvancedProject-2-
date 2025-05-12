package com.example.backend.dto.address;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressResponse {
    private Long id;
    private String title;
    private String firstName;
    private String lastName;
    private String phone;
    private String address;
    private String city;
    private String district;
    private String postalCode;
    private Boolean isDefault;
} 