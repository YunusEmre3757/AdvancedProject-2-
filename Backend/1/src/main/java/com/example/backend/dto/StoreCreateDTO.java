package com.example.backend.dto;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreCreateDTO {
    
    @NotBlank(message = "Mağaza adı boş olamaz")
    @Size(min = 3, max = 100, message = "Mağaza adı 3-100 karakter arasında olmalıdır")
    private String name;
    
    @Size(max = 1000, message = "Açıklama en fazla 1000 karakter olabilir")
    private String description;
    
    @NotBlank(message = "Logo URL'si boş olamaz")
    private String logo;
    
    private String bannerImage;
    
    private String address;
    
    @Email(message = "Geçerli bir e-posta adresi giriniz")
    private String contactEmail;
    
    private String contactPhone;
    
    private String website;
    
    private String facebook;
    
    private String instagram;
    
    private String twitter;
    
    private List<String> categories;
    
    private String category;
} 