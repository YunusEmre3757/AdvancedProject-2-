package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "ilceler")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ilce {
    @Id
    @Column(name = "ilce_id")
    private Integer ilceId;
    
    @Column(name = "ilce_adi", nullable = false)
    private String ilceAdi;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "il_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Il il;
} 