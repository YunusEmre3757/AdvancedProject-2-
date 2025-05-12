package com.example.backend.model;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class AdresRequest {
    @NotNull(message = "İl seçimi zorunludur")
    private Integer ilId;

    @NotNull(message = "İlçe seçimi zorunludur")
    private Integer ilceId;

    @NotNull(message = "Mahalle seçimi zorunludur")
    private Integer mahalleId;

    @NotBlank(message = "Adres başlığı zorunludur")
    private String adresBasligi;

    @NotBlank(message = "Detay adres zorunludur")
    private String detayAdres;

    @NotBlank(message = "Telefon numarası zorunludur")
    private String telefon;
} 