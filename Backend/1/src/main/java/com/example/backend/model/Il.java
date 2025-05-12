package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "iller")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Il {
    @Id
    @Column(name = "il_id")
    private Integer ilId;
    
    @Column(name = "id_adi", nullable = false)
    private String ilAdi;
} 