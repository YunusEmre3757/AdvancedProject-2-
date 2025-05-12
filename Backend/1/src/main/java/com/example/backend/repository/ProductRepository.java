package com.example.backend.repository;

import com.example.backend.model.Product;
import com.example.backend.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    // Ana sayfa için öne çıkan ürünleri getir
    @Query("SELECT p FROM Product p JOIN p.store s WHERE p.status = 'active' AND p.featured = true AND s.status = 'approved'")
    List<Product> findByActiveAndFeaturedTrue(boolean active);
    
    // İndirimli ürünleri getir
    @Query("SELECT p FROM Product p JOIN p.store s WHERE p.status = 'active' AND p.minPrice < p.price AND s.status = 'approved'")
    List<Product> findDiscountedProducts();
    
    // En çok satan ürünleri getir (örnek sorgu, gerçek implementasyona göre değişebilir)
    @Query(value = "SELECT p.* FROM products p JOIN (SELECT product_id, COUNT(*) as sale_count FROM order_items GROUP BY product_id ORDER BY sale_count DESC LIMIT 10) sales ON p.id = sales.product_id JOIN stores s ON p.store_id = s.id WHERE p.status = 'active' AND s.status = 'approved'", nativeQuery = true)
    List<Product> findBestSellers();
    
    // Yeni ürünleri getir
    @Query("SELECT p FROM Product p JOIN p.store s WHERE p.status = 'active' AND s.status = 'approved' ORDER BY p.createdAt DESC")
    Page<Product> findByActiveOrderByCreatedAtDesc(boolean active, Pageable pageable);
    
    // Slug ile ürün bul
    @Query("SELECT p FROM Product p JOIN p.store s WHERE p.slug = :slug AND p.status = 'active' AND s.status = 'approved'")
    Optional<Product> findBySlug(String slug);
    
    // Kategori ID'sine göre ürünleri getir
    @Query("SELECT p FROM Product p JOIN p.store s WHERE p.category.id = :categoryId AND p.status = 'active' AND s.status = 'approved'")
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    
    // Kategori slug'ına göre ürünleri getir
    @Query("SELECT p FROM Product p JOIN p.category c JOIN p.store s WHERE LOWER(c.slug) = LOWER(:slug) AND p.status = 'active' AND s.status = 'approved'")
    Page<Product> findByCategorySlugAndActive(@Param("slug") String slug, Pageable pageable);
    
    // Daha basit ve güvenilir kategori ID sorgusu - alt kategorileri de dahil edecek
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    List<Product> findByCategoryHierarchy(@Param("categoryId") Long categoryId);
    
    // Daha basit ve güvenilir kategori ID sorgusu (Page versiyonu)
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            countQuery = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT COUNT(p.id) FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    Page<Product> findByCategoryHierarchy(@Param("categoryId") Long categoryId, Pageable pageable);
    
    // Alternatif bir yaklaşım - level kullanarak kategori ve altlarını getir
    @Query(value = 
            "SELECT p.* FROM products p " +
            "JOIN categories c1 ON p.category_id = c1.id " +
            "JOIN categories c2 ON (c1.id = c2.id OR c1.parent_id = c2.id OR " +
            "c1.parent_id IN (SELECT id FROM categories WHERE parent_id = c2.id)) " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE c2.id = :categoryId AND p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    List<Product> findSimpleProductsByCategoryHierarchy(@Param("categoryId") Long categoryId);
    
    // Daha basit ve güvenilir kategori SLUG sorgusu
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " + 
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " + 
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT DISTINCT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    List<Product> findByCategorySlugHierarchy(@Param("slug") String slug);
    
    // Daha basit ve güvenilir kategori SLUG sorgusu (Page versiyonu)
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT DISTINCT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            countQuery = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT COUNT(DISTINCT p.id) FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    Page<Product> findByCategorySlugHierarchy(@Param("slug") String slug, Pageable pageable);
    
    // Alternatif yaklaşım - level kullanarak kategori ve altlarını getir
    @Query(value = 
            "SELECT DISTINCT p.* FROM products p " +
            "JOIN categories c1 ON p.category_id = c1.id " +
            "JOIN categories c2 ON (c1.id = c2.id OR c1.parent_id = c2.id OR " +
            "c1.parent_id IN (SELECT id FROM categories WHERE parent_id = c2.id)) " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE (LOWER(c2.slug) = LOWER(:slug) " +
            "OR REPLACE(LOWER(c2.slug), ' & ', '-') = LOWER(:slug) " +
            "OR REPLACE(LOWER(c2.slug), '&', '-') = LOWER(:slug) " +
            "OR REPLACE(LOWER(c2.slug), ' ', '-') = LOWER(:slug) " + 
            "OR REPLACE(LOWER(c2.slug), '-', ' ') = LOWER(:slug) " +
            "OR REPLACE(LOWER(REPLACE(c2.slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "OR REPLACE(LOWER(REPLACE(REPLACE(c2.slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "OR REPLACE(LOWER(REPLACE(c2.slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i'))) " +
            "AND p.status = 'active' AND s.status = 'approved'",
            nativeQuery = true)
    List<Product> findSimpleProductsByCategorySlugHierarchy(@Param("slug") String slug);
    
    // Arama sorgusu ile ürünleri getir - daha esnek arama yapısı
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.brand b JOIN p.store s WHERE p.status = 'active' AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR (b IS NOT NULL AND LOWER(b.name) LIKE LOWER(CONCAT('%', :query, '%')))) AND s.status = 'approved'")
    Page<Product> searchProducts(@Param("query") String query, Pageable pageable);
    
    // Arama ve kategori filtreleme - daha esnek arama yapısı
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.brand b JOIN p.store s WHERE p.status = 'active' AND p.category.id = :categoryId AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR (b IS NOT NULL AND LOWER(b.name) LIKE LOWER(CONCAT('%', :query, '%')))) AND s.status = 'approved'")
    Page<Product> searchProductsByCategoryId(@Param("query") String query, @Param("categoryId") Long categoryId, Pageable pageable);
    
    // Markaya göre ürünleri getir
    Page<Product> findByBrandIdAndActive(Long brandId, boolean active, Pageable pageable);
    
    // Benzersiz markaları getir - artık gerekli değil, BrandRepository kullanılıyor
    /*@Query("SELECT DISTINCT p.brand FROM Product p WHERE p.active = true AND p.brand IS NOT NULL ORDER BY p.brand")
    List<String> findAllBrands();*/

    Page<Product> findAll(Pageable pageable);

    List<Product> findAllByCategory(Category category);
    
    // Mağazaya göre tüm ürünleri getir
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId")
    List<Product> findAllByStoreId(@Param("storeId") Long storeId);
    
    long countByCreatedAtAfter(LocalDateTime date);

    // Admin için kategori hiyerarşi sorgusu - store.status filtresi olmadan
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "WHERE p.status = 'active'",
            nativeQuery = true)
    List<Product> findByCategoryHierarchyForAdmin(@Param("categoryId") Long categoryId);
    
    // Admin için kategori hiyerarşi sorgusu - page version - store.status filtresi olmadan
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "WHERE p.status = 'active'",
            countQuery = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE id = :categoryId " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT COUNT(p.id) FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "WHERE p.status = 'active'",
            nativeQuery = true)
    Page<Product> findByCategoryHierarchyForAdmin(@Param("categoryId") Long categoryId, Pageable pageable);
    
    // Admin için kategori SLUG sorgusu - store.status filtresi olmadan
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " + 
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT DISTINCT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "WHERE p.status = 'active'",
            nativeQuery = true)
    List<Product> findByCategorySlugHierarchyForAdmin(@Param("slug") String slug);
    
    // Admin için kategori SLUG sorgusu - page version - store.status filtresi olmadan
    @Query(value = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " + 
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT DISTINCT p.* FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "WHERE p.status = 'active'",
            countQuery = 
            "WITH RECURSIVE category_hierarchy AS (" +
            "  SELECT id, parent_id FROM categories WHERE LOWER(slug) = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' & ', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), '&', '-') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(slug), ' ', '-') = LOWER(:slug) " + 
            "  OR REPLACE(LOWER(slug), '-', ' ') = LOWER(:slug) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ı', 'i')), 'ş', 's') = LOWER(REPLACE(REPLACE(:slug, 'ı', 'i'), 'ş', 's')) " +
            "  OR REPLACE(LOWER(REPLACE(REPLACE(slug, 'ğ', 'g'), 'ü', 'u')), 'ö', 'o') = LOWER(REPLACE(REPLACE(REPLACE(:slug, 'ğ', 'g'), 'ü', 'u'), 'ö', 'o')) " +
            "  OR REPLACE(LOWER(REPLACE(slug, 'ç', 'c')), 'i̇', 'i') = LOWER(REPLACE(REPLACE(:slug, 'ç', 'c'), 'i̇', 'i')) " +
            "  UNION ALL " +
            "  SELECT c.id, c.parent_id FROM categories c " +
            "  JOIN category_hierarchy ch ON c.parent_id = ch.id " +
            ") " +
            "SELECT COUNT(DISTINCT p.id) FROM products p " +
            "JOIN category_hierarchy ch ON p.category_id = ch.id " +
            "JOIN stores s ON p.store_id = s.id " +
            "WHERE p.status = 'active'",
            nativeQuery = true)
    Page<Product> findByCategorySlugHierarchyForAdmin(@Param("slug") String slug, Pageable pageable);
    
    // Mağazaya ait ürün sayısını getir
    @Query("SELECT COUNT(p) FROM Product p WHERE p.store.id = :storeId")
    int countByStoreId(@Param("storeId") Long storeId);
} 