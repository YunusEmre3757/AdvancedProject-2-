package com.example.backend.controller;

import com.example.backend.dto.ProductAttributeDTO;
import com.example.backend.dto.ProductVariantDTO;
import com.example.backend.model.Brand;
import com.example.backend.model.PopularSearch;
import com.example.backend.model.Product;
import com.example.backend.model.ProductImage;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.VariantImage;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.ProductImageRepository;
import com.example.backend.repository.VariantImageRepository;
import com.example.backend.service.BrandService;
import com.example.backend.service.PopularSearchService;
import com.example.backend.service.ProductService;
import jakarta.annotation.security.PermitAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.ArrayList;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private BrandService brandService;
    
    @Autowired
    private PopularSearchService popularSearchService;
    
    @Autowired
    private ProductVariantRepository productVariantRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    @Autowired
    private VariantImageRepository variantImageRepository;

    @Autowired
    private EntityManager entityManager;

    // Ürünleri sayfalı şekilde getir
    @GetMapping
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String sort,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String stockFilter) {
        
        try {
            Page<Product> productPage = productService.getProducts(page, size, sort, category, search, brand, 
                                                                  minPrice, maxPrice, stockFilter);
            
            // Ürün resimlerini kontrol etmek için debug log ekleyelim
            for (Product product : productPage.getContent()) {
                System.out.println("Ürün ID: " + product.getId() + ", Ürün Adı: " + product.getName());
                System.out.println("  imageUrl: " + product.getImageUrl());
                System.out.println("  allImageUrls: " + product.getAllImageUrls());
                System.out.println("  images koleksiyon boyutu: " + (product.getImages() != null ? product.getImages().size() : "null"));
            }
            
            Map<String, Object> response = new HashMap<>();
            
            // Ürünlerin resimlerini açıkça yüklenmesini sağlayalım
            for (Product product : productPage.getContent()) {
                // Ürünün images koleksiyonuna erişerek Hibernate'in yüklemesini tetikle
                if (product.getImages() != null) {
                    // Log ile doğrulama
                    System.out.println("Product " + product.getId() + " has " + product.getImages().size() + " images");
                    System.out.println("Main image URL: " + product.getImageUrl());
                }
            }
            
            response.put("items", productPage.getContent());
            response.put("total", productPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Öne çıkan ürünleri getir
    @GetMapping("/featured")
    public ResponseEntity<List<Product>> getFeaturedProducts() {
        try {
            List<Product> featuredProducts = productService.getFeaturedProducts();
            return new ResponseEntity<>(featuredProducts, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Ürün detayı getir
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable("id") long id) {
        try {
            Product product = productService.getProduct(id);
            return new ResponseEntity<>(product, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    // Kategori ID'sine göre ürünleri getir
    @GetMapping("/category/{id}")
    public ResponseEntity<List<Product>> getProductsByCategoryId(@PathVariable("id") long id) {
        try {
            List<Product> products = productService.getProductsByCategory(id);
            return new ResponseEntity<>(products, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Kategori slug'ına göre ürünleri getir
    @GetMapping("/category/slug/{slug}")
    public ResponseEntity<List<Product>> getProductsByCategorySlug(@PathVariable("slug") String slug) {
        try {
            List<Product> products = productService.getProductsByCategorySlug(slug);
            return new ResponseEntity<>(products, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Yeni ürün ekle
    @PostMapping
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        try {
            System.out.println("Yeni ürün ekleme isteği alındı");
            System.out.println("Ürün Adı: " + product.getName());
            System.out.println("Ürün JSON: " + product);
            
            // Kategori kontrolü
            if (product.getCategory() == null) {
                System.out.println("HATA: Kategori eksik!");
                return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
            } else {
                System.out.println("Kategori ID: " + product.getCategory().getId());
            }
            
            // Brand kontrolü
            if (product.getBrand() != null) {
                System.out.println("Brand ID: " + product.getBrand().getId());
                System.out.println("Brand Detay: " + product.getBrand());
            } else {
                System.out.println("Brand belirtilmemiş");
            }
            
            // Store kontrolü
            if (product.getStore() != null) {
                System.out.println("Store ID: " + product.getStore().getId());
                System.out.println("Store Detay: " + product.getStore());
            } else {
                System.out.println("Store belirtilmemiş");
            }
            
            Product createdProduct = productService.addProduct(product);
            return new ResponseEntity<>(createdProduct, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Ürün eklerken hata: " + e.getMessage());
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Ürün güncelle
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<Product> updateProduct(@PathVariable("id") long id, @RequestBody Product product) {
        try {
            Product updatedProduct = productService.updateProduct(id, product);
            return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    // Ürün sil
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteProduct(@PathVariable("id") long id) {
        try {
            productService.deleteProduct(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // İndirimli ürünleri getir
    @GetMapping("/discounted")
    public ResponseEntity<List<Product>> getDiscountedProducts() {
        try {
            List<Product> discountedProducts = productService.getDiscountedProducts();
            return new ResponseEntity<>(discountedProducts, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // En çok satanları getir
    @GetMapping("/best-sellers")
    public ResponseEntity<List<Product>> getBestSellers() {
        try {
            List<Product> bestSellers = productService.getBestSellers();
            return new ResponseEntity<>(bestSellers, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Yeni ürünleri getir
    @GetMapping("/new-arrivals")
    public ResponseEntity<List<Product>> getNewArrivals() {
        try {
            List<Product> newArrivals = productService.getNewArrivals();
            return new ResponseEntity<>(newArrivals, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Slug'a göre ürün getir
    @GetMapping("/slug/{slug}")
    public ResponseEntity<Product> getProductBySlug(@PathVariable("slug") String slug) {
        try {
            Product product = productService.getProductBySlug(slug);
            return new ResponseEntity<>(product, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }
    
    // Mevcut markaların listesini getir
    @GetMapping("/brands")
    public ResponseEntity<List<String>> getBrands() {
        try {
            // Aktif markaları getir ve sadece isimlerini döndür
            List<String> brandNames = brandService.getAllBrands().stream()
                .map(Brand::getName)
                .collect(Collectors.toList());
                
            return new ResponseEntity<>(brandNames, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Ürüne ait özellikleri (attributes) getir
     */
    @GetMapping("/{id}/attributes")
    public ResponseEntity<List<ProductAttributeDTO>> getProductAttributes(@PathVariable("id") long id) {
        try {
            List<ProductAttributeDTO> attributes = productService.getProductAttributes(id);
            return new ResponseEntity<>(attributes, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Ürüne ait varyantları getir
     */
    @GetMapping("/{id}/variants")
    public ResponseEntity<List<ProductVariantDTO>> getProductVariants(@PathVariable("id") long id) {
        try {
            List<ProductVariantDTO> variants = productService.getProductVariants(id);
            return new ResponseEntity<>(variants, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Yeni varyant ekle
     */
    @PostMapping("/{id}/variants")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<ProductVariantDTO> addProductVariant(
            @PathVariable("id") long id,
            @RequestBody ProductVariantDTO variantDTO) {
        try {
            ProductVariantDTO createdVariant = productService.addProductVariant(id, variantDTO);
            return new ResponseEntity<>(createdVariant, HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Varyant güncelle
     */
    @PutMapping("/variants/{variantId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<ProductVariantDTO> updateProductVariant(
            @PathVariable("variantId") long variantId,
            @RequestBody ProductVariantDTO variantDTO) {
        try {
            ProductVariantDTO updatedVariant = productService.updateProductVariant(variantId, variantDTO);
            if (updatedVariant != null) {
                return new ResponseEntity<>(updatedVariant, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Varyant sil
     */
    @DeleteMapping("/variants/{variantId}")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteProductVariant(@PathVariable("variantId") long variantId) {
        try {
            productService.deleteProductVariant(variantId);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Varyant status güncelle
     */
    @PatchMapping("/variants/{variantId}/status")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<ProductVariantDTO> updateVariantStatus(
            @PathVariable("variantId") long variantId,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String status = statusUpdate.get("status");
            if (status == null) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // Status değeri geçerli mi kontrol et
            if (!status.equals("active") && !status.equals("inactive")) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // Önce mevcut varyantı getir
            Optional<ProductVariant> variantResult = productVariantRepository.findById(variantId);
            if (!variantResult.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            
            ProductVariant currentVariant = variantResult.get();
            
            // DTO oluştur ve sadece değiştirilecek değerleri belirle
            ProductVariantDTO variantDTO = new ProductVariantDTO();
            variantDTO.setId(variantId);
            variantDTO.setProductId(currentVariant.getProduct().getId());
            variantDTO.setSku(currentVariant.getSku());
            variantDTO.setPrice(currentVariant.getPrice());
            variantDTO.setSalePrice(currentVariant.getSalePrice());
            variantDTO.setStock(currentVariant.getStockQuantity());
            
            // Varyantın ana görsel URL'sini al (eğer varsa)
            String mainImageUrl = currentVariant.getMainImageUrl();
            variantDTO.setVariantDescription(mainImageUrl); // Bu alan genellikle görsel URL için kullanılıyor
            
            variantDTO.setStatus(status);
            variantDTO.setActive(status.equals("active"));
            
            // Varyantı güncelle
            ProductVariantDTO updatedVariant = productService.updateProductVariant(variantId, variantDTO);
            return new ResponseEntity<>(updatedVariant, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Varyant statüsü güncellenirken hata: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}/similar")
    @PermitAll
    public ResponseEntity<List<Product>> getSimilarProducts(
            @PathVariable Long id,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(defaultValue = "4") int limit) {
        try {
            List<Product> similarProducts = productService.findSimilarProducts(id, category, brand, limit);
            return ResponseEntity.ok(similarProducts);
        } catch (Exception e) {
            System.err.println("Benzer ürünler getirilirken hata: " + e.getMessage());
            return ResponseEntity.ok(Collections.emptyList()); // Hata durumunda boş liste döndür
        }
    }

    // Ürün ara
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchProducts(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String sort,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String stockFilter,
            @RequestParam(required = false, defaultValue = "true") boolean includeVariants) {
        
        try {
            System.out.println("ProductController /search çağrıldı: q=" + q + 
                              ", page=" + page + 
                              ", size=" + size + 
                              ", sort=" + sort + 
                              ", category=" + category + 
                              ", brand=" + brand + 
                              ", minPrice=" + minPrice + 
                              ", maxPrice=" + maxPrice + 
                              ", stockFilter=" + stockFilter + 
                              ", includeVariants=" + includeVariants);
            
            // q parametresi boşsa tüm ürünleri getir
            Page<Product> productPage = productService.getProducts(page, size, sort, category, q, brand, 
                                                               minPrice, maxPrice, stockFilter);
            
            System.out.println("Arama sonuçları döndü. Toplam ürün sayısı: " + productPage.getTotalElements());
            
            // Eğer sonuç yoksa ve varyantlar dahil edilecekse, varyantlarda arama yap
            List<Product> results = new ArrayList<>(productPage.getContent());
            
            if (includeVariants && q != null && !q.isEmpty() && results.isEmpty()) {
                System.out.println("Aranan terim için ürün bulunamadı: " + q + ", varyantlarda aranıyor...");
                
                // Varyantlarda arama yap
                List<Product> variantResults = searchInVariants(q, category);
                results.addAll(variantResults);
                
                System.out.println("Varyantlarda arama sonucu: " + results.size() + " ürün bulundu.");
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", results);
            response.put("total", results.isEmpty() ? 0 : results.size());
            
            // Bulunan ürün isimlerini logla
            if (!results.isEmpty()) {
                System.out.println("Bulunan ürünler:");
                results.stream()
                    .limit(5)
                    .forEach(p -> System.out.println(" - " + p.getName()));
                
                if (results.size() > 5) {
                    System.out.println(" - ... ve " + (results.size() - 5) + " ürün daha");
                }
            } else {
                System.out.println("Arama sonucu ürün bulunamadı");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Arama sırasında hata: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    /**
     * Ürün varyantlarında arama yaparak ana ürünlere ulaşır
     */
    private List<Product> searchInVariants(String query, String category) {
        List<Product> results = new ArrayList<>();
        
        try {
            // Varyant repository'den doğrudan arama yapamadığımız için 
            // EntityManager ile JPQL sorgusu kullanacağız
            String jpql = "SELECT DISTINCT v.product FROM ProductVariant v " +
                          "JOIN v.attributeValues av " +
                          "JOIN v.product p " +
                          "JOIN p.store s " +
                          "WHERE v.active = true AND p.status = 'active' AND s.status = 'approved' " +
                          "AND (LOWER(av.value) LIKE LOWER(:query) OR LOWER(av.displayValue) LIKE LOWER(:query))";
            
            // Kategori filtresi varsa ekle
            if (category != null && !category.isEmpty()) {
                jpql += " AND (LOWER(p.category.name) = LOWER(:category) OR LOWER(p.category.slug) = LOWER(:category))";
            }
            
            TypedQuery<Product> typedQuery = entityManager.createQuery(jpql, Product.class);
            typedQuery.setParameter("query", "%" + query.toLowerCase() + "%");
            
            if (category != null && !category.isEmpty()) {
                typedQuery.setParameter("category", category.toLowerCase());
            }
            
            results = typedQuery.getResultList();
        } catch (Exception e) {
            System.err.println("Varyantlarda arama sırasında hata: " + e.getMessage());
        }
        
        return results;
    }

    // Popüler aramaları getir
    @GetMapping("/popular-searches")
    public ResponseEntity<List<PopularSearch>> getPopularSearches(
            @RequestParam(defaultValue = "5") int limit) {
        try {
            List<PopularSearch> popularSearches = popularSearchService.getPopularSearches(limit);
            return new ResponseEntity<>(popularSearches, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Arama sayacını arttır
    @PostMapping("/popular-searches/increment")
    public ResponseEntity<PopularSearch> incrementSearchCount(@RequestBody Map<String, String> payload) {
        try {
            String term = payload.get("term");
            if (term == null || term.trim().isEmpty()) {
                return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
            }
            
            PopularSearch updatedSearch = popularSearchService.incrementSearchCount(term);
            return new ResponseEntity<>(updatedSearch, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Admin ürün listesi için özel endpoint
    @GetMapping("/admin")
    public ResponseEntity<Map<String, Object>> getAdminProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String sort,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String stockFilter) {
        
        try {
            // Admin isteği olduğunu belirterek servis metodunu çağır
            Page<Product> productPage = productService.getProducts(page, size, sort, category, search, brand, 
                                                                  minPrice, maxPrice, stockFilter, true);
            
            Map<String, Object> response = new HashMap<>();
            response.put("items", productPage.getContent());
            response.put("total", productPage.getTotalElements());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace(); // Hata ayıklama için konsola yazdır
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Ürün durum güncelle
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<Product> updateProductStatus(@PathVariable("id") long id, @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            if (status == null) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // status değeri geçerli mi kontrol et
            if (!status.equals("active") && !status.equals("inactive") && !status.equals("pending") && !status.equals("rejected")) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            Product product = productService.getProduct(id);
            product.setStatus(status);
            Product updatedProduct = productService.updateProduct(id, product);
            return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Sadece ürün stoğunu güncelle
     */
    @PatchMapping("/{productId}/stock")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<Product> updateProductStock(
            @PathVariable("productId") long productId,
            @RequestBody Map<String, Integer> stockUpdate) {
        try {
            Integer stock = stockUpdate.get("stock");
            if (stock == null) {
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
            }
            
            // Önce mevcut ürünü getir
            Optional<Product> productResult = productRepository.findById(productId);
            if (!productResult.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            
            Product currentProduct = productResult.get();
            
            // Sadece stok bilgisini güncelle
            currentProduct.setStock(stock);
            currentProduct.setTotalStock(stock);
            
            // Ürünü kaydet
            Product updatedProduct = productRepository.save(currentProduct);
            
            return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Ürün stoğu güncellenirken hata: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Ürüne resim ekle
    @PostMapping("/{id}/images")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadProductImage(
            @PathVariable("id") long id,
            @RequestParam("image") MultipartFile file,
            @RequestParam("displayOrder") Integer displayOrder,
            @RequestParam("isMain") Boolean isMain) {
        
        try {
            // Ürünü kontrol et
            Product product = productService.getProduct(id);
            
            // Dosya adını benzersiz yap
            String fileName = StringUtils.cleanPath(file.getOriginalFilename());
            String uniqueFileName = id + "_" + System.currentTimeMillis() + "_" + fileName;
            
            // Dosya yolu oluştur
            String uploadDir = "uploads/products/" + id;
            Path uploadPath = Paths.get(uploadDir);
            
            // Klasör yoksa oluştur
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Dosyayı kaydet
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            // Resim URL'i oluştur
            String imageUrl = "http://localhost:8080/api/files/products/" + id + "/" + uniqueFileName;
            
            // Eğer bu resim ana resim olacaksa, diğer ana resimleri güncelle
            if (isMain) {
                for (ProductImage image : product.getImages()) {
                    if (image.getIsMain()) {
                        image.setIsMain(false);
                        productImageRepository.save(image);
                    }
                }
            }
            
            // ProductImage oluştur ve kaydet
            ProductImage productImage = new ProductImage();
            productImage.setProduct(product);
            productImage.setImageUrl(imageUrl);
            productImage.setDisplayOrder(displayOrder);
            productImage.setIsMain(isMain);
            
            // Resmi kaydederek kullan
            ProductImage savedImage = productImageRepository.save(productImage);
            
            // Yanıt döndür
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedImage.getId());
            response.put("imageUrl", savedImage.getImageUrl());
            response.put("displayOrder", savedImage.getDisplayOrder());
            response.put("isMain", savedImage.getIsMain());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Resim yüklenirken bir hata oluştu: " + e.getMessage());
        }
    }

    // Varyant resmi yükleme endpointi - düzeltilmiş versiyon
    @PostMapping("/{productId}/variants/{variantId}/images")
    @PreAuthorize("hasRole('SELLER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadVariantImage(
            @PathVariable("productId") long productId,
            @PathVariable("variantId") long variantId,
            @RequestParam("image") MultipartFile file,
            @RequestParam("displayOrder") Integer displayOrder,
            @RequestParam("isMain") Boolean isMain) {
        
        try {
            System.out.println("Varyant resmi yükleme isteği alındı: productId=" + productId + ", variantId=" + variantId);
            
            // Varyantı kontrol et
            Optional<ProductVariant> variantResult = productVariantRepository.findById(variantId);
            if (!variantResult.isPresent()) {
                System.out.println("HATA: Varyant bulunamadı: " + variantId);
                return ResponseEntity.notFound().build();
            }
            
            ProductVariant variant = variantResult.get();
            System.out.println("Varyant bulundu: " + variant.getId() + ", SKU: " + variant.getSku());
            
            // Ürün ID'si ile varyant eşleşiyor mu kontrol et
            if (variant.getProduct().getId() != productId) {
                System.out.println("HATA: Varyant belirtilen ürüne ait değil. Varyant ürünü: " + variant.getProduct().getId() + ", istek ürünü: " + productId);
                return ResponseEntity.badRequest()
                        .body("Varyant, belirtilen ürüne ait değil");
            }
            
            // Dosya adını benzersiz yap
            String fileName = StringUtils.cleanPath(file.getOriginalFilename());
            String uniqueFileName = productId + "_" + variantId + "_" + System.currentTimeMillis() + "_" + fileName;
            
            // Dosya yolu oluştur - ürün klasörünü kullan ama alt klasör olarak variants/variantId ekle
            String uploadDir = "uploads/products/" + productId + "/variants/" + variantId;
            Path uploadPath = Paths.get(uploadDir);
            
            // Klasör yoksa oluştur
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Dosyayı kaydet
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            System.out.println("Dosya kaydedildi: " + filePath);
            
            // Resim URL'i oluştur
            String imageUrl = "http://localhost:8080/api/files/products/" + productId + "/variants/" + variantId + "/" + uniqueFileName;
            System.out.println("Resim URL'i: " + imageUrl);
            
            // Eğer bu resim ana resim olacaksa, diğer ana resimleri güncelle
            if (isMain) {
                System.out.println("Ana resim olarak işaretlendi. Diğer ana resimler güncelleniyor...");
                for (VariantImage image : variant.getImages()) {
                    if (image.getIsMain()) {
                        image.setIsMain(false);
                        variantImageRepository.save(image);
                    }
                }
            }
            
            // VariantImage oluştur ve kaydet
            VariantImage variantImage = new VariantImage();
            variantImage.setVariant(variant);
            variantImage.setImageUrl(imageUrl);
            variantImage.setDisplayOrder(displayOrder);
            variantImage.setIsMain(isMain);
            
            // İlişkiyi her iki taraftan da kur
            variant.getImages().add(variantImage);
            
            // Önce varyant resmi kaydet
            VariantImage savedImage = variantImageRepository.save(variantImage);
            System.out.println("Varyant resmi kaydedildi: " + savedImage.getId());
            
            // Şimdi varyantı güncelle
            productVariantRepository.save(variant);
            System.out.println("Varyant güncellendi: " + variant.getId() + ", resim sayısı: " + variant.getImages().size());
            
            // Yanıt döndür
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedImage.getId());
            response.put("imageUrl", savedImage.getImageUrl());
            response.put("displayOrder", savedImage.getDisplayOrder());
            response.put("isMain", savedImage.getIsMain());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("HATA: Varyant resmi yüklenirken bir sorun oluştu: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Varyant resmi yüklenirken bir hata oluştu: " + e.getMessage());
        }
    }
} 