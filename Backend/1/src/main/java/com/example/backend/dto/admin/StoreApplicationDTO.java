package com.example.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreApplicationDTO {
    private String id;
    private String name;
    private String logo;
    private String owner;
    private LocalDateTime date;
    private String status;  // "pending", "approved", "rejected"
} 