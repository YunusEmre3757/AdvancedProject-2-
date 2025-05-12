package com.example.backend.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    /**
     * Mağaza dosyalarını (logo, banner vb.) servis etmek için endpoint
     */
    @GetMapping("/stores/{storeId}/{fileName:.+}")
    public ResponseEntity<Resource> serveStoreFile(
            @PathVariable Long storeId, 
            @PathVariable String fileName) {
        
        try {
            // Dosya yolunu oluştur
            Path filePath = Paths.get("uploads/stores/" + storeId + "/" + fileName);
            Resource resource = new UrlResource(filePath.toUri());
            
            // Dosya var mı kontrol et
            if (resource.exists()) {
                // Dosya türünü belirle
                String contentType = determineContentType(fileName);
                
                // Dosyayı gönder
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Ürün dosyalarını (resimler) servis etmek için endpoint
     */
    @GetMapping("/products/{productId}/{fileName:.+}")
    public ResponseEntity<Resource> serveProductFile(
            @PathVariable Long productId, 
            @PathVariable String fileName) {
        
        System.out.println("Dosya erişimi: /api/files/products/" + productId + "/" + fileName);
        try {
            // Dosya yolunu oluştur
            Path filePath = Paths.get("uploads/products/" + productId + "/" + fileName);
            System.out.println("Dosya yolu: " + filePath.toAbsolutePath());
            Resource resource = new UrlResource(filePath.toUri());
            
            // Dosya var mı kontrol et
            if (resource.exists()) {
                System.out.println("Dosya mevcut ve servis ediliyor");
                // Dosya türünü belirle
                String contentType = determineContentType(fileName);
                
                // Dosyayı gönder
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                System.out.println("Dosya bulunamadı: " + filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            System.out.println("Dosya erişiminde hata: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Varyant dosyalarını (resimler) servis etmek için endpoint
     */
    @GetMapping("/products/{productId}/variants/{variantId}/{fileName:.+}")
    public ResponseEntity<Resource> serveVariantFile(
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @PathVariable String fileName) {
        
        System.out.println("Varyant dosya erişimi: /api/files/products/" + productId + "/variants/" + variantId + "/" + fileName);
        try {
            // Dosya yolunu oluştur
            Path filePath = Paths.get("uploads/products/" + productId + "/variants/" + variantId + "/" + fileName);
            System.out.println("Varyant dosya yolu: " + filePath.toAbsolutePath());
            Resource resource = new UrlResource(filePath.toUri());
            
            // Dosya var mı kontrol et
            if (resource.exists()) {
                System.out.println("Varyant dosyası mevcut ve servis ediliyor");
                // Dosya türünü belirle
                String contentType = determineContentType(fileName);
                
                // Dosyayı gönder
                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
            } else {
                System.out.println("Varyant dosyası bulunamadı: " + filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            System.out.println("Varyant dosya erişiminde hata: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Dosya adına göre içerik türünü belirle
     */
    private String determineContentType(String fileName) {
        fileName = fileName.toLowerCase();
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (fileName.endsWith(".png")) {
            return "image/png";
        } else if (fileName.endsWith(".gif")) {
            return "image/gif";
        } else if (fileName.endsWith(".pdf")) {
            return "application/pdf";
        } else {
            return "application/octet-stream";
        }
    }
} 