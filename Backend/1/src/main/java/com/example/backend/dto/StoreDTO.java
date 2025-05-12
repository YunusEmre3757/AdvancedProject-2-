package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreDTO {
    private Long id;
    private String name;
    private String description;
    private String logo;
    private String bannerImage;
    private Double rating;
    private String status;
    private Integer followers;
    private Integer productsCount;
    private String address;
    private String contactEmail;
    private String contactPhone;
    
    private String website;
    private String facebook;
    private String instagram;
    private String twitter;
    
    private List<String> categories;
    private UserSummaryDTO owner;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 