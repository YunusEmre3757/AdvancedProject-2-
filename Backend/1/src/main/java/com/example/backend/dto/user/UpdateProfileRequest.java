package com.example.backend.dto.user;

import com.example.backend.dto.address.AddressDTO;
import com.example.backend.model.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Surname is required")
    private String surname;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @Pattern(regexp = "^(0?5)[0-9]{9}$", message = "Phone number must be in format: 05XX XXX XX XX")
    private String phoneNumber;
    private Date birthDate;
    private Gender gender;
    private List<AddressDTO> addresses;
} 