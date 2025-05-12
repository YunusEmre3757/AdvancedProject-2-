package com.example.backend.service;

import com.example.backend.model.Brand;
import com.example.backend.model.Product;
import com.example.backend.repository.BrandRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Tüm aktif markaları getir
     */
    public List<Brand> getAllBrands() {
        return brandRepository.findByActiveTrue();
    }

    /**
     * Markaları sayfalı getir
     */
    public Page<Brand> getBrands(Pageable pageable) {
        return brandRepository.findByActiveTrue(pageable);
    }

    /**
     * ID ile marka getir
     */
    public Brand getBrandById(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marka bulunamadı"));
    }

    /**
     * Slug ile marka getir
     */
    public Brand getBrandBySlug(String slug) {
        return brandRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marka bulunamadı"));
    }

    /**
     * İsim ile marka ara (varsa döndür, yoksa null)
     */
    public Optional<Brand> findBrandByName(String name) {
        return brandRepository.findByNameIgnoreCase(name);
    }

    /**
     * En popüler markaları getir
     */
    public Page<Brand> getPopularBrands(Pageable pageable) {
        return brandRepository.findTopBrandsByProductCount(pageable);
    }

    /**
     * Arama sorgusu ile markaları getir
     */
    public Page<Brand> searchBrands(String query, Pageable pageable) {
        return brandRepository.searchBrands(query, pageable);
    }

    /**
     * Kategoriye göre markaları getir
     */
    public List<Brand> getBrandsByCategoryId(Long categoryId) {
        System.out.println("getBrandsByCategoryId çağrıldı: categoryId=" + categoryId);
        
        // Bu kategoriye ait ürünleri bul
        List<Product> products = entityManager.createQuery(
            "SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.active = true", 
            Product.class)
            .setParameter("categoryId", categoryId)
            .getResultList();
            
        System.out.println("Bu kategoriye ait ürün sayısı: " + products.size());
        
        // Ürünlerin markalarını al
        Set<Brand> brands = new HashSet<>();
        for (Product product : products) {
            if (product.getBrand() != null) {
                brands.add(product.getBrand());
                System.out.println("Marka bulundu: " + product.getBrand().getName() + " (ID: " + product.getBrand().getId() + ")");
            }
        }
        
        // Repository'nin sağladığı sorguyu çağır
        List<Brand> repositoryBrands = brandRepository.findBrandsByCategoryId(categoryId);
        System.out.println("Repository'den gelen marka sayısı: " + repositoryBrands.size());
        
        // İki sonucu birleştir
        brands.addAll(repositoryBrands);
        
        // Liste olarak dönüştür
        List<Brand> result = new ArrayList<>(brands);
        System.out.println("Toplam bulunan marka sayısı: " + result.size());
        
        return result;
    }

    /**
     * Kategoriye göre markaları sayfalı getir
     */
    public Page<Brand> getBrandsByCategoryId(Long categoryId, Pageable pageable) {
        System.out.println("getBrandsByCategoryId (Pageable) çağrıldı: categoryId=" + categoryId);
        
        // Önce normal metodu kullanarak tüm markaları al
        List<Brand> allBrands = getBrandsByCategoryId(categoryId);
        System.out.println("Kategoriye ait toplam marka sayısı: " + allBrands.size());
        
        // Sayfalama uygula
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allBrands.size());
        
        // Sayfa dışındaysa boş sayfa döndür
        if (start > end) {
            return Page.empty(pageable);
        }
        
        // Sayfaya göre alt listeyi al
        List<Brand> pagedBrands = allBrands.subList(start, end);
        System.out.println("Sayfalama sonucu marka sayısı: " + pagedBrands.size());
        
        // Page nesnesi oluşturup döndür
        return new org.springframework.data.domain.PageImpl<>(
            pagedBrands, pageable, allBrands.size()
        );
    }

    /**
     * Yeni marka ekle
     */
    @Transactional
    public Brand addBrand(Brand brand) {
        // İsim kontrolü
        if (brandRepository.findByNameIgnoreCase(brand.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu isimde bir marka zaten var");
        }
        
        // Slug kontrolü
        if (brand.getSlug() != null && brandRepository.findBySlug(brand.getSlug()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu slug ile bir marka zaten var");
        }
        
        return brandRepository.save(brand);
    }

    /**
     * Marka güncelle
     */
    @Transactional
    public Brand updateBrand(Long id, Brand brandDetails) {
        Brand brand = getBrandById(id);
        
        // İsim değişiyorsa eşsizliğini kontrol et
        if (!brand.getName().equalsIgnoreCase(brandDetails.getName()) &&
                brandRepository.findByNameIgnoreCase(brandDetails.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu isimde bir marka zaten var");
        }
        
        // Slug değişiyorsa eşsizliğini kontrol et
        if (brandDetails.getSlug() != null && 
                !brandDetails.getSlug().equals(brand.getSlug()) &&
                brandRepository.findBySlug(brandDetails.getSlug()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu slug ile bir marka zaten var");
        }
        
        // Bilgileri güncelle
        brand.setName(brandDetails.getName());
        brand.setDescription(brandDetails.getDescription());
        brand.setSlug(brandDetails.getSlug());
        brand.setActive(brandDetails.isActive());
        
        return brandRepository.save(brand);
    }

    /**
     * Marka sil
     */
    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = getBrandById(id);
        brandRepository.delete(brand);
    }
    
    /**
     * Markayı isimle bulur, yoksa yeni oluşturur
     */
    @Transactional
    public Brand findOrCreateBrand(String brandName) {
        if (brandName == null || brandName.trim().isEmpty()) {
            return null;
        }
        
        String normalizedName = brandName.trim();
        
        // Marka varsa getir
        Optional<Brand> existingBrand = brandRepository.findByNameIgnoreCase(normalizedName);
        if (existingBrand.isPresent()) {
            return existingBrand.get();
        }
        
        // Yoksa yeni oluştur
        String slug = normalizedName.toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "");
        
        Brand newBrand = new Brand(normalizedName, slug);
        return brandRepository.save(newBrand);
    }
} 