package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "adresler")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Adres {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "adresler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "il_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "ilceler"})
    private Il il;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ilce_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "il", "mahalleler"})
    private Ilce ilce;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mahalle_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "ilce"})
    private Mahalle mahalle;

    @Column(name = "adres_basligi", nullable = false)
    private String adresBasligi;

    @Column(name = "detay_adres", nullable = false, length = 500)
    private String detayAdres;

    @Column(name = "telefon", nullable = false)
    private String telefon;

    @Column(name = "aktif", nullable = false)
    private boolean aktif = true;
} 