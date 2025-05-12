package com.example.backend.controller;

import com.example.backend.model.AdresRequest;
import com.example.backend.model.Adres;
import com.example.backend.model.Il;
import com.example.backend.model.Ilce;
import com.example.backend.model.Mahalle;
import com.example.backend.service.AdresService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/adres")
@RequiredArgsConstructor
public class AdresController {
    private final AdresService adresService;

    @GetMapping("/iller")
    public ResponseEntity<List<Il>> getAllIller() {
        return ResponseEntity.ok(adresService.getAllIller());
    }

    @GetMapping("/ilceler/{ilId}")
    public ResponseEntity<List<Ilce>> getIlcelerByIl(@PathVariable Integer ilId) {
        return ResponseEntity.ok(adresService.getIlcelerByIl(ilId));
    }

    @GetMapping("/mahalleler/{ilceId}")
    public ResponseEntity<List<Mahalle>> getMahallelerByIlce(@PathVariable Integer ilceId) {
        return ResponseEntity.ok(adresService.getMahallelerByIlce(ilceId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Adres>> getUserAdresleri(@PathVariable Long userId) {
        return ResponseEntity.ok(adresService.getUserAdresleri(userId));
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<?> addAdres(
            @PathVariable Long userId,
            @RequestBody AdresRequest request) {
        try {
            Adres adres = adresService.addAdres(userId, request);
            return ResponseEntity.ok(Map.of(
                "message", "Adres başarıyla eklendi",
                "success", true,
                "adres", adres
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "success", false
            ));
        }
    }

    @DeleteMapping("/user/{userId}/{adresId}")
    public ResponseEntity<?> deleteAdres(
            @PathVariable Long userId,
            @PathVariable Long adresId) {
        try {
            adresService.deleteAdres(userId, adresId);
            return ResponseEntity.ok(Map.of(
                "message", "Adres başarıyla silindi",
                "success", true
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "success", false
            ));
        }
    }
} 