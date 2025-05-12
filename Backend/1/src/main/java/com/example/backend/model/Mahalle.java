package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "mahalleler")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mahalle {
    @Id
    @Column(name = "mahalle_id")
    private Integer mahalleId;
    
    @Column(name = "mahalle_adi", nullable = false)
    private String mahalleAdi;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ilce_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "il"})
    private Ilce ilce;
} 