package com.example.backend.service;

import com.example.backend.model.Product;
import com.example.backend.model.Category;
import com.example.backend.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import com.example.backend.dto.ProductAttributeDTO;
import com.example.backend.dto.ProductAttributeDTO.AttributeValueDTO;
import com.example.backend.dto.ProductVariantDTO;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.math.RoundingMode;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.ProductAttribute;
import com.example.backend.model.ProductAttributeValue;
import com.example.backend.model.VariantImage;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.ProductAttributeRepository;
import com.example.backend.repository.VariantImageRepository;
import com.example.backend.repository.ProductAttributeValueRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.Store;
import com.example.backend.repository.BrandRepository;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.StoreRepository;
import org.springframework.security.access.AccessDeniedException;
import com.example.backend.model.ProductImage;
import com.example.backend.repository.ProductImageRepository;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductAttributeRepository productAttributeRepository;
    private final VariantImageRepository variantImageRepository;
    private final ProductAttributeValueRepository productAttributeValueRepository;
    
    // Yeni eklenen Repository'ler
    private final com.example.backend.repository.CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final StoreRepository storeRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public Page<Product> getProducts(int page, int size, String sort, String category, String search, String brand,
                                   Double minPrice, Double maxPrice, String stockFilter, Boolean isAdmin) {
        System.out.println("ProductService.getProducts çağrıldı");
        Pageable pageable;
        
        System.out.println("getProducts çağrısı alındı: " +
                           "page=" + page + 
                           ", size=" + size + 
                           ", sort=" + sort + 
                           ", category=" + category + 
                           ", search=" + search + 
                           ", brand=" + brand +
                           ", minPrice=" + minPrice +
                           ", maxPrice=" + maxPrice +
                           ", stockFilter=" + stockFilter +
                           ", isAdmin=" + isAdmin);
        
        // Sıralama için
        if (sort != null && !sort.isEmpty()) {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            Sort.Direction direction = sortParams.length > 1 ? 
                sortParams[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC : 
                Sort.Direction.ASC;
            
            pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        } else {
            pageable = PageRequest.of(page, size);
        }
        
        // CriteriaQuery ile esnek sorgu oluşturma
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Product> query = cb.createQuery(Product.class);
        Root<Product> product = query.from(Product.class);
        
        // Predicate listesi oluştur, dinamik olarak eklenecek koşullar için
        List<Predicate> predicates = new ArrayList<>();
        
        // Admin panel için değilse sadece aktif ürünleri göster
        if (isAdmin == null || !isAdmin) {
            predicates.add(cb.equal(product.get("status"), "active"));
            
            // Sadece müşteri tarafı için mağaza durumunu kontrol et
            Join<Product, Store> storeJoin = product.join("store", JoinType.LEFT);
            predicates.add(cb.equal(storeJoin.get("status"), "approved"));
        }
        
        // Kategori filtresi varsa
        if (category != null && !category.isEmpty()) {
            try {
                // Kategori ID olarak dene
                Long categoryId = Long.parseLong(category);
                System.out.println("Kategori ID: " + categoryId);
                
                // Admin veya normal kullanıcı sorgusuna göre farklı repository metodunu çağır
                List<Product> categoryProducts;
                if (isAdmin != null && isAdmin) {
                    System.out.println("Admin için kategori ürünleri getiriliyor (store.status filtresi olmadan)");
                    categoryProducts = productRepository.findByCategoryHierarchyForAdmin(categoryId);
                } else {
                    System.out.println("Normal kullanıcı için kategori ürünleri getiriliyor (store.status = 'approved')");
                    categoryProducts = productRepository.findByCategoryHierarchy(categoryId);
                }
                
                if (!categoryProducts.isEmpty()) {
                    // Ürün ID'lerini al
                    List<Long> productIds = categoryProducts.stream()
                        .map(Product::getId)
                        .collect(Collectors.toList());
                        
                    System.out.println("Kategori ürünleri: " + productIds.size());
                    
                    // IN operatörü ile ürün ID'lerine göre filtreleme
                    predicates.add(product.get("id").in(productIds));
                } else {
                    // Kategori için ürün bulunamadı, boş sonuç döndürmek için olmayacak bir koşul
                    System.out.println("Kategori için ürün bulunamadı");
                    predicates.add(cb.equal(cb.literal(1), 0)); // her zaman false
                }
            } catch (NumberFormatException e) {
                // Kategori bir slug ise
                System.out.println("Kategori Slug: " + category);
                
                // Admin veya normal kullanıcı sorgusuna göre farklı repository metodunu çağır
                List<Product> categoryProducts;
                if (isAdmin != null && isAdmin) {
                    System.out.println("Admin için slug ürünleri getiriliyor (store.status filtresi olmadan)");
                    categoryProducts = productRepository.findByCategorySlugHierarchyForAdmin(category);
                } else {
                    System.out.println("Normal kullanıcı için slug ürünleri getiriliyor (store.status = 'approved')");
                    categoryProducts = productRepository.findByCategorySlugHierarchy(category);
                }
                
                if (!categoryProducts.isEmpty()) {
                    List<Long> productIds = categoryProducts.stream()
                        .map(Product::getId)
                        .collect(Collectors.toList());
                        
                    System.out.println("Slug ürünleri: " + productIds.size());
                    predicates.add(product.get("id").in(productIds));
                } else {
                    // Kategori için ürün bulunamadı
                    System.out.println("Slug için ürün bulunamadı");
                    predicates.add(cb.equal(cb.literal(1), 0)); // her zaman false
                }
            }
        }
        
        // Marka filtresi varsa
        if (brand != null && !brand.isEmpty()) {
            System.out.println("Marka değeri: " + brand);
            
            // Virgülle ayrılmış ID'ler kontrol et (çoklu marka)
            if (brand.contains(",")) {
                System.out.println("Çoklu marka ID'leri tespit edildi: " + brand);
                String[] brandIds = brand.split(",");
                List<Long> brandIdList = new ArrayList<>();
                
                for (String brandIdStr : brandIds) {
                    try {
                        Long brandId = Long.parseLong(brandIdStr.trim());
                        brandIdList.add(brandId);
                        System.out.println("Marka ID eklendi: " + brandId);
                    } catch (NumberFormatException e) {
                        System.out.println("Geçersiz marka ID'si, atlanıyor: " + brandIdStr);
                    }
                }
                
                if (!brandIdList.isEmpty()) {
                    System.out.println("Toplam " + brandIdList.size() + " marka için filtre uygulanıyor");
                    Join<Product, Object> brandJoin = product.join("brand");
                    predicates.add(brandJoin.get("id").in(brandIdList));
                }
            } else {
                // Tekil marka ID veya slug/isim
                try {
                    Long brandId = Long.parseLong(brand);
                    System.out.println("Marka ID: " + brandId);
                    
                    // Brand ID'ye göre filtrele
                    Join<Product, Object> brandJoin = product.join("brand");
                    predicates.add(cb.equal(brandJoin.get("id"), brandId));
                } catch (NumberFormatException e) {
                    // Marka ismi veya slug ise
                    System.out.println("Marka Slug/İsim: " + brand);
                    
                    Join<Product, Object> brandJoin = product.join("brand");
                    predicates.add(
                        cb.or(
                            cb.equal(cb.lower(brandJoin.get("name")), brand.toLowerCase()),
                            cb.equal(cb.lower(brandJoin.get("slug")), brand.toLowerCase())
                        )
                    );
                }
            }
        }
        
        // Fiyat aralığı filtreleri
        if (minPrice != null) {
            System.out.println("Minimum fiyat filtresi: " + minPrice);
            predicates.add(cb.greaterThanOrEqualTo(product.get("price"), minPrice));
        }
        
        if (maxPrice != null) {
            System.out.println("Maximum fiyat filtresi: " + maxPrice);
            predicates.add(cb.lessThanOrEqualTo(product.get("price"), maxPrice));
        }
        
        // Stok durumu filtresi
        if (stockFilter != null && !stockFilter.isEmpty()) {
            System.out.println("Stok durumu filtresi: " + stockFilter);
            
            if ("instock".equalsIgnoreCase(stockFilter)) {
                predicates.add(cb.greaterThan(product.get("stock"), 0));
            } else if ("outofstock".equalsIgnoreCase(stockFilter)) {
                predicates.add(cb.equal(product.get("stock"), 0));
            }
        }
        
        // Arama filtresi varsa
        if (search != null && !search.isEmpty()) {
            System.out.println("Arama terimi: " + search);
            
            // İsim, açıklama ve markada arama yapma
            String searchPattern = "%" + search.toLowerCase() + "%";
            System.out.println("Arama modeli: " + searchPattern);
            
            // Debug için join ve koşul oluşturma
            Join<Product, Object> brandJoin = product.join("brand", JoinType.LEFT);
            System.out.println("Brand join oluşturuldu");
            
            Predicate namePredicate = cb.like(cb.lower(product.get("name")), searchPattern);
            Predicate descPredicate = cb.like(cb.lower(product.get("description")), searchPattern);
            Predicate brandPredicate = cb.like(cb.lower(brandJoin.get("name")), searchPattern);
            
            System.out.println("Arama koşulları oluşturuldu");
            
            predicates.add(
                cb.or(
                    namePredicate,
                    descPredicate,
                    brandPredicate
                )
            );
            
            System.out.println("Arama koşulları eklendi");
        }
        
        // Tüm koşulları birleştir
        if (!predicates.isEmpty()) {
            query.where(cb.and(predicates.toArray(new Predicate[0])));
        }
        
        // Sıralama uygula
        if (sort != null && !sort.isEmpty()) {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            boolean isAscending = sortParams.length <= 1 || !sortParams[1].equalsIgnoreCase("desc");
            
            if (isAscending) {
                query.orderBy(cb.asc(product.get(sortField)));
            } else {
                query.orderBy(cb.desc(product.get(sortField)));
            }
        }
        
        // Toplam sayıyı bul
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);
        countQuery.select(cb.count(countRoot));
        
        // Aynı koşulları count sorgusuna da ekle
        List<Predicate> countPredicates = new ArrayList<>();
        
        // Her bir predicate'i count sorgusuna da ekle
        // (Sorgu koşullarını yeniden oluşturmalıyız)
        countPredicates.add(cb.equal(countRoot.get("status"), "active"));
        
        if (category != null && !category.isEmpty()) {
            try {
                Long categoryId = Long.parseLong(category);
                List<Product> categoryProducts;
                
                // Admin veya normal kullanıcı sorgusuna göre farklı repository metodunu çağır
                if (isAdmin != null && isAdmin) {
                    categoryProducts = productRepository.findByCategoryHierarchyForAdmin(categoryId);
                } else {
                    categoryProducts = productRepository.findByCategoryHierarchy(categoryId);
                }
                
                if (!categoryProducts.isEmpty()) {
                    List<Long> productIds = categoryProducts.stream()
                        .map(Product::getId)
                        .collect(Collectors.toList());
                    countPredicates.add(countRoot.get("id").in(productIds));
                } else {
                    countPredicates.add(cb.equal(cb.literal(1), 0));
                }
            } catch (NumberFormatException e) {
                List<Product> categoryProducts;
                
                // Admin veya normal kullanıcı sorgusuna göre farklı repository metodunu çağır  
                if (isAdmin != null && isAdmin) {
                    categoryProducts = productRepository.findByCategorySlugHierarchyForAdmin(category);
                } else {
                    categoryProducts = productRepository.findByCategorySlugHierarchy(category);
                }
                
                if (!categoryProducts.isEmpty()) {
                    List<Long> productIds = categoryProducts.stream()
                        .map(Product::getId)
                        .collect(Collectors.toList());
                    countPredicates.add(countRoot.get("id").in(productIds));
                } else {
                    countPredicates.add(cb.equal(cb.literal(1), 0));
                }
            }
        }
        
        if (brand != null && !brand.isEmpty()) {
            // Virgülle ayrılmış ID'ler kontrol et (çoklu marka)
            if (brand.contains(",")) {
                String[] brandIds = brand.split(",");
                List<Long> brandIdList = new ArrayList<>();
                
                for (String brandIdStr : brandIds) {
                    try {
                        Long brandId = Long.parseLong(brandIdStr.trim());
                        brandIdList.add(brandId);
                    } catch (NumberFormatException e) {
                        // Geçersiz ID, atla
                    }
                }
                
                if (!brandIdList.isEmpty()) {
                    Join<Product, Object> brandJoin = countRoot.join("brand");
                    countPredicates.add(brandJoin.get("id").in(brandIdList));
                }
            } else {
                // Tekil marka ID veya slug/isim
                try {
                    Long brandId = Long.parseLong(brand);
                    Join<Product, Object> brandJoin = countRoot.join("brand");
                    countPredicates.add(cb.equal(brandJoin.get("id"), brandId));
                } catch (NumberFormatException e) {
                    Join<Product, Object> brandJoin = countRoot.join("brand");
                    countPredicates.add(
                        cb.or(
                            cb.equal(cb.lower(brandJoin.get("name")), brand.toLowerCase()),
                            cb.equal(cb.lower(brandJoin.get("slug")), brand.toLowerCase())
                        )
                    );
                }
            }
        }
        
        // Fiyat aralığı filtreleri - Count sorgusu için de ekleyelim
        if (minPrice != null) {
            System.out.println("Count sorgusu için minimum fiyat filtresi: " + minPrice);
            countPredicates.add(cb.greaterThanOrEqualTo(countRoot.get("price"), minPrice));
        }
        
        if (maxPrice != null) {
            System.out.println("Count sorgusu için maximum fiyat filtresi: " + maxPrice);
            countPredicates.add(cb.lessThanOrEqualTo(countRoot.get("price"), maxPrice));
        }
        
        // Stok durumu filtresi - Count sorgusu için de ekleyelim
        if (stockFilter != null && !stockFilter.isEmpty()) {
            System.out.println("Count sorgusu için stok durumu filtresi: " + stockFilter);
            
            if ("instock".equalsIgnoreCase(stockFilter)) {
                countPredicates.add(cb.greaterThan(countRoot.get("stock"), 0));
            } else if ("outofstock".equalsIgnoreCase(stockFilter)) {
                countPredicates.add(cb.equal(countRoot.get("stock"), 0));
            }
        }
        
        if (search != null && !search.isEmpty()) {
            String searchPattern = "%" + search.toLowerCase() + "%";
            countPredicates.add(
                cb.or(
                    cb.like(cb.lower(countRoot.get("name")), searchPattern),
                    cb.like(cb.lower(countRoot.get("description")), searchPattern),
                    // Marka alanında da arama yap
                    cb.like(cb.lower(countRoot.join("brand").get("name")), searchPattern)
                )
            );
        }
        
        // Count sorgusuna koşulları ekle
        if (!countPredicates.isEmpty()) {
            countQuery.where(cb.and(countPredicates.toArray(new Predicate[0])));
        }
        
        // Toplam ürün sayısını al
        Long total = entityManager.createQuery(countQuery).getSingleResult();
        System.out.println("Toplam ürün sayısı: " + total);
        
        // Sayfalama uygula
        TypedQuery<Product> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        
        // Sonuçları al
        List<Product> products = typedQuery.getResultList();
        System.out.println("Döndürülen ürün sayısı: " + products.size());
        
        // Page nesnesi oluştur ve döndür
        return new PageImpl<>(products, pageable, total);
    }

    // Admin için düzgün çalışması için aynı metodu farklı parametrelerle de tanımlayalım
    @Transactional(readOnly = true)
    public Page<Product> getProducts(int page, int size, String sort, String category, String search, String brand,
                                   Double minPrice, Double maxPrice, String stockFilter) {
        // Varsayılan olarak admin değil diye işaretleyip ana metoda yönlendir
        return getProducts(page, size, sort, category, search, brand, minPrice, maxPrice, stockFilter, false);
    }

    public List<Product> getFeaturedProducts() {
        return productRepository.findByActiveAndFeaturedTrue(true);
    }

    public Product getProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + id));
        
        // Ürünün mağazası onaylanmış mı kontrol et
        if (product.getStore() == null || !"approved".equals(product.getStore().getStatus())) {
            throw new ResourceNotFoundException("Ürün bulunamadı: " + id);
        }
        
        return product;
    }

    @Transactional(readOnly = true)
    public List<Product> getProductsByCategory(Long categoryId) {
        try {
            // Önce kategori id'ye göre ürünleri bul
            Page<Product> productPage = productRepository.findByCategoryId(categoryId, PageRequest.of(0, 100));
            List<Product> products = productPage.getContent();
            
            // Eğer ürün bulunamazsa alt kategorilere de bak
            if (products.isEmpty()) {
                products = productRepository.findByCategoryHierarchy(categoryId);
            }
            
            return products;
        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    public List<Product> getProductsByCategorySlug(String slug) {
        System.out.println("getProductsByCategorySlug çağrıldı: slug=" + slug);
        
        // Türkçe karakterleri normalize et
        String normalizedSlug = normalizeSlug(slug);
        if (!normalizedSlug.equals(slug)) {
            System.out.println("Slug normalize edildi: " + slug + " -> " + normalizedSlug);
        }
        
        List<Product> products = productRepository.findByCategorySlugHierarchy(slug);
        System.out.println("Slug " + slug + " için bulunan ürünler: " + products.size());
        
        if (products.isEmpty()) {
            // Normalized slug ile tekrar dene
            if (!normalizedSlug.equals(slug)) {
                System.out.println("Normalize edilmiş slug ile tekrar deneniyor: " + normalizedSlug);
                products = productRepository.findByCategorySlugHierarchy(normalizedSlug);
                System.out.println("Normalize edilmiş slug " + normalizedSlug + " için bulunan ürünler: " + products.size());
            }
            
            // Hala boşsa, alternatif yaklaşım kullan
            if (products.isEmpty()) {
                System.out.println("Ana sorgu sonuç vermedi, alternatif sorgu deneniyor...");
                products = productRepository.findSimpleProductsByCategorySlugHierarchy(slug);
                System.out.println("Alternatif sorgu sonucu: " + products.size() + " ürün bulundu");
                
                // Alternatif sorgu da başarısız olursa, entityManager kullan
                if (products.isEmpty()) {
                    // Slug'a göre kategoriyi bul
                    List<Category> categories = entityManager.createQuery(
                        "SELECT c FROM Category c WHERE LOWER(c.slug) = LOWER(:slug) OR LOWER(c.slug) = LOWER(:normalizedSlug)", 
                        Category.class)
                        .setParameter("slug", slug)
                        .setParameter("normalizedSlug", normalizedSlug)
                        .getResultList();
                    
                    if (!categories.isEmpty()) {
                        Category category = categories.get(0);
                        System.out.println("Slug için bulunan kategori ID: " + category.getId() + ", Ad: " + category.getName());
                        
                        // Bu kategori ID'si ile ürünleri doğrudan sorgula
                        List<Product> directProducts = entityManager.createQuery(
                            "SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.status = 'active'", 
                            Product.class)
                            .setParameter("categoryId", category.getId())
                            .getResultList();
                        
                        System.out.println("Slug -> Kategori ID yoluyla bulunan ürünler: " + directProducts.size());
                        if (!directProducts.isEmpty()) {
                            products = directProducts;
                        } else {
                            // Alt kategorilerde de arama yap
                            System.out.println("Alt kategorilerde arama yapılıyor...");
                            try {
                                List<Product> hierarchyProducts = productRepository.findByCategoryHierarchy(category.getId());
                                System.out.println("Alt kategorilerde bulunan ürünler: " + hierarchyProducts.size());
                                if (!hierarchyProducts.isEmpty()) {
                                    products = hierarchyProducts;
                                }
                            } catch (Exception e) {
                                System.err.println("Alt kategori sorgusu sırasında hata: " + e.getMessage());
                            }
                        }
                    } else {
                        System.out.println("Bu slug'a sahip kategori bulunamadı: " + slug);
                    }
                }
            }
        }
        
        return products;
    }
    
    /**
     * Slug string'ini normalize eder (Türkçe karakterleri İngilizce karakterlere çevirir)
     */
    private String normalizeSlug(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        
        return slug.toLowerCase()
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ı", "i")
                .replace("i̇", "i")
                .replace("ö", "o")
                .replace("ç", "c")
                .replace(" ", "-"); // Boşlukları tire ile değiştir
    }

    public List<Product> getDiscountedProducts() {
        return productRepository.findDiscountedProducts();
    }

    public List<Product> getBestSellers() {
        return productRepository.findBestSellers();
    }

    public List<Product> getNewArrivals() {
        Page<Product> newArrivals = productRepository.findByActiveOrderByCreatedAtDesc(true, PageRequest.of(0, 10));
        return newArrivals.getContent();
    }

    public Product getProductBySlug(String slug) {
        return productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + slug));
    }

    @Transactional
    public Product addProduct(Product product) {
        System.out.println("Ürün ekleniyor: " + product.getName());
        
        // Slug oluştur (eğer boşsa)
        if (product.getSlug() == null || product.getSlug().trim().isEmpty()) {
            String slug = generateSlug(product.getName());
            product.setSlug(slug);
            System.out.println("Ürün için slug oluşturuldu: " + slug);
        }
        
        // Gelen ürünün kategori bilgisini kontrol et
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            System.out.println("Kategori ID: " + product.getCategory().getId());
            Long categoryId = product.getCategory().getId();
            
            // CategoryRepository kullanarak tam nesneyi yükle
            categoryRepository.findById(categoryId).ifPresent(category -> {
                System.out.println("Kategori yüklendi: " + category.getName());
                product.setCategory(category);
            });
        } else {
            throw new IllegalArgumentException("Ürün kategorisi belirtilmelidir");
        }
        
        // Brand bilgisini kontrol et ve veritabanından tam nesneyi getir
        if (product.getBrand() != null && product.getBrand().getId() != null) {
            Long brandId = product.getBrand().getId();
            
            // BrandRepository kullanarak tam nesneyi yükle
            brandRepository.findById(brandId).ifPresent(brand -> {
                System.out.println("Brand yüklendi: " + brand.getName());
                product.setBrand(brand);
            });
        }
        
        // Store bilgisini kontrol et ve veritabanından tam nesneyi getir
        if (product.getStore() != null && product.getStore().getId() != null) {
            Long storeId = product.getStore().getId();
            
            // StoreRepository kullanarak tam nesneyi yükle
            storeRepository.findById(storeId).ifPresent(store -> {
                System.out.println("Store yüklendi: " + store.getName());
                product.setStore(store);
            });
        }
        
        // Kaydı yapmadan önce tam kontrol amaçlı logla
        System.out.println("Kaydedilecek ürün: " + product.getName());
        System.out.println("- Kategori: " + (product.getCategory() != null ? 
                                             product.getCategory().getId() + " - " + product.getCategory().getName() : "null"));
        System.out.println("- Brand: " + (product.getBrand() != null ? 
                                         product.getBrand().getId() + " - " + product.getBrand().getName() : "null"));
        System.out.println("- Store: " + (product.getStore() != null ? 
                                         product.getStore().getId() + " - " + product.getStore().getName() : "null"));
        
        // Ürünü kaydet ve dön
        return productRepository.save(product);
    }
    
    /**
     * Ürün adından slug oluşturur
     * @param name Ürün adı
     * @return URL-dostu slug
     */
    private String generateSlug(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "";
        }
        
        // Türkçe karakterleri İngilizce karakterlere dönüştür
        String slug = name.toLowerCase()
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ı", "i")
                .replace("i̇", "i")
                .replace("ö", "o")
                .replace("ç", "c")
                .replace(" ", "-") // Boşlukları tire ile değiştir
                .replaceAll("[^a-z0-9\\-]", ""); // Alfanümerik ve tire dışındaki karakterleri kaldır
        
        // Ardışık tireleri tek tireye dönüştür
        slug = slug.replaceAll("-+", "-");
        
        // Başlangıç ve bitişteki tireleri kaldır
        slug = slug.replaceAll("^-|-$", "");
        
        // Slug'ın benzersiz olduğundan emin ol
        String baseSlug = slug;
        int counter = 1;
        while (productRepository.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + counter;
            counter++;
        }
        
        return slug;
    }

    @Transactional
    public Product updateProduct(Long id, Product productDetails) {
        Product product = getProduct(id);
        
        // Temel bilgileri güncelle
        product.setName(productDetails.getName());
        product.setDescription(productDetails.getDescription());
        product.setPrice(productDetails.getPrice());
        product.setStock(productDetails.getStock());
        product.setCategory(productDetails.getCategory());
        product.setStatus(productDetails.getStatus());
        product.setFeatured(productDetails.isFeatured());
        product.setSlug(productDetails.getSlug());
        product.setMinPrice(productDetails.getMinPrice());
        product.setMaxPrice(productDetails.getMaxPrice());
        product.setTotalStock(productDetails.getTotalStock());
        product.setBrand(productDetails.getBrand());
        
        // AttributeValues, Variants ve Images gibi ilişkili koleksiyonları güncelleme
        // Bu kısım daha karmaşık olabilir ve özel işleyicilere ihtiyaç duyabilir
        
        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> 
            new ResourceNotFoundException("Ürün bulunamadı"));
        productRepository.delete(product);
    }
    
    /**
     * Belirli bir mağazaya ait tüm ürünleri inactive olarak işaretle
     */
    @Transactional
    public void deactivateAllProductsByStore(Long storeId) {
        List<Product> products = productRepository.findAllByStoreId(storeId);
        
        for (Product product : products) {
            product.setStatus("inactive");
        }
        
        productRepository.saveAll(products);
        System.out.println("Mağaza ID: " + storeId + " için " + products.size() + " ürün inactive olarak işaretlendi.");
        
        // Ayrıca bu mağazanın tüm ürün varyantlarını da inactive yap
        deactivateAllProductVariantsByStore(storeId);
    }
    
    /**
     * Belirli bir mağazaya ait tüm ürün varyantlarını inactive olarak işaretle
     */
    @Transactional
    public void deactivateAllProductVariantsByStore(Long storeId) {
        // Önce mağazaya ait tüm ürünleri al
        List<Product> products = productRepository.findAllByStoreId(storeId);
        
        // Ürünlerin her biri için varyantları güncelle
        int totalVariantsUpdated = 0;
        for (Product product : products) {
            // Ürüne ait tüm varyantları getir
            List<ProductVariant> variants = productVariantRepository.findByProductId(product.getId());
            
            // Her varyantın durumunu inactive olarak güncelle
            for (ProductVariant variant : variants) {
                variant.setStatus("inactive");
                variant.setActive(false);
            }
            
            // Varyantları toplu kaydet
            if (!variants.isEmpty()) {
                productVariantRepository.saveAll(variants);
                totalVariantsUpdated += variants.size();
            }
        }
        
        System.out.println("Mağaza ID: " + storeId + " için " + totalVariantsUpdated + " ürün varyantı inactive olarak işaretlendi.");
    }
    
    /**
     * Belirli bir mağazaya ait tüm ürünleri active olarak işaretle
     */
    @Transactional
    public void activateAllProductsByStore(Long storeId) {
        List<Product> products = productRepository.findAllByStoreId(storeId);
        
        for (Product product : products) {
            product.setStatus("active");
        }
        
        productRepository.saveAll(products);
        System.out.println("Mağaza ID: " + storeId + " için " + products.size() + " ürün active olarak işaretlendi.");
    }
    
    /**
     * Belirli bir mağazaya ait tüm ürün varyantlarını active olarak işaretle
     */
    @Transactional
    public void activateAllProductVariantsByStore(Long storeId) {
        // Önce mağazaya ait tüm ürünleri al
        List<Product> products = productRepository.findAllByStoreId(storeId);
        
        // Ürünlerin her biri için varyantları güncelle
        int totalVariantsUpdated = 0;
        for (Product product : products) {
            // Ürüne ait tüm varyantları getir
            List<ProductVariant> variants = productVariantRepository.findByProductId(product.getId());
            
            // Her varyantın durumunu active olarak güncelle
            for (ProductVariant variant : variants) {
                variant.setStatus("active");
                variant.setActive(true);
            }
            
            // Varyantları toplu kaydet
            if (!variants.isEmpty()) {
                productVariantRepository.saveAll(variants);
                totalVariantsUpdated += variants.size();
            }
        }
        
        System.out.println("Mağaza ID: " + storeId + " için " + totalVariantsUpdated + " ürün varyantı active olarak işaretlendi.");
    }
    
    /**
     * Tüm benzersiz markaları listeler
     * @return Markaların listesi
     */
    @Transactional(readOnly = true)
    public List<String> getAllBrands() {
        // Criteria API ile benzersiz markaları çek
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<String> query = cb.createQuery(String.class);
        Root<Product> product = query.from(Product.class);
        
        // Yalnızca aktif ürünlerden markayı seç
        query.select(product.get("brand")).where(cb.equal(product.get("status"), "active"));
        
        // Benzersiz markaları al
        query.distinct(true);
        
        // Markaya göre sırala
        query.orderBy(cb.asc(product.get("brand")));
        
        // null markalar ve boş stringler hariç tüm markaları getir
        List<String> brands = entityManager.createQuery(query)
            .getResultStream()
            .filter(Objects::nonNull)
            .filter(brand -> !brand.trim().isEmpty())
            .collect(Collectors.toList());
        
        return brands;
    }

    /**
     * Markaya göre ürünleri getir
     */
    @Transactional(readOnly = true)
    public Page<Product> getProductsByBrand(Long brandId, int page, int size, String sort) {
        Pageable pageable;
        
        // Sıralama için
        if (sort != null && !sort.isEmpty()) {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            Sort.Direction direction = sortParams.length > 1 ? 
                sortParams[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC : 
                Sort.Direction.ASC;
            
            pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        } else {
            pageable = PageRequest.of(page, size);
        }
        
        // Criteria API kullanarak dinamik sorgu oluşturma
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Product> query = cb.createQuery(Product.class);
        Root<Product> product = query.from(Product.class);
        
        // Aktif ürünler için koşul
        Predicate activePredicate = cb.equal(product.get("status"), "active");
        
        // Marka için koşul - brand_id yabancı anahtarını kullan
        Predicate brandPredicate = cb.equal(product.get("brand").get("id"), brandId);
        
        // Koşulları birleştir
        query.where(cb.and(activePredicate, brandPredicate));
        
        // Sıralama
        if (sort != null && !sort.isEmpty()) {
            String[] sortParams = sort.split(",");
            String sortField = sortParams[0];
            boolean isAscending = sortParams.length <= 1 || !sortParams[1].equalsIgnoreCase("desc");
            
            if (isAscending) {
                query.orderBy(cb.asc(product.get(sortField)));
            } else {
                query.orderBy(cb.desc(product.get(sortField)));
            }
        }
        
        // Toplam sayıyı almak için count sorgusu
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);
        countQuery.select(cb.count(countRoot));
        countQuery.where(cb.and(
            cb.equal(countRoot.get("status"), "active"),
            cb.equal(countRoot.get("brand").get("id"), brandId)
        ));
        
        Long total = entityManager.createQuery(countQuery).getSingleResult();
        
        // Sayfalama uygula
        TypedQuery<Product> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        
        List<Product> products = typedQuery.getResultList();
        
        // Custom Page implementasyonu dönüştür
        return new PageImpl<>(
            products, pageable, total
        );
    }

    /**
     * Ürün kategorisine göre dinamik özellikler oluştur
     */
    private List<ProductAttributeDTO> generateAttributesForProduct(Product product) {
        List<ProductAttributeDTO> attributes = new ArrayList<>();
        String category = product.getCategory().getName().toLowerCase();

        // Kategori bazlı özellik kontrolü
        if (isClothing(category)) {
            // Giyim ürünleri için beden ve renk
            attributes.add(createSizeAttribute());
            attributes.add(createColorAttribute());
        } 
        else if (isFootwear(category)) {
            // Ayakkabı ürünleri için numara ve renk
            attributes.add(createShoeAttribute());
            attributes.add(createColorAttribute());
        }
        else if (isElectronic(category)) {
            // Elektronik ürünler için renk ve kapasite
            attributes.add(createColorAttribute(true));
            
            // Telefon veya tablet ise kapasite ekle
            if (category.contains("telefon") || category.contains("tablet")) {
                ProductAttributeDTO capacityAttr = new ProductAttributeDTO();
                capacityAttr.setId(7L);
                capacityAttr.setName("Kapasite");
                capacityAttr.setType("SELECT");
                capacityAttr.setRequired(true);
                
                List<AttributeValueDTO> values = new ArrayList<>();
                values.add(new AttributeValueDTO(1L, "64GB", "64GB", null, null, true, null));
                values.add(new AttributeValueDTO(2L, "128GB", "128GB", null, null, true, 20.0));
                values.add(new AttributeValueDTO(3L, "256GB", "256GB", null, null, true, 50.0));
                values.add(new AttributeValueDTO(4L, "512GB", "512GB", null, null, Math.random() > 0.3, 100.0));
                capacityAttr.setValues(values);
                
                attributes.add(capacityAttr);
            }
        }
        else if (isFurniture(category)) {
            // Mobilya ürünleri için malzeme ve renk
            attributes.add(createMaterialAttribute());
            attributes.add(createColorAttribute());
        }
        else if (isFood(category)) {
            // Gıda ürünleri için miktar
            attributes.add(createWeightAttribute());
        }
        else if (isBeauty(category)) {
            // Kozmetik ürünleri için hacim/boyut
            attributes.add(createVolumeAttribute());
        }
        
        return attributes;
    }

    /**
     * Kategori kontrolü için yardımcı metotlar
     */
    private boolean isClothing(String category) {
        return category.contains("giyim") || 
               category.contains("elbise") || 
               category.contains("tişört") || 
               category.contains("pantolon") || 
               category.contains("kazak") || 
               category.contains("ceket");
    }

    private boolean isFootwear(String category) {
        return category.contains("ayakkabı") || 
               category.contains("bot") || 
               category.contains("çizme") || 
               category.contains("spor ayakkabı");
    }

    private boolean isElectronic(String category) {
        return category.contains("elektronik") || 
               category.contains("telefon") || 
               category.contains("bilgisayar") || 
               category.contains("tablet") || 
               category.contains("kamera");
    }

    private boolean isFurniture(String category) {
        return category.contains("mobilya") || 
               category.contains("masa") || 
               category.contains("sandalye") || 
               category.contains("koltuk") || 
               category.contains("yatak");
    }

    private boolean isFood(String category) {
        return category.contains("gıda") || 
               category.contains("yiyecek") || 
               category.contains("içecek");
    }

    private boolean isBeauty(String category) {
        return category.contains("kozmetik") || 
               category.contains("makyaj") || 
               category.contains("parfüm") || 
               category.contains("bakım");
    }

    /**
     * Demo amaçlı özellik oluşturucu metotlar
     */
    private ProductAttributeDTO createSizeAttribute() {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(1L);
        attribute.setName("Beden");
        attribute.setType("SIZE");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "XS", "XS", null, null, Math.random() > 0.3, null));
        values.add(new AttributeValueDTO(2L, "S", "S", null, null, Math.random() > 0.2, null));
        values.add(new AttributeValueDTO(3L, "M", "M", null, null, Math.random() > 0.1, null));
        values.add(new AttributeValueDTO(4L, "L", "L", null, null, Math.random() > 0.2, null));
        values.add(new AttributeValueDTO(5L, "XL", "XL", null, null, Math.random() > 0.3, null));
        values.add(new AttributeValueDTO(6L, "XXL", "XXL", null, null, Math.random() > 0.5, null));
        attribute.setValues(values);
        
        return attribute;
    }

    private ProductAttributeDTO createShoeAttribute() {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(2L);
        attribute.setName("Numara");
        attribute.setType("NUMERIC");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "36", "36", null, null, Math.random() > 0.4, null));
        values.add(new AttributeValueDTO(2L, "37", "37", null, null, Math.random() > 0.3, null));
        values.add(new AttributeValueDTO(3L, "38", "38", null, null, Math.random() > 0.2, null));
        values.add(new AttributeValueDTO(4L, "39", "39", null, null, Math.random() > 0.1, null));
        values.add(new AttributeValueDTO(5L, "40", "40", null, null, Math.random() > 0.1, null));
        values.add(new AttributeValueDTO(6L, "41", "41", null, null, Math.random() > 0.2, null));
        values.add(new AttributeValueDTO(7L, "42", "42", null, null, Math.random() > 0.3, null));
        values.add(new AttributeValueDTO(8L, "43", "43", null, null, Math.random() > 0.4, null));
        values.add(new AttributeValueDTO(9L, "44", "44", null, null, Math.random() > 0.5, null));
        attribute.setValues(values);
        
        return attribute;
    }

    private ProductAttributeDTO createColorAttribute() {
        return createColorAttribute(false);
    }

    private ProductAttributeDTO createColorAttribute(boolean isLimited) {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(3L);
        attribute.setName("Renk");
        attribute.setType("COLOR");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "Siyah", "Siyah", "#000000", null, true, null));
        values.add(new AttributeValueDTO(2L, "Beyaz", "Beyaz", "#FFFFFF", null, true, null));
        
        if (!isLimited) {
            values.add(new AttributeValueDTO(3L, "Kırmızı", "Kırmızı", "#FF0000", null, true, null));
            values.add(new AttributeValueDTO(4L, "Mavi", "Mavi", "#0000FF", null, true, null));
            values.add(new AttributeValueDTO(5L, "Yeşil", "Yeşil", "#00CC00", null, true, null));
            values.add(new AttributeValueDTO(6L, "Sarı", "Sarı", "#FFFF00", null, Math.random() > 0.5, null));
            values.add(new AttributeValueDTO(7L, "Mor", "Mor", "#800080", null, Math.random() > 0.5, null));
        } else {
            values.add(new AttributeValueDTO(3L, "Gümüş", "Gümüş", "#C0C0C0", null, true, null));
        }
        
        attribute.setValues(values);
        return attribute;
    }

    private ProductAttributeDTO createMaterialAttribute() {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(4L);
        attribute.setName("Malzeme");
        attribute.setType("MATERIAL");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "Ahşap", "Ahşap", null, null, true, null));
        values.add(new AttributeValueDTO(2L, "Metal", "Metal", null, null, true, null));
        values.add(new AttributeValueDTO(3L, "Plastik", "Plastik", null, null, true, null));
        values.add(new AttributeValueDTO(4L, "Kumaş", "Kumaş", null, null, true, null));
        values.add(new AttributeValueDTO(5L, "Cam", "Cam", null, null, Math.random() > 0.5, null));
        attribute.setValues(values);
        
        return attribute;
    }

    private ProductAttributeDTO createWeightAttribute() {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(5L);
        attribute.setName("Miktar");
        attribute.setType("WEIGHT");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "100g", "100g", null, null, true, null));
        values.add(new AttributeValueDTO(2L, "250g", "250g", null, null, true, null));
        values.add(new AttributeValueDTO(3L, "500g", "500g", null, null, true, null));
        values.add(new AttributeValueDTO(4L, "1kg", "1kg", null, null, true, 15.0));
        values.add(new AttributeValueDTO(5L, "2kg", "2kg", null, null, Math.random() > 0.3, 30.0));
        attribute.setValues(values);
        
        return attribute;
    }

    private ProductAttributeDTO createVolumeAttribute() {
        ProductAttributeDTO attribute = new ProductAttributeDTO();
        attribute.setId(6L);
        attribute.setName("Boyut");
        attribute.setType("VOLUME");
        attribute.setRequired(true);
        
        List<AttributeValueDTO> values = new ArrayList<>();
        values.add(new AttributeValueDTO(1L, "30ml", "30ml", null, null, true, null));
        values.add(new AttributeValueDTO(2L, "50ml", "50ml", null, null, true, 10.0));
        values.add(new AttributeValueDTO(3L, "100ml", "100ml", null, null, true, 20.0));
        values.add(new AttributeValueDTO(4L, "200ml", "200ml", null, null, Math.random() > 0.3, 35.0));
        attribute.setValues(values);
        
        return attribute;
    }

    /**
     * Ürün özelliklerini getir
     */
    public List<ProductAttributeDTO> getProductAttributes(long productId) {
        // Ürünün var olduğunu kontrol et
        Product product = findProductById(productId);
        
        // Ürünün özelliklerini getir
        List<ProductAttribute> attributes = productAttributeRepository.findByProductId(productId);
        
        // DTO'lara dönüştür
        List<ProductAttributeDTO> attributeDTOs = new ArrayList<>();
        
        for (ProductAttribute attribute : attributes) {
            ProductAttributeDTO dto = new ProductAttributeDTO();
            dto.setId(attribute.getId());
            dto.setName(attribute.getName());
            dto.setType(attribute.getType());
            dto.setRequired(attribute.isRequired());
            
            // Özellik değerlerini DTO'lara dönüştür
            List<AttributeValueDTO> valueDTOs = new ArrayList<>();
            for (ProductAttributeValue value : attribute.getValues()) {
                AttributeValueDTO valueDTO = new AttributeValueDTO(
                    value.getId(),
                    value.getValue(),
                    value.getDisplayValue(),
                    value.getColorCode(),
                    value.getImageUrl(),
                    value.isInStock(),
                    value.getPriceAdjustment()
                );
                valueDTOs.add(valueDTO);
            }
            
            dto.setValues(valueDTOs);
            attributeDTOs.add(dto);
        }
        
        return attributeDTOs;
    }

    /**
     * Ürün varyantlarını getir
     */
    public List<ProductVariantDTO> getProductVariants(long productId) {
        System.out.println("getProductVariants çağrıldı: productId = " + productId);
        
        try {
            // Varyantları doğrudan veritabanından al 
        List<ProductVariant> variants = productVariantRepository.findByProductIdAndActiveTrue(productId);
        
            if (variants.isEmpty()) {
                System.out.println("UYARI: Ürün " + productId + " için hiç varyant bulunamadı!");
                
                // Aktif filtresi olmadan tekrar deneyelim
                variants = productVariantRepository.findByProductId(productId);
                System.out.println("Aktif filtresi olmadan bulunan varyant sayısı: " + variants.size());
                
                if (variants.isEmpty()) {
                    // Entity manager ile JPQL sorgusu deneyelim
                    String jpql = "SELECT v FROM ProductVariant v WHERE v.product.id = :productId";
                    variants = entityManager.createQuery(jpql, ProductVariant.class)
                        .setParameter("productId", productId)
                        .getResultList();
                    System.out.println("JPQL sorgusu ile bulunan varyant sayısı: " + variants.size());
                }
            }
            
            // Varyantları DTO'ya dönüştür
            List<ProductVariantDTO> variantDTOs = new ArrayList<>();
        for (ProductVariant variant : variants) {
                try {
                    ProductVariantDTO dto = convertToVariantDTO(variant);
                    variantDTOs.add(dto);
                } catch (Exception e) {
                    System.err.println("Varyant dönüştürülürken hata: " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            System.out.println("Ürün " + productId + " için " + variantDTOs.size() + " varyant dönüştürüldü");
            
            // Eğer hala varyant bulunamadıysa, test amaçlı varyant oluştur
            if (variantDTOs.isEmpty()) {
                System.out.println("Test için örnek varyantlar oluşturuluyor...");
                variantDTOs = createSampleVariants(productId);
            }
            
            return variantDTOs;
        } catch (Exception e) {
            System.err.println("Ürün varyantları getirilirken hata: " + e.getMessage());
            e.printStackTrace();
            return createSampleVariants(productId); // Test için örnek varyantlar
        }
    }

    /**
     * Test için örnek varyantlar oluştur
     */
    private List<ProductVariantDTO> createSampleVariants(long productId) {
        List<ProductVariantDTO> sampleVariants = new ArrayList<>();
        
        try {
            // Ürün bilgisini al
        Product product = findProductById(productId);
        
            // Renk seçenekleri
            String[] colors = {"Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil"};
            String[] colorCodes = {"#000000", "#FFFFFF", "#FF0000", "#0000FF", "#00FF00"};
            
            // Kapasite seçenekleri (Elektronik ürünler için)
            String[] capacities = {"128GB", "256GB", "512GB"};
            
            // Beden seçenekleri (Giyim ürünleri için)
            String[] sizes = {"S", "M", "L", "XL"};
            
            // Kategori adını al
            String category = product.getCategory() != null ? 
                product.getCategory().getName().toLowerCase() : "";
            
            boolean isElectronic = category.contains("elektronik") || 
                                   category.contains("telefon") || 
                                   category.contains("bilgisayar");
            
            boolean isClothing = category.contains("giyim") || 
                                 category.contains("kıyafet") || 
                                 category.contains("elbise");
            
            // Varyant sayılarını belirle
            int colorCount = Math.min(3, colors.length);
            
            if (isElectronic) {
                // Elektronik ürünler için Kapasite + Renk kombinasyonları
                for (int i = 0; i < capacities.length; i++) {
                    for (int j = 0; j < colorCount; j++) {
                        ProductVariantDTO variant = new ProductVariantDTO();
                        variant.setId(100000L + productId * 100 + i * 10 + j);
                        variant.setProductId(productId);
                        variant.setSku("TEST-" + productId + "-" + capacities[i] + "-" + colors[j]);
                        variant.setPrice(product.getPrice().add(new BigDecimal(i * 1000))); // Her kapasite için fiyat artışı
                        variant.setStock(10 + i * 5);
                        variant.setActive(true);
                        
                        // Özellikler
                        Map<String, String> attributes = new HashMap<>();
                        attributes.put("Kapasite", capacities[i]);
                        attributes.put("Renk", colors[j]);
                        attributes.put("RenkKodu", colorCodes[j]);
                        variant.setAttributes(attributes);
                        
                        // Görsel URL'si
                        List<String> images = new ArrayList<>();
                        images.add(product.getImageUrl()); // Aynı görseli kullan
                        variant.setImageUrls(images);
                        
                        sampleVariants.add(variant);
                    }
                }
            } else if (isClothing) {
                // Giyim ürünleri için Renk + Beden kombinasyonları
                for (int i = 0; i < colorCount; i++) {
                    for (int j = 0; j < sizes.length; j++) {
                        ProductVariantDTO variant = new ProductVariantDTO();
                        variant.setId(200000L + productId * 100 + i * 10 + j);
                        variant.setProductId(productId);
                        variant.setSku("TEST-" + productId + "-" + colors[i] + "-" + sizes[j]);
                        variant.setPrice(product.getPrice());
                        variant.setStock(10 + j * 5);
                        variant.setActive(true);
                
                        // Özellikler
                        Map<String, String> attributes = new HashMap<>();
                        attributes.put("Renk", colors[i]);
                        attributes.put("RenkKodu", colorCodes[i]);
                        attributes.put("Beden", sizes[j]);
                        variant.setAttributes(attributes);
                        
                        // Görsel URL'si
                        List<String> images = new ArrayList<>();
                        images.add(product.getImageUrl()); // Aynı görseli kullan
                        variant.setImageUrls(images);
                        
                        sampleVariants.add(variant);
                    }
                }
            } else {
                // Diğer ürünler için sadece renk seçenekleri
                for (int i = 0; i < colorCount; i++) {
                    ProductVariantDTO variant = new ProductVariantDTO();
                    variant.setId(300000L + productId * 100 + i);
                    variant.setProductId(productId);
                    variant.setSku("TEST-" + productId + "-" + colors[i]);
                    variant.setPrice(product.getPrice());
                    variant.setStock(20);
                    variant.setActive(true);
                    
                    // Özellikler
                    Map<String, String> attributes = new HashMap<>();
                    attributes.put("Renk", colors[i]);
                    attributes.put("RenkKodu", colorCodes[i]);
                    variant.setAttributes(attributes);
                    
                    // Görsel URL'si
                    List<String> images = new ArrayList<>();
                    images.add(product.getImageUrl()); // Aynı görseli kullan
                    variant.setImageUrls(images);
                    
                    sampleVariants.add(variant);
                }
            }
            
            System.out.println("Ürün " + productId + " için " + sampleVariants.size() + " örnek varyant oluşturuldu");
        } catch (Exception e) {
            System.err.println("Örnek varyantlar oluşturulurken hata: " + e.getMessage());
            e.printStackTrace();
        }
        
        return sampleVariants;
    }

    /**
     * Ürün varyantını güncelle
     */
    @Transactional
    public ProductVariantDTO updateProductVariant(long variantId, ProductVariantDTO variantDTO) {
        // Varyantı kontrol et
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new EntityNotFoundException("Varyant bulunamadı: " + variantId));
        
        // Ana ürün ID'si (totalStock güncellemesi için)
        Long productId = variant.getProduct().getId();
        
        // Temel özellikleri güncelle
        variant.setSku(variantDTO.getSku());
        variant.setPrice(variantDTO.getPrice());
        variant.setSalePrice(variantDTO.getSalePrice());
        variant.setStockQuantity(variantDTO.getStock());
        variant.setActive(variantDTO.getActive());
        // imageUrl artık variant sınıfında yok
        
        // Status alanını güncelle, yoksa varsayılan "active" olsun
        if (variantDTO.getStatus() != null) {
            variant.setStatus(variantDTO.getStatus());
        } else {
            variant.setStatus("active");
        }
        
        // Yeni özellikleri varsa veya attributesWithIds varsa, önceki özellikleri temizle ve yenilerini ekle
        boolean shouldUpdateAttributes = variantDTO.hasAnyAttributes();

        if (shouldUpdateAttributes) {
            System.out.println("Yeni özelliklerle güncelleme yapılıyor");
            
            // Mevcut özellikleri temizle
            List<ProductAttributeValue> oldValues = new ArrayList<>(variant.getAttributeValues());
            for (ProductAttributeValue value : oldValues) {
                variant.removeAttributeValue(value);
            }
            
            // Product'ı al
            Product product = variant.getProduct();

            // attributesWithIds alanı varsa bu bilgiyi kullan - attribute_id ile ekleme yap
            if (variantDTO.hasAttributesWithIds()) {
                System.out.println("Frontend'den gelen attributesWithIds kullanılıyor: " + variantDTO.getAttributesWithIds().size() + " adet");
                
                for (Map<String, Object> attrWithId : variantDTO.getAttributesWithIds()) {
                    // attribute_id, key ve value bilgilerini al
                    Number attrIdNumber = (Number) attrWithId.get("attribute_id");
                    String key = (String) attrWithId.get("key");
                    String value = (String) attrWithId.get("value");
                    
                    if (attrIdNumber == null || key == null || value == null) {
                        System.out.println("Hatalı attributeWithId verisi. Atlanıyor: " + attrWithId);
                        continue;
                    }
                    
                    Long attributeId = attrIdNumber.longValue();
                    System.out.println("Özellik ekleniyor: key=" + key + ", value=" + value + ", attribute_id=" + attributeId);
                    
                    // "RenkKodu" kontrolü - front-end'den gelen RenkKodu için özel işleme
                    final String finalAttributeKey;
                    if ("RenkKodu".equals(key)) {
                        finalAttributeKey = "Renk";
                        System.out.println("RenkKodu anahtarı Renk olarak değiştirildi");
                    } else {
                        finalAttributeKey = key;
                    }
                    
                    // attribute_id ile doğrudan özelliği bul
                    ProductAttribute attribute = productAttributeRepository.findById(attributeId)
                        .orElseGet(() -> {
                            // attribute_id'ye sahip özellik yoksa, key ile ara
                            return productAttributeRepository.findByNameAndProductId(finalAttributeKey, product.getId())
                                .orElseGet(() -> {
                                    // Özellik hiçbir şekilde yoksa yeni oluştur
                                    System.out.println("Özellik bulunamadı, yeni oluşturuluyor: " + finalAttributeKey + ", ID: " + attributeId);
                                    ProductAttribute newAttr = new ProductAttribute();
                                    newAttr.setName(finalAttributeKey);
                                    newAttr.setType("SELECT");
                                    newAttr.setRequired(true);
                                    newAttr.setProduct(product);
                                    
                                    // Ürüne ait kategoriyi de ekle
                                    if (product.getCategory() != null) {
                                        newAttr.setCategory(product.getCategory());
                                    }
                                    
                                    return productAttributeRepository.save(newAttr);
                                });
                        });
                    
                    // Renk kodunu kontrol et
                    final String finalValue;
                    final ProductAttribute finalAttribute = attribute;
                    
                    // Eğer RenkKodu geliyorsa ve Renk özelliği bulunamazsa
                    if ("RenkKodu".equals(key) && !"Renk".equals(finalAttribute.getName())) {
                        // Renk özelliğini bul
                        ProductAttribute colorAttribute = productAttributeRepository.findByNameAndProductId("Renk", product.getId())
                            .orElse(null);
                        
                        if (colorAttribute != null) {
                            // Renk özelliği bulunduysa bunu kullan
                            attribute = colorAttribute;
                            // Değer olarak Beyaz, Siyah gibi renk isimlerini bulmaya çalış
                            finalValue = findColorNameByCode(value);
                            System.out.println("Renk kodu " + value + " için renk adı bulundu: " + finalValue);
                        } else {
                            finalValue = value;
                        }
                    } else {
                        finalValue = value;
                    }
                    
                    // Özellik değerini bul veya oluştur (attribute_id ile)
                    final ProductAttribute finalAttributeForValue = attribute;
                    ProductAttributeValue attributeValue = null;
                    List<ProductAttributeValue> existingValues = productAttributeValueRepository.findByAttributeIdAndValue(finalAttributeForValue.getId(), finalValue);
                    
                    if (!existingValues.isEmpty()) {
                        // İlk bulunan değeri kullan
                        attributeValue = existingValues.get(0);
                    } else {
                        // Değer yoksa yeni oluştur
                        ProductAttributeValue newValue = new ProductAttributeValue();
                        newValue.setValue(finalValue);
                        newValue.setDisplayValue(finalValue);
                        newValue.setAttribute(finalAttributeForValue); // Önemli: attribute_id ile ilişkilendir
                        newValue.setProduct(product);
                        
                        // Renk özelliği ise ve renk kodu var mı kontrol et
                        if (finalAttributeKey.equalsIgnoreCase("Renk") && variantDTO.getAttributes() != null && 
                            variantDTO.getAttributes().containsKey("RenkKodu")) {
                            newValue.setColorCode(variantDTO.getAttributes().get("RenkKodu"));
                        } else if ("RenkKodu".equals(key)) {
                            // RenkKodu ise, değerin kendisini color code olarak ayarla
                            newValue.setColorCode(value);
                        }
                        
                        newValue.setInStock(true);
                        attributeValue = productAttributeValueRepository.save(newValue);
                    }
                    
                    // EntityManager ile ilişkiyi doğrudan kur - MANUEL BAĞLANTI
                    String sql = "INSERT INTO variant_attribute_values (variant_id, attribute_value_id, attribute_id) VALUES (?, ?, ?)";
                    entityManager.createNativeQuery(sql)
                        .setParameter(1, variant.getId())
                        .setParameter(2, attributeValue.getId())
                        .setParameter(3, attribute.getId())
                        .executeUpdate();
                }
            }
            // Aksi takdirde attributes alanını kullan (klasik yöntem)
            else if (variantDTO.hasAttributes()) {
                System.out.println("Regular attributes kullanılıyor: " + variantDTO.getAttributes().size() + " adet");
                
                // Yeni özellikleri ekle
                for (Map.Entry<String, String> entry : variantDTO.getAttributes().entrySet()) {
                    String attrName = entry.getKey();
                    String attrValue = entry.getValue();
                    
                    // Özel renk kodu alanını atla, onu ayrıca işleyeceğiz
                    if (attrName.equals("RenkKodu")) {
                        continue;
                    }
                    
                    // Özelliği bulalım
                    ProductAttribute attribute = productAttributeRepository.findByNameAndProductId(attrName, product.getId())
                        .orElseGet(() -> {
                            // Özellik yoksa yeni oluştur
                            System.out.println("Özellik bulunamadı, yeni oluşturuluyor: " + attrName);
                            ProductAttribute newAttr = new ProductAttribute();
                            newAttr.setName(attrName);
                            newAttr.setType("SELECT");
                            newAttr.setRequired(true);
                            newAttr.setProduct(product);
                            
                            // Ürüne ait kategoriyi de ekle - NULL sorunu çözümü
                            if (product.getCategory() != null) {
                                System.out.println("Özelliğe kategori ekleniyor: " + product.getCategory().getName() + " (ID: " + product.getCategory().getId() + ")");
                                newAttr.setCategory(product.getCategory());
                            } else {
                                System.out.println("UYARI: Ürünün kategorisi bulunamadı, özelliğe kategori eklenemedi!");
                            }
                            
                            return productAttributeRepository.save(newAttr);
                        });
                    
                    // Özellik değerini bulalım veya oluşturalım
                    List<ProductAttributeValue> existingValues = productAttributeValueRepository.findByAttributeIdAndValue(attribute.getId(), attrValue);
                    ProductAttributeValue attributeValue;
                    
                    if (!existingValues.isEmpty()) {
                        // İlk bulunan değeri kullan
                        attributeValue = existingValues.get(0);
                    } else {
                        // Değer yoksa yeni oluştur
                        System.out.println("Özellik değeri bulunamadı, yeni oluşturuluyor: " + attrValue);
                        ProductAttributeValue newValue = new ProductAttributeValue();
                        newValue.setValue(attrValue);
                        newValue.setDisplayValue(attrValue);
                        newValue.setAttribute(attribute);
                        newValue.setProduct(product);
                        
                        // Renk özelliği ise ve renk kodu var mı kontrol et
                        if (attrName.equalsIgnoreCase("Renk") && variantDTO.getAttributes().containsKey("RenkKodu")) {
                            String colorCode = variantDTO.getAttributes().get("RenkKodu");
                            System.out.println("Renk kodunu ayarlıyorum: " + colorCode);
                            newValue.setColorCode(colorCode);
                        }
                        
                        newValue.setInStock(true);
                        attributeValue = productAttributeValueRepository.save(newValue);
                    }
                    
                    // EntityManager ile ilişkiyi doğrudan kur - MANUEL BAĞLANTI
                    String sql = "INSERT INTO variant_attribute_values (variant_id, attribute_value_id, attribute_id) VALUES (?, ?, ?)";
                    entityManager.createNativeQuery(sql)
                        .setParameter(1, variant.getId())
                        .setParameter(2, attributeValue.getId())
                        .setParameter(3, attribute.getId())
                        .executeUpdate();
                }
            }
        } else {
            System.out.println("Varyant güncelleme: Yeni özellikler gönderilmedi, mevcut özellikler korunuyor. Varyant ID: " + variantId);
            // Özelliklerin temizlenmediğinden emin ol, JPA otomatik olarak ilişkileri koruyacaktır
        }
        
        // Görselleri güncelle
        if (variantDTO.getImageUrls() != null) {
            // Mevcut görselleri sil
            variantImageRepository.deleteByVariantId(variant.getId());
            
            // Görseller listesini temizle
            variant.getImages().clear();
            
            // Yeni görselleri ekle
            int order = 1;
            for (String imageUrl : variantDTO.getImageUrls()) {
                VariantImage image = new VariantImage();
                image.setVariant(variant);
                image.setImageUrl(imageUrl);
                image.setDisplayOrder(order++);
                image.setIsMain(order == 2);
                variantImageRepository.save(image);
            }
        }
        
        // ÖNEMLİ: Güncellenmiş varyantı kaydet ve veritabanına yansıtılmasını zorla
        ProductVariant updatedVariant = productVariantRepository.save(variant);
        entityManager.flush(); // Veritabanına yazılmasını zorla
        
        // Ürünün toplam stok bilgisini güncelle
        updateProductTotalStock(productId);
        
        // ÇÖZÜM: Frontend'e gönderilecek DTO'yu doğrudan variantDTO'dan oluştur
        ProductVariantDTO resultDTO = new ProductVariantDTO();
        resultDTO.setId(updatedVariant.getId());
        resultDTO.setProductId(updatedVariant.getProduct().getId());
        resultDTO.setSku(updatedVariant.getSku());
        resultDTO.setPrice(updatedVariant.getPrice());
        resultDTO.setSalePrice(updatedVariant.getSalePrice());
        resultDTO.setStock(updatedVariant.getStockQuantity());
        resultDTO.setActive(updatedVariant.isActive());
        resultDTO.setStatus(updatedVariant.getStatus());
        // VariantDescription için varyantın ana görselini kullan
        resultDTO.setVariantDescription(updatedVariant.getMainImageUrl());
        
        // Eğer yeni özellikler gönderilmişse, onları direkt kullan
        if (variantDTO.hasAnyAttributes()) {
            resultDTO.setAttributes(variantDTO.getAttributes());
            resultDTO.setAttributesWithIds(variantDTO.getAttributesWithIds());
            System.out.println("Variant özelliklerinin frontend'dan frontend'e döndürülmesi");
        } else {
            // Aksi takdirde mevcut özellikleri convertToVariantDTO ile dönüştür
            ProductVariantDTO convertedDTO = convertToVariantDTO(updatedVariant);
            resultDTO.setAttributes(convertedDTO.getAttributes());
            resultDTO.setAttributesWithIds(convertedDTO.getAttributesWithIds());
        }
        
        // Görsel URL'lerini ayarla (varsa)
        resultDTO.setImageUrls(variantDTO.getImageUrls());
        
        System.out.println("Varyant güncelleme tamamlandı. DTO özellikleri: " + 
                         (resultDTO.getAttributes() != null ? resultDTO.getAttributes().size() : "null"));
        
        return resultDTO;
    }

    /**
     * Ürün varyantını sil
     */
    @Transactional
    public void deleteProductVariant(long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new EntityNotFoundException("Varyant bulunamadı: " + variantId));
        
        // Ana ürün ID'si (totalStock güncellemesi için)
        Long productId = variant.getProduct().getId();
        
        // Varyant görsellerini temizle
        variantImageRepository.deleteByVariantId(variantId);
        
        // Varyant ile özellik değerleri arasındaki ilişkiyi temizle
        List<ProductAttributeValue> attributeValues = new ArrayList<>(variant.getAttributeValues());
        for (ProductAttributeValue value : attributeValues) {
            variant.removeAttributeValue(value);
        }
        
        // Varyantı sil
        productVariantRepository.deleteById(variantId);
        
        // Ürünün toplam stok bilgisini güncelle
        updateProductTotalStock(productId);
    }

    /**
     * Ürün varyantını DTO'ya dönüştür
     */
    private ProductVariantDTO convertToVariantDTO(ProductVariant variant) {
        System.out.println("\n====== VARYANT DTO DÖNÜŞTÜRME BAŞLADI ======");
        System.out.println("Varyant ID: " + variant.getId() + ", SKU: " + variant.getSku());
        
        // Varyantı taze verilere göre yeniden yükle
        variant = productVariantRepository.findById(variant.getId())
            .orElse(variant);
        
        // Lazy loading sorununu önlemek için Hibernate.initialize kullan    
        org.hibernate.Hibernate.initialize(variant.getAttributeValues());
        System.out.println("Varyant yeniden yüklendi - AttributeValues yüklenen sayısı: " + variant.getAttributeValues().size());
        
        ProductVariantDTO dto = new ProductVariantDTO();
        dto.setId(variant.getId());
        dto.setProductId(variant.getProduct().getId());
        dto.setSku(variant.getSku());
        dto.setPrice(variant.getPrice());
        dto.setSalePrice(variant.getSalePrice());
        dto.setStock(variant.getStockQuantity());
        dto.setActive(variant.isActive());
        dto.setStatus(variant.getStatus());
        // VariantDescription için varyantın ana görselini kullan
        dto.setVariantDescription(variant.getMainImageUrl());
         
        // Debug: Varyantın özellik değerlerini görüntüle
        System.out.println("Varyant: " + variant.getId() + " - " + variant.getSku());
        System.out.println("- AttributeValues: " + variant.getAttributeValues().size() + " özellik değeri var");
        
        // Özellik değerlerini Map'e dönüştür - anahtar çakışmalarını önle
        Map<String, String> attributes = new HashMap<>();
        // AttributesWithIds için liste oluştur
        List<Map<String, Object>> attributesWithIds = new ArrayList<>();
        
        // Önce özellik gruplandırmasını doğru yapmak için
        Map<String, ProductAttributeValue> attributesByType = new HashMap<>();
        String capacityValue = null;
        
        // İlk geçiş: Özellik tiplerini belirle ve gruplandır
        for (ProductAttributeValue attrValue : variant.getAttributeValues()) {
            String attrName = attrValue.getAttribute().getName();
            String valueStr = attrValue.getValue();
            
            // Özellik değerine göre tip belirle
            if (valueStr != null) {
                if (valueStr.endsWith("GB") || valueStr.endsWith("TB") || valueStr.endsWith("TB SSD")) {
                    // Kapasite/Storage değeri
                    attributesByType.put("Kapasite", attrValue);
                    capacityValue = valueStr;
                } else if (valueStr.startsWith("#")) {
                    // Renk kodu
                    attributesByType.put("RenkKodu", attrValue);
                } else if (attrName.equals("Renk")) {
                    // Renk adı
                    attributesByType.put("Renk", attrValue);
                } else if (attrName.equals("Beden")) {
                    // Beden bilgisi
                    attributesByType.put("Beden", attrValue);
                } else {
                    // Diğer özellikler
                    attributesByType.put(attrName, attrValue);
                }
            }
            
            // Debug için özellik bilgisini yazdır
            System.out.println("  - Özellik: " + attrName + 
                              ", Değer: " + valueStr + 
                              ", ColorCode: " + attrValue.getColorCode() +
                              ", Attribute ID: " + attrValue.getAttribute().getId() +
                              ", Tip: " + attrValue.getAttribute().getType());
        }
        
        // Renk bilgilerini işle
        String colorName = null;
        String colorCode = null;
        
        if (attributesByType.containsKey("Renk")) {
            ProductAttributeValue colorAttr = attributesByType.get("Renk");
            colorName = colorAttr.getValue();
            colorCode = colorAttr.getColorCode();
            
            if (colorCode == null && attributesByType.containsKey("RenkKodu")) {
                colorCode = attributesByType.get("RenkKodu").getValue();
            }
            
            // Renk adı ve kodunu ekle
            attributes.put("Renk", colorName);
            attributes.put("RenkKodu", colorCode);
            System.out.println("    * Renk bilgisi eklendi: " + colorName + " -> " + colorCode);
            
            // attributesWithIds için Renk
            Map<String, Object> colorAttrWithId = new HashMap<>();
            colorAttrWithId.put("attribute_id", colorAttr.getAttribute().getId());
            colorAttrWithId.put("key", "Renk");
            colorAttrWithId.put("value", colorName);
            attributesWithIds.add(colorAttrWithId);
            
            // attributesWithIds için RenkKodu
            Map<String, Object> colorCodeAttrWithId = new HashMap<>();
            colorCodeAttrWithId.put("attribute_id", 1L); // RenkKodu ID'si genellikle 1
            colorCodeAttrWithId.put("key", "RenkKodu");
            colorCodeAttrWithId.put("value", colorCode);
            attributesWithIds.add(colorCodeAttrWithId);
        } else if (attributesByType.containsKey("RenkKodu")) {
            // Sadece renk kodu varsa, adını bulmaya çalış
            colorCode = attributesByType.get("RenkKodu").getValue();
            colorName = findColorNameByCode(colorCode);
            
            attributes.put("Renk", colorName);
            attributes.put("RenkKodu", colorCode);
            System.out.println("    * Renk kodu kullanılarak ad bulundu: " + colorCode + " -> " + colorName);
            
            // attributesWithIds için Renk
            Map<String, Object> colorAttrWithId = new HashMap<>();
            colorAttrWithId.put("attribute_id", 4L); // Renk ID'si genellikle 4
            colorAttrWithId.put("key", "Renk");
            colorAttrWithId.put("value", colorName);
            attributesWithIds.add(colorAttrWithId);
            
            // attributesWithIds için RenkKodu
            Map<String, Object> colorCodeAttrWithId = new HashMap<>();
            colorCodeAttrWithId.put("attribute_id", 1L); // RenkKodu ID'si genellikle 1
            colorCodeAttrWithId.put("key", "RenkKodu");
            colorCodeAttrWithId.put("value", colorCode);
            attributesWithIds.add(colorCodeAttrWithId);
        }
        
        // Kapasite bilgisini işle - ÖNEMLİ
        if (attributesByType.containsKey("Kapasite")) {
            ProductAttributeValue capacityAttr = attributesByType.get("Kapasite");
            String capacityStr = capacityAttr.getValue();
            
            attributes.put("Kapasite", capacityStr);
            System.out.println("    * Kapasite bilgisi eklendi: " + capacityStr);
            
            // attributesWithIds için Kapasite
            Map<String, Object> capacityAttrWithId = new HashMap<>();
            capacityAttrWithId.put("attribute_id", capacityAttr.getAttribute().getId());
            capacityAttrWithId.put("key", "Kapasite");
            capacityAttrWithId.put("value", capacityStr);
            attributesWithIds.add(capacityAttrWithId);
        } else if (capacityValue != null) {
            // Kapasite isimli özellik yoksa ama GB/TB içeren bir değer varsa
            attributes.put("Kapasite", capacityValue);
            System.out.println("    * Kapasite değeri tespit edildi ve eklendi: " + capacityValue);
            
            // attributesWithIds için Kapasite
            Map<String, Object> capacityAttrWithId = new HashMap<>();
            capacityAttrWithId.put("attribute_id", 1L); // Varsayılan ID
            capacityAttrWithId.put("key", "Kapasite");
            capacityAttrWithId.put("value", capacityValue);
            attributesWithIds.add(capacityAttrWithId);
        }
        
        // Beden bilgisini işle
        if (attributesByType.containsKey("Beden")) {
            ProductAttributeValue sizeAttr = attributesByType.get("Beden");
            String sizeStr = sizeAttr.getValue();
            
            attributes.put("Beden", sizeStr);
            System.out.println("    * Beden bilgisi eklendi: " + sizeStr);
            
            // attributesWithIds için Beden
            Map<String, Object> sizeAttrWithId = new HashMap<>();
            sizeAttrWithId.put("attribute_id", sizeAttr.getAttribute().getId());
            sizeAttrWithId.put("key", "Beden");
            sizeAttrWithId.put("value", sizeStr);
            attributesWithIds.add(sizeAttrWithId);
        }
        
        // Ayakkabı numarası bilgisini işle
        if (attributesByType.containsKey("Numara")) {
            ProductAttributeValue shoeSize = attributesByType.get("Numara");
            String shoeSizeStr = shoeSize.getValue();
            
            attributes.put("Numara", shoeSizeStr);
            System.out.println("    * Ayakkabı numara bilgisi eklendi: " + shoeSizeStr);
            
            // attributesWithIds için Numara
            Map<String, Object> shoeSizeAttrWithId = new HashMap<>();
            shoeSizeAttrWithId.put("attribute_id", shoeSize.getAttribute().getId());
            shoeSizeAttrWithId.put("key", "Numara");
            shoeSizeAttrWithId.put("value", shoeSizeStr);
            attributesWithIds.add(shoeSizeAttrWithId);
        }
        
        // Diğer özellikleri ekle (Renk, RenkKodu, Kapasite, Beden hariç)
        for (Map.Entry<String, ProductAttributeValue> entry : attributesByType.entrySet()) {
            String attrName = entry.getKey();
            ProductAttributeValue attrValue = entry.getValue();
            
            // Zaten işlediğimiz özellikleri atla
            if (attrName.equals("Renk") || attrName.equals("RenkKodu") || 
                attrName.equals("Kapasite") || attrName.equals("Beden") || attrName.equals("Numara")) {
                continue;
            }
            
            String valueStr = attrValue.getValue();
            attributes.put(attrName, valueStr);
            System.out.println("    * Diğer özellik eklendi: " + attrName + " = " + valueStr);
            
            // attributesWithIds için diğer özellikler
            Map<String, Object> otherAttrWithId = new HashMap<>();
            otherAttrWithId.put("attribute_id", attrValue.getAttribute().getId());
            otherAttrWithId.put("key", attrName);
            otherAttrWithId.put("value", valueStr);
            attributesWithIds.add(otherAttrWithId);
        }
        
        dto.setAttributes(attributes);
        dto.setAttributesWithIds(attributesWithIds);
        
        // Görsel URL'lerini listeye dönüştür
        List<String> imageUrls = variant.getImages().stream()
            .sorted(Comparator.comparing(VariantImage::getDisplayOrder))
            .map(VariantImage::getImageUrl)
            .collect(Collectors.toList());
        dto.setImageUrls(imageUrls);
        
        // Debug: Son DTO içeriğini görüntüle
        System.out.println("DTO özellikleri (attribute sayısı): " + (attributes != null ? attributes.size() : "null"));
        if (attributes != null) {
            for (Map.Entry<String, String> entry : attributes.entrySet()) {
                System.out.println("  - " + entry.getKey() + ": " + entry.getValue());
            }
        }
        
        System.out.println("===== VARYANT DTO DÖNÜŞTÜRME TAMAMLANDI =====\n");
        return dto;
    }

    /**
     * Ürünü ID'ye göre getir veya hata fırlat
     */
    private Product findProductById(long id) {
        return getProduct(id);
    }

    public List<Product> findSimilarProducts(Long productId, String category, String brand, int limit) {
        try {
            // Önce mevcut ürünü bul
            Product currentProduct = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Ürün bulunamadı"));

            // Benzer ürünleri bulmak için sorgu oluştur
            Specification<Product> spec = Specification.where(null);

            // Aktif ürünleri filtrele
            spec = spec.and((root, query, cb) -> cb.isTrue(root.get("status")));

            // Mevcut ürünü hariç tut
            spec = spec.and((root, query, cb) -> cb.notEqual(root.get("id"), productId));

            // Kategori filtresi - hem doğrudan kategori hem de alt kategoriler
            if (category != null && !category.isEmpty()) {
                spec = spec.and((root, query, cb) -> {
                    // Ana kategori veya alt kategorilerde ara
                    return cb.or(
                        cb.equal(root.get("category").get("name"), category),
                        cb.equal(root.get("category").get("parent").get("name"), category)
                    );
                });
            }

            // Marka filtresi
            if (brand != null && !brand.isEmpty()) {
                spec = spec.and((root, query, cb) -> 
                    cb.equal(root.get("brand").get("name"), brand));
            }

            // Fiyat aralığı - mevcut ürünün fiyatının %20 altı ve üstü
            if (currentProduct.getPrice() != null) {
                BigDecimal price = currentProduct.getPrice();
                BigDecimal minPrice = price.multiply(new BigDecimal("0.8"));
                BigDecimal maxPrice = price.multiply(new BigDecimal("1.2"));
                spec = spec.and((root, query, cb) -> 
                    cb.between(root.get("price"), minPrice, maxPrice));
            }

            // Sorguyu çalıştır ve sonuçları döndür
            return productRepository.findAll(spec, PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "totalStock")))
                .getContent();
        } catch (Exception e) {
            System.err.println("Benzer ürünler bulunurken hata: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Mağazaya ait ürünleri getir
     */
    @Transactional(readOnly = true)
    public List<Product> getProductsByStoreId(Long storeId) {
        // Mağazaya ait tüm aktif ürünleri getir
        return entityManager.createQuery(
            "SELECT p FROM Product p WHERE p.store.id = :storeId AND p.status = 'active' ORDER BY p.createdAt DESC", 
            Product.class)
            .setParameter("storeId", storeId)
            .getResultList();
    }
    
    /**
     * Mağazaya ait öne çıkan ürünleri getir
     */
    @Transactional(readOnly = true)
    public List<Product> getFeaturedProductsByStoreId(Long storeId, int limit) {
        // Mağazaya ait öne çıkan/featured ürünleri getir
        return entityManager.createQuery(
            "SELECT p FROM Product p WHERE p.store.id = :storeId AND p.status = 'active' AND p.featured = true ORDER BY p.createdAt DESC", 
            Product.class)
            .setParameter("storeId", storeId)
            .setMaxResults(limit)
            .getResultList();
    }

    /**
     * Toplam ürün sayısını döndürür
     */
    public long getProductCount() {
        return productRepository.count();
    }
    
    /**
     * Belirtilen gün sayısı içinde eklenen yeni ürün sayısını döndürür
     */
    public long getNewProductCount(int days) {
        LocalDateTime daysAgo = LocalDateTime.now().minusDays(days);
        return productRepository.countByCreatedAtAfter(daysAgo);
    }

    /**
     * Ürünün toplam stok değerini hesaplar ve günceller
     * @param productId Ürün ID
     * @return Güncellenen ürün
     */
    @Transactional
    public Product updateProductTotalStock(long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Ürün bulunamadı: " + productId));
        
        // Ürünün tüm varyantlarını al
        List<ProductVariant> variants = productVariantRepository.findByProductId(productId);
        
        // Toplam stok miktarını hesapla
        int totalStock = 0;
        if (variants != null && !variants.isEmpty()) {
            // Varyantlar varsa, her varyantın stok miktarını topla
            for (ProductVariant variant : variants) {
                totalStock += variant.getStockQuantity();
            }
            System.out.println("Ürün ID: " + productId + " - Toplam stok hesaplandı: " + totalStock + " (" + variants.size() + " varyant)");
        } else {
            // Varyant yoksa, ürünün kendi stok değerini kullan
            totalStock = product.getStock();
            System.out.println("Ürün ID: " + productId + " - Varyant olmadığı için kendi stok değeri kullanıldı: " + totalStock);
        }
        
        // Toplam stok değerini güncelle
        product.setTotalStock(totalStock);
        Product updatedProduct = productRepository.save(product);
        System.out.println("Ürün ID: " + productId + " - Toplam stok güncellendi: " + totalStock);
        
        return updatedProduct;
    }

    /**
     * Ürüne yeni bir varyant ekler
     * @param productId Ürün ID
     * @param variantDTO Eklenecek varyant bilgileri
     * @return Eklenen varyantın DTO nesnesi
     */
    @Transactional
    public ProductVariantDTO addProductVariant(long productId, ProductVariantDTO variantDTO) {
        try {
            // Ürünün varlığını kontrol et
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new EntityNotFoundException("Ürün bulunamadı: " + productId));
            
            System.out.println("Ürün bulundu ID: " + product.getId() + ", İsim: " + product.getName());
            
            // Yeni varyant oluştur
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku(variantDTO.getSku());
            variant.setPrice(variantDTO.getPrice());
            variant.setStockQuantity(variantDTO.getStock());
            variant.setActive(variantDTO.getActive());
            // imageUrl artık variant sınıfında yok
            
            System.out.println("Varyant oluşturuldu, SKU: " + variantDTO.getSku() + ", Stok: " + variantDTO.getStock());
            
            // Status alanını ayarla, yoksa varsayılan "active" olsun
            if (variantDTO.getStatus() != null) {
                variant.setStatus(variantDTO.getStatus());
            } else {
                variant.setStatus("active");
            }
            
            // Önce varyantı kaydet - Bu, ID oluşturacak
            // AttributeValues koleksiyonunu boş bırakarak ilişkilerden kaçınalım
            variant.setAttributeValues(new ArrayList<>());
            ProductVariant savedVariant = productVariantRepository.save(variant);
            System.out.println("Varyant kaydedildi, ID: " + savedVariant.getId());
            
            // Şimdi özellikler ve değerler
            if (variantDTO.getAttributes() != null) {
                System.out.println("Varyant özellikleri işleniyor: " + variantDTO.getAttributes().size() + " adet");
                
                // Yeni özellikleri ekle
                for (Map.Entry<String, String> entry : variantDTO.getAttributes().entrySet()) {
                    String attrName = entry.getKey();
                    String attrValue = entry.getValue();
                    
                    System.out.println("Özellik işleniyor: " + attrName + " = " + attrValue);
                    
                    // Özel renk kodu alanını atla, onu ayrıca işleyeceğiz
                    if (attrName.equals("RenkKodu")) {
                        continue;
                    }
                    
                    // Özelliği bulalım
                    ProductAttribute attribute = productAttributeRepository.findByNameAndProductId(attrName, product.getId())
                        .orElseGet(() -> {
                            // Özellik yoksa yeni oluştur
                            System.out.println("Özellik bulunamadı, yeni oluşturuluyor: " + attrName);
                            ProductAttribute newAttr = new ProductAttribute();
                            newAttr.setName(attrName);
                            newAttr.setType("SELECT");
                            newAttr.setRequired(true);
                            newAttr.setProduct(product);
                            
                            // Ürüne ait kategoriyi de ekle - NULL sorunu çözümü
                            if (product.getCategory() != null) {
                                System.out.println("Özelliğe kategori ekleniyor: " + product.getCategory().getName() + " (ID: " + product.getCategory().getId() + ")");
                                newAttr.setCategory(product.getCategory());
                            } else {
                                System.out.println("UYARI: Ürünün kategorisi bulunamadı, özelliğe kategori eklenemedi!");
                            }
                            
                            return productAttributeRepository.save(newAttr);
                        });
                    
                    System.out.println("Özellik ID: " + attribute.getId() + ", Özellik adı: " + attribute.getName());
                                        // Özellik değerini bulalım veya oluşturalım
                                        List<ProductAttributeValue> existingValues = productAttributeValueRepository.findByAttributeIdAndValue(attribute.getId(), attrValue);
                                        ProductAttributeValue attributeValue;
                                        
                                        if (!existingValues.isEmpty()) {
                                            // İlk bulunan değeri kullan
                                            attributeValue = existingValues.get(0);
                                        } else {
                                            // Değer yoksa yeni oluştur
                                            System.out.println("Özellik değeri bulunamadı, yeni oluşturuluyor: " + attrValue);
                                            ProductAttributeValue newValue = new ProductAttributeValue();
                                            newValue.setValue(attrValue);
                                            newValue.setDisplayValue(attrValue);
                                            newValue.setAttribute(attribute);
                                            newValue.setProduct(product);
                                            
                                            // Renk özelliği ise ve renk kodu var mı kontrol et
                                            if (attrName.equalsIgnoreCase("Renk") && variantDTO.getAttributes().containsKey("RenkKodu")) {
                                                String colorCode = variantDTO.getAttributes().get("RenkKodu");
                                                System.out.println("Renk kodunu ayarlıyorum: " + colorCode);
                                                newValue.setColorCode(colorCode);
                                            }
                                            
                                            newValue.setInStock(true);
                                            attributeValue = productAttributeValueRepository.save(newValue);
                                        }
                    
                    System.out.println("Özellik değeri ID: " + attributeValue.getId() + ", Değer: " + attributeValue.getValue());
                    
                    // DİKKAT: Bu satır doğrudan variant_attribute_values tablosuna veri ekler,
                    // ancak attributeValue.id değerini atamayı yapmadan tabloyu güncellemekte 
                    // olan addAttributeValue metodu
                    
                    // EntityManager ile ilişkiyi doğrudan kur - MANUEL BAĞLANTI
                    String sql = "INSERT INTO variant_attribute_values (variant_id, attribute_value_id, attribute_id) VALUES (?, ?, ?)";
                    entityManager.createNativeQuery(sql)
                        .setParameter(1, savedVariant.getId())
                        .setParameter(2, attributeValue.getId())
                        .setParameter(3, attribute.getId())
                        .executeUpdate();

                    System.out.println("Varyant-Özellik ilişkisi kuruldu, Varyant ID: " + 
                                     savedVariant.getId() + ", Özellik Değeri ID: " + attributeValue.getId() + 
                                     ", Özellik ID: " + attribute.getId());
                    
                    // NOT: Burada koleksiyonları güncellemeyelim, bunun yerine aşağıda 
                    // varyantı yeniden yükleyelim ve JPA'nın ilişkileri otomatik kurmasını engelleyelim
                }
            }
            
            // Görselleri ekle
            if (variantDTO.getImageUrls() != null && !variantDTO.getImageUrls().isEmpty()) {
                System.out.println("Varyant görselleri ekleniyor: " + variantDTO.getImageUrls().size() + " adet");
                int order = 1;
                for (String imageUrl : variantDTO.getImageUrls()) {
                    VariantImage image = new VariantImage();
                    image.setVariant(savedVariant);
                    image.setImageUrl(imageUrl);
                    image.setDisplayOrder(order++);
                    image.setIsMain(order == 2); // İlk resmi ana resim olarak işaretle
                    variantImageRepository.save(image);
                }
            }
            
            // İlişkilerin doğrudan JPA tarafından kurulmasını engellemek için 
            // her şeyi bağlayıp veritabanına yazdıktan sonra yeni bir sorgu ile varyantı tekrar çekelim
            entityManager.flush();
            entityManager.clear();
            
            // Ürünün toplam stok bilgisini güncelle
            updateProductTotalStock(productId);
            
            // Güncel varyantı tekrar oku
            ProductVariant refreshedVariant = productVariantRepository.findById(savedVariant.getId())
                .orElseThrow(() -> new EntityNotFoundException("Varyant kaydedilemedi"));
            
            // DTO'ya dönüştür ve döndür
            return convertToVariantDTO(refreshedVariant);
            
        } catch (Exception e) {
            System.err.println("Varyant eklenirken hata: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional
    public Product updateStatus(Long id, String status) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + id));
        
        // Ürünün durumunu güncelle
        product.setStatus(status);
        
        // Ürüne ait tüm varyantları al ve statülerini güncelle
        List<ProductVariant> variants = productVariantRepository.findByProductId(id);
        if (variants != null && !variants.isEmpty()) {
            for (ProductVariant variant : variants) {
                variant.setStatus(status);
                variant.setActive("active".equals(status)); // active/inactive durumuna göre boolean değeri güncelle
                productVariantRepository.save(variant);
            }
        }
        
        return productRepository.save(product);
    }
    
    /**
     * Satıcı için ürün durumunu güncelle (satıcının kendi ürünlerini kontrol eder)
     */
    @Transactional
    public Optional<Product> updateProductStatusForSeller(Long id, String status, Long userId) {
        // Ürünü bul
        Optional<Product> productOpt = productRepository.findById(id);
        if (!productOpt.isPresent()) {
            System.out.println("Ürün bulunamadı: " + id);
            return Optional.empty();
        }
        
        Product product = productOpt.get();
        
        // Kullanıcının mağazalarını bul
        List<Store> userStores = storeRepository.findByOwnerId(userId);
        List<Long> userStoreIds = userStores.stream().map(Store::getId).collect(Collectors.toList());
        
        // Ürünün mağazası kullanıcıya ait mi kontrol et
        if (product.getStore() == null || !userStoreIds.contains(product.getStore().getId())) {
            System.out.println("Bu ürün satıcıya ait değil. Ürün mağazası: " + 
                            (product.getStore() != null ? product.getStore().getId() : "null") + 
                            ", Satıcı mağazaları: " + userStoreIds);
            return Optional.empty();
        }
        
        // Ürünün durumunu güncelle
        product.setStatus(status);
        
        // Ürüne ait tüm varyantları al ve statülerini güncelle
        List<ProductVariant> variants = productVariantRepository.findByProductId(id);
        if (variants != null && !variants.isEmpty()) {
            for (ProductVariant variant : variants) {
                variant.setStatus(status);
                variant.setActive("active".equals(status)); // active/inactive durumuna göre boolean değeri güncelle
                productVariantRepository.save(variant);
            }
        }
        
        return Optional.of(productRepository.save(product));
    }

    /**
     * Renk koduna göre renk adını bulan yardımcı metot
     */
    private String findColorNameByCode(String colorCode) {
        if (colorCode == null || colorCode.trim().isEmpty()) {
            return "Bilinmeyen";
        }
        
        // Hex renk kodları ve karşılık gelen renk isimleri
        Map<String, String> colorMap = new HashMap<>();
        colorMap.put("#000000", "Siyah");
        colorMap.put("#FFFFFF", "Beyaz");
        colorMap.put("#FF0000", "Kırmızı");
        colorMap.put("#0000FF", "Mavi");
        colorMap.put("#008000", "Yeşil");
        colorMap.put("#FFFF00", "Sarı");
        colorMap.put("#FFA500", "Turuncu");
        colorMap.put("#800080", "Mor");
        colorMap.put("#A52A2A", "Kahverengi");
        colorMap.put("#808080", "Gri");
        colorMap.put("#C0C0C0", "Gümüş");
        colorMap.put("#000080", "Lacivert");
        colorMap.put("#FFC0CB", "Pembe");
        
        // Renk kodunu büyük harfe çevir
        String normalizedCode = colorCode.toUpperCase();
        
        // Eğer # ile başlamıyorsa, ekle
        if (!normalizedCode.startsWith("#")) {
            normalizedCode = "#" + normalizedCode;
        }
        
        // Map'te olan bir renk mi kontrol et
        if (colorMap.containsKey(normalizedCode)) {
            return colorMap.get(normalizedCode);
        }
        
        // Eğer tam eşleşme bulunamadıysa, benzer bir renk
        // tonunu bulmaya çalış - gelecekte geliştirilebilir
        
        // Bulunamadı, varsayılan olarak renk kodunu döndür
        return colorCode;
    }

    /**
     * Satıcının belirli bir mağazasına ait ürünleri sayfalı şekilde getir
     */
    public Page<Product> getSellerStoreProducts(Long storeId, Long sellerId, int page, int size, String sort, String category) {
        // Öncelikle bu store'un bu seller'a ait olduğunu kontrol et
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new ResourceNotFoundException("Mağaza bulunamadı: " + storeId));
        
        // Satıcının bu mağazaya erişim hakkı var mı kontrol et
        if (!store.getOwner().getId().equals(sellerId)) {
            throw new AccessDeniedException("Bu mağazaya erişim yetkiniz yok");
        }
        
        // Sayfalama için PageRequest oluştur
        String[] sortParams = sort.split(",");
        String sortField = sortParams[0];
        Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("desc") ? 
            Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
        
        // Tüm ürünleri alıp stream API kullanarak filtreleyelim
        List<Product> allProducts = productRepository.findAll();
        List<Product> filteredProducts;
        
        // Kategori filtresi varsa kategori ile filtrele
        if (category != null && !category.isEmpty()) {
            try {
                // Kategori ID'si sayısal değer ise
                Long categoryId = Long.parseLong(category);
                
                filteredProducts = allProducts.stream()
                    .filter(p -> p.getStore() != null && p.getStore().getId().equals(storeId))
                    .filter(p -> p.getCategory() != null)
                    .filter(p -> {
                        // Kategori bir Object olduğu için türüne göre kontrol yapıyoruz
                        if (p.getCategory() instanceof Category) {
                            Category cat = (Category) p.getCategory();
                            return cat.getId().equals(categoryId);
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
                
            } catch (NumberFormatException e) {
                // Kategori ID'si sayısal değer değilse, kategori adına göre filtrele
                filteredProducts = allProducts.stream()
                    .filter(p -> p.getStore() != null && p.getStore().getId().equals(storeId))
                    .filter(p -> p.getCategory() != null)
                    .filter(p -> {
                        // Kategori bir Object olduğu için türüne göre kontrol yapıyoruz
                        if (p.getCategory() instanceof Category) {
                            Category cat = (Category) p.getCategory();
                            return cat.getName().equalsIgnoreCase(category);
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
            }
        } else {
            // Kategori filtresi yoksa sadece mağazaya göre filtrele
            filteredProducts = allProducts.stream()
                .filter(p -> p.getStore() != null && p.getStore().getId().equals(storeId))
                .collect(Collectors.toList());
        }
        
        // Stream API ile filtrelenen ürünleri Page nesnesine dönüştür
        int start = (int)pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filteredProducts.size());
        
        // Boş liste sorunu için kontrol
        if (start >= filteredProducts.size()) {
            return new PageImpl<>(Collections.emptyList(), pageable, filteredProducts.size());
        }
        
        return new PageImpl<>(
            filteredProducts.subList(start, end),
            pageable,
            filteredProducts.size()
        );
    }
} 