import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, firstValueFrom, lastValueFrom } from 'rxjs';
import { Product, ProductAttribute, ProductType, AttributeType, AttributeValue, ProductVariant } from '../models/product.interface';
import { environment } from '../../environments/environment';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  // Tüm ürünleri getir
  getProducts(params?: {
    page?: number;
    size?: number;
    sort?: string;
    category?: string;
    search?: string;
    brand?: string;  // Tek marka veya virgülle ayrılmış çoklu marka ID'leri
    brands?: string;  // Çoklu marka filtresi (virgülle ayrılmış marka ID'leri) - Frontend kullanımı için
    minPrice?: number; // Minimum fiyat filtresi
    maxPrice?: number; // Maximum fiyat filtresi
    stockFilter?: string; // Stock filter (instock, outofstock)
  }): Observable<{ items: Product[], total: number }> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.search) httpParams = httpParams.set('search', params.search);
      
      // Eğer çoklu marka varsa (brands) bunu brand parametresine dönüştür
      if (params.brands) {
        httpParams = httpParams.set('brand', params.brands);
        console.log(`Çoklu marka filtresi 'brand' parametresine aktarıldı: ${params.brands}`);
      } 
      // Tekil marka varsa direkt gönder
      else if (params.brand) {
        httpParams = httpParams.set('brand', params.brand);
        console.log(`Tekli marka filtresi: ${params.brand}`);
      }
      
      // Fiyat filtresi parametreleri
      if (params.minPrice !== undefined) {
        httpParams = httpParams.set('minPrice', params.minPrice.toString());
      }
      
      if (params.maxPrice !== undefined) {
        httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      }
      
      // Stok durumu filtresi
      if (params.stockFilter) {
        httpParams = httpParams.set('stockFilter', params.stockFilter);
      }
    }

    console.log('getProducts API çağrısı:', {
      url: this.apiUrl,
      params: Object.fromEntries(httpParams.keys().map(key => [key, httpParams.get(key)]))
    });
    
    return this.http.get<{ items: Product[], total: number }>(this.apiUrl, { params: httpParams })
      .pipe(
        tap(response => console.log(`getProducts API yanıtı: ${response.items.length} ürün, toplam: ${response.total}`)),
        catchError(error => {
          console.error('getProducts API hatası:', error);
          return throwError(() => new Error('Ürünler yüklenirken bir hata oluştu'));
        })
      );
  }

  // Öne çıkan ürünleri getir
  getFeaturedProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/featured`);
  }

  // Tek bir ürün detayını getir
  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  // Kategoriye göre ürünleri getir
  getProductsByCategory(categoryId: number | string): Observable<Product[]> {
    // Sayısal ID ile çağrı yap
    if (typeof categoryId === 'number' || !isNaN(Number(categoryId))) {
      const numericId = typeof categoryId === 'number' ? categoryId : Number(categoryId);
      console.log(`Kategori ID ile ürünleri getir: ${numericId}`);
      
      // Örnek: http://localhost:8080/api/products/category/1
      return this.http.get<Product[]>(`${this.apiUrl}/category/${numericId}`)
        .pipe(
          tap(products => console.log(`Kategori ${numericId} için ${products.length} ürün bulundu`)),
          catchError(error => {
            console.error(`Kategori ID ${numericId} için ürünleri getirirken hata:`, error);
            return of([]);
          })
        );
    } 
    // String slug ile çağrı yap
    else {
      const slug = categoryId.toString();
      console.log(`Kategori slug'ı ile ürünleri getir: ${slug}`);
      
      // Backend'de zaten Türkçe karakter dönüşümü ve hierarchical sorgu yapılıyor
      // Bu nedenle doğrudan slug'ı gönderiyoruz (normalizasyon yapmadan)
      return this.http.get<Product[]>(`${this.apiUrl}/category/slug/${slug}`)
        .pipe(
          tap(products => console.log(`Kategori slug ${slug} için ${products.length} ürün bulundu`)),
          catchError(error => {
            console.error(`Kategori slug ${slug} için ürünleri getirirken hata:`, error);
            return of([]);
          })
        );
    }
  }

  // Ürün ara
  searchProducts(query: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
    category?: string;
    brand?: string;  // Tek marka veya virgülle ayrılmış marka ID'leri
    brands?: string;  // Çoklu marka - Frontend kullanımı için
    minPrice?: number; // Minimum fiyat filtresi
    maxPrice?: number; // Maximum fiyat filtresi
    stockFilter?: string; // Stock filter (instock, outofstock)
  }): Observable<any> {
    let httpParams = new HttpParams().set('q', query);
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.category) httpParams = httpParams.set('category', params.category);
      
      // Çoklu marka varsa tek parametreye dönüştür
      if (params.brands) {
        httpParams = httpParams.set('brand', params.brands);
        console.log(`Arama için çoklu marka filtresi 'brand' parametresine aktarıldı: ${params.brands}`);
      } else if (params.brand) {
        httpParams = httpParams.set('brand', params.brand);
        console.log(`Arama için tekli marka filtresi: ${params.brand}`);
      }
      
      // Fiyat filtresi parametreleri
      if (params.minPrice !== undefined) {
        httpParams = httpParams.set('minPrice', params.minPrice.toString());
      }
      
      if (params.maxPrice !== undefined) {
        httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      }
      
      // Stok durumu filtresi
      if (params.stockFilter) {
        httpParams = httpParams.set('stockFilter', params.stockFilter);
      }
    }
    
    console.log('Arama isteği gönderiliyor:', {
      url: `${this.apiUrl}/search`,
      params: Object.fromEntries(httpParams.keys().map(key => [key, httpParams.get(key)]))
    });
    
    return this.http.get<{ items: Product[], total: number }>(`${this.apiUrl}/search`, { params: httpParams })
      .pipe(
        tap(response => {
          console.log('Arama sonuçları:', response);
          if (response.items && response.items.length) {
            console.log(`${response.items.length} ürün bulundu, toplam: ${response.total}`);
            console.log('İlk ürün:', response.items[0]);
          } else {
            console.log('Arama sonucu bulunamadı');
          }
        }),
        catchError(error => {
          console.error('Arama sırasında hata:', error);
          return throwError(() => new Error('Arama sonuçları alınamadı'));
        })
      );
  }

  // Marka listesini getir (artık BrandService kullanılıyor)
  getBrands(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/brands`)
      .pipe(
        catchError(() => {
          console.warn('Backend brands endpoint not found, returning sample brands');
          return of(['Adidas', 'Nike', 'Puma', 'Reebok', 'Under Armour', 'New Balance']);
        })
      );
  }

  // Arama önerileri al (otomatik tamamlama için)
  getSearchSuggestions(query: string, categorySlug?: string | null): Observable<{ text: string, type: string }[]> {
    if (!query || query.length < 2) return of([]);
    
    let params = new HttpParams()
      .set('search', query)
      .set('size', '5');
    
    // Eğer kategori slug'ı varsa, o kategoriye özel arama yap
    if (categorySlug) {
      params = params.set('category', categorySlug);
    }
    
    return this.http.get<{ items: Product[], total: number }>(`${this.apiUrl}`, {
      params: params
    }).pipe(
      map(response => {
        // Ürün isimlerinden ve markalarından öneriler oluştur
        const suggestionsMap = new Map<string, { text: string, type: string }>();
        
        response.items.forEach(product => {
          // Ürün adı ile eşleşiyorsa ekle
          if (product.name.toLowerCase().includes(query.toLowerCase())) {
            suggestionsMap.set(product.name, { 
              text: product.name, 
              type: 'Ürün' 
            });
          }
          
          // Ürünün markası varsa ve sorgu ile eşleşiyorsa ekle
          if (product.brand && typeof product.brand === 'object' && product.brand.name &&
              product.brand.name.toLowerCase().includes(query.toLowerCase())) {
            suggestionsMap.set(product.brand.name, { 
              text: product.brand.name, 
              type: 'Marka' 
            });
          }
          
          // Ürün kategorisi ile eşleşiyorsa ekle (kategori bir string olduğu için doğrudan kontrol et)
          if (product.category && typeof product.category === 'string' && 
              product.category.toLowerCase().includes(query.toLowerCase())) {
            suggestionsMap.set(product.category, { 
              text: product.category, 
              type: 'Kategori' 
            });
          }
          // Kategori bir obje ise
          else if (product.category && typeof product.category === 'object' && 
                  (product.category as any).name && 
                  (product.category as any).name.toLowerCase().includes(query.toLowerCase())) {
            suggestionsMap.set((product.category as any).name, { 
              text: (product.category as any).name, 
              type: 'Kategori' 
            });
          }
          
          // Mağaza bilgisi varsa ve eşleşiyorsa
          if (product.store && typeof product.store === 'object' && product.store.name &&
              product.store.name.toLowerCase().includes(query.toLowerCase())) {
            suggestionsMap.set(product.store.name, { 
              text: product.store.name, 
              type: 'Mağaza' 
            });
          }
        });
        
        return Array.from(suggestionsMap.values()).slice(0, 7); // En fazla 7 öneri döndür
      }),
      catchError(() => {
        // Hata durumunda backende bağımlı olmayan yumuşak bir geriye dönüş stratejisi
        return of([
          { text: `${query} ile ilgili ürünler`, type: 'Ürün' },
          { text: `${query} markası`, type: 'Marka' },
          { text: `${query} indirimli`, type: 'Kampanya' }
        ]);
      })
    );
  }

  // Markaya göre ürünleri getir (brand parametresi artık ID veya slug olabilir)
  getProductsByBrand(brand: string | number): Observable<Product[]> {
    return this.getProducts({ brand: brand.toString(), size: 50 })
      .pipe(map(response => response.items));
  }


  //KULLANILIYOR
  // Yeni ürün ekle (Admin ve Seller için)
  addProduct(product: any): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, product);
  }

  // Satıcı için ürün ekle - AuthInterceptor artık bu URL'yi korumalı endpoint olarak işaretledi
  addSellerProduct(product: any): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/products`, product);
  }

  // Admin için ürün ekle (spesifik endpoint)
  addAdminProduct(product: any): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/admin/products`, product);
  }

  // Ürün güncelle (Admin için)
  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${environment.apiUrl}/admin/products/${id}`, product);
  }

  // Ürün güncelle (Satıcı için)
  updateSellerProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${environment.apiUrl}/products/${id}`, product);
  }

  // Ürün sil (Admin için)
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/products/${id}`);
  }

  // Ürün sil (Satıcı için)
  deleteSellerProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/products/${id}`);
  }

  // İndirimli ürünleri getir
  getDiscountedProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/discounted`);
  }

  // En çok satanları getir
  getBestSellers(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/best-sellers`);
  }

  // Yeni ürünleri getir
  getNewArrivals(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/new-arrivals`);
  }

 
  // Slug ile ürün getir
  getProductBySlug(slug: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/slug/${slug}`);
  }


  //KULLANILIYOR
  // Ürüne ait özellikleri (attributes) getir
  getProductAttributes(productId: number): Observable<ProductAttribute[]> {
    return this.http.get<ProductAttribute[]>(`${this.apiUrl}/${productId}/attributes`)
      .pipe(
        catchError(error => {
          console.error(`Ürün ${productId} için özellikler alınamadı:`, error);
          // API'den ürün tipi bilgisi ve özellikleri alınamadıysa, bu bilgiyi hesapla
          return this.getProduct(productId).pipe(
            map(product => this.generateAttributesFromProduct(product)),
            catchError(() => of([]))
          );
        })
      );
  }

  // API erişilemediğinde veya ürün tipi belirlenmediğinde, ürün kategorisine göre özellikler oluştur
  private generateAttributesFromProduct(product: Product): ProductAttribute[] {
    const attributes: ProductAttribute[] = [];
    const productType = this.determineProductType(product);
    
    // Ürün tipine göre uygun özellikleri ekle
    if (productType === ProductType.CLOTHING) {
      // Giyim ürünleri için: Beden ve Renk
      attributes.push(this.createSizeAttribute());
      attributes.push(this.createColorAttribute());
    } 
    else if (productType === ProductType.FOOTWEAR) {
      // Ayakkabı ürünleri için: Numara ve Renk
      attributes.push(this.createShoeAttribute());
      attributes.push(this.createColorAttribute());
    }
    else if (productType === ProductType.ELECTRONICS) {
      // Elektronik ürünler için: Sadece Renk
      attributes.push(this.createColorAttribute(true)); // true: sınırlı renk seçenekleri
    }
    else if (productType === ProductType.FURNITURE) {
      // Mobilya ürünleri için: Malzeme ve Renk
      attributes.push(this.createMaterialAttribute());
      attributes.push(this.createColorAttribute());
    }
    else if (productType === ProductType.FOOD) {
      // Gıda ürünleri için: Miktar
      attributes.push(this.createWeightAttribute());
    }
    else if (productType === ProductType.BEAUTY) {
      // Kozmetik ürünleri için: Hacim/Boyut
      attributes.push(this.createVolumeAttribute());
    }
    
    return attributes;
  }

  // Ürün kategorisine göre ürün tipini belirle
  private determineProductType(product: Product): ProductType {
    if (product.productType) return product.productType;
    
    const category = this.getCategoryString(product);
    
    if (!category) return ProductType.DEFAULT;
    
    const lowercaseCategory = category.toLowerCase();
    
    if (/giyim|elbise|tişört|t-shirt|pantolon|kazak|ceket|gömlek|mont/.test(lowercaseCategory)) {
      return ProductType.CLOTHING;
    }
    if (/ayakkabı|bot|çizme|spor ayakkabı|terlik/.test(lowercaseCategory)) {
      return ProductType.FOOTWEAR;
    }
    if (/elektronik|telefon|bilgisayar|tablet|laptop|kamera|kulaklık/.test(lowercaseCategory)) {
      return ProductType.ELECTRONICS;
    }
    if (/mobilya|masa|sandalye|koltuk|yatak|dolap/.test(lowercaseCategory)) {
      return ProductType.FURNITURE;
    }
    if (/kitap|dergi|roman|defter/.test(lowercaseCategory)) {
      return ProductType.BOOK;
    }
    if (/gıda|yiyecek|içecek|atıştırmalık/.test(lowercaseCategory)) {
      return ProductType.FOOD;
    }
    if (/kozmetik|makyaj|parfüm|cilt bakım/.test(lowercaseCategory)) {
      return ProductType.BEAUTY;
    }
    if (/oyuncak|oyun/.test(lowercaseCategory)) {
      return ProductType.TOY;
    }
    
    return ProductType.DEFAULT;
  }
  
  // Kategori bilgisini string olarak al
  private getCategoryString(product: Product): string {
    if (!product.category) return '';
    
    if (typeof product.category === 'string') {
      return product.category;
    }
    
    return (product.category as any).name || '';
  }
  
  // Test için beden (giyim) özelliği oluştur
  private createSizeAttribute(): ProductAttribute {
    return {
      id: 1,
      name: 'Beden',
      type: AttributeType.SIZE,
      values: [
        { id: 1, value: 'XS', displayText: 'XS', inStock: Math.random() > 0.3 },
        { id: 2, value: 'S', displayText: 'S', inStock: Math.random() > 0.2 },
        { id: 3, value: 'M', displayText: 'M', inStock: Math.random() > 0.1 },
        { id: 4, value: 'L', displayText: 'L', inStock: Math.random() > 0.2 },
        { id: 5, value: 'XL', displayText: 'XL', inStock: Math.random() > 0.3 },
        { id: 6, value: 'XXL', displayText: 'XXL', inStock: Math.random() > 0.5 }
      ]
    };
  }
  
  // Test için ayakkabı numarası özelliği oluştur
  private createShoeAttribute(): ProductAttribute {
    return {
      id: 2,
      name: 'Numara',
      type: AttributeType.NUMERIC,
      values: [
        { id: 1, value: '36', displayText: '36', inStock: Math.random() > 0.4 },
        { id: 2, value: '37', displayText: '37', inStock: Math.random() > 0.3 },
        { id: 3, value: '38', displayText: '38', inStock: Math.random() > 0.2 },
        { id: 4, value: '39', displayText: '39', inStock: Math.random() > 0.1 },
        { id: 5, value: '40', displayText: '40', inStock: Math.random() > 0.1 },
        { id: 6, value: '41', displayText: '41', inStock: Math.random() > 0.2 },
        { id: 7, value: '42', displayText: '42', inStock: Math.random() > 0.3 },
        { id: 8, value: '43', displayText: '43', inStock: Math.random() > 0.4 },
        { id: 9, value: '44', displayText: '44', inStock: Math.random() > 0.5 }
      ]
    };
  }
  
  // Test için renk özelliği oluştur (isLimited: elektronik ürünler için sınırlı renk)
  private createColorAttribute(isLimited: boolean = false): ProductAttribute {
    const colors = isLimited ? [
      { id: 1, value: 'Siyah', displayText: 'Siyah', colorCode: '#000000', inStock: true },
      { id: 2, value: 'Beyaz', displayText: 'Beyaz', colorCode: '#FFFFFF', inStock: true },
      { id: 3, value: 'Gümüş', displayText: 'Gümüş', colorCode: '#C0C0C0', inStock: true }
    ] : [
      { id: 1, value: 'Siyah', displayText: 'Siyah', colorCode: '#000000', inStock: true },
      { id: 2, value: 'Beyaz', displayText: 'Beyaz', colorCode: '#FFFFFF', inStock: true },
      { id: 3, value: 'Kırmızı', displayText: 'Kırmızı', colorCode: '#FF0000', inStock: true },
      { id: 4, value: 'Mavi', displayText: 'Mavi', colorCode: '#0000FF', inStock: true },
      { id: 5, value: 'Yeşil', displayText: 'Yeşil', colorCode: '#00CC00', inStock: true },
      { id: 6, value: 'Sarı', displayText: 'Sarı', colorCode: '#FFFF00', inStock: Math.random() > 0.5 },
      { id: 7, value: 'Mor', displayText: 'Mor', colorCode: '#800080', inStock: Math.random() > 0.5 }
    ];
    
    return {
      id: 3,
      name: 'Renk',
      type: AttributeType.COLOR,
      values: colors
    };
  }
  
  // Test için malzeme özelliği oluştur
  private createMaterialAttribute(): ProductAttribute {
    return {
      id: 4,
      name: 'Malzeme',
      type: AttributeType.MATERIAL,
      values: [
        { id: 1, value: 'Ahşap', displayText: 'Ahşap', inStock: true },
        { id: 2, value: 'Metal', displayText: 'Metal', inStock: true },
        { id: 3, value: 'Plastik', displayText: 'Plastik', inStock: true },
        { id: 4, value: 'Kumaş', displayText: 'Kumaş', inStock: true },
        { id: 5, value: 'Cam', displayText: 'Cam', inStock: Math.random() > 0.5 }
      ]
    };
  }
  
  // Test için ağırlık özelliği oluştur
  private createWeightAttribute(): ProductAttribute {
    return {
      id: 5,
      name: 'Miktar',
      type: AttributeType.WEIGHT,
      values: [
        { id: 1, value: '100g', displayText: '100g', inStock: true },
        { id: 2, value: '250g', displayText: '250g', inStock: true },
        { id: 3, value: '500g', displayText: '500g', inStock: true },
        { id: 4, value: '1kg', displayText: '1kg', inStock: true, priceAdjustment: 15 },
        { id: 5, value: '2kg', displayText: '2kg', inStock: Math.random() > 0.3, priceAdjustment: 30 }
      ]
    };
  }
  
  // Test için hacim özelliği oluştur
  private createVolumeAttribute(): ProductAttribute {
    return {
      id: 6,
      name: 'Boyut',
      type: AttributeType.VOLUME,
      values: [
        { id: 1, value: '30ml', displayText: '30ml', inStock: true },
        { id: 2, value: '50ml', displayText: '50ml', inStock: true, priceAdjustment: 10 },
        { id: 3, value: '100ml', displayText: '100ml', inStock: true, priceAdjustment: 20 },
        { id: 4, value: '200ml', displayText: '200ml', inStock: Math.random() > 0.3, priceAdjustment: 35 }
      ]
    };
  }

  // Ürün varyantlarını getir
  getProductVariants(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${this.apiUrl}/${productId}/variants`)
      .pipe(
        catchError(error => {
          console.error(`Ürün ${productId} için varyantlar alınamadı:`, error);
          return of([]);
        })
      );
  }


  //KULLANILIYOR
  // Admin için ürün varyantlarını getir
  getAdminProductVariants(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${environment.apiUrl}/admin/products/${productId}/variants`)
      .pipe(
        catchError(error => {
          console.error(`Ürün ${productId} için admin varyantlar alınamadı:`, error);
          return of([]);
        })
      );
  }

  // Satıcı için ürün varyantlarını getir
  getSellerProductVariants(productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${environment.apiUrl}/seller/products/${productId}/variants`)
      .pipe(
        catchError(error => {
          console.error(`Ürün ${productId} için satıcı varyantları alınamadı:`, error);
          return of([]);
        })
      );
  }

  // Varyant stok durumunu güncelle
  updateVariantStock(variantId: number, stock: number): Observable<ProductVariant> {
    return this.http.patch<ProductVariant>(`${this.apiUrl}/variants/${variantId}/stock`, { stock });
  }

  // Varyant fiyatını güncelle
  updateVariantPrice(variantId: number, price: number): Observable<ProductVariant> {
    return this.http.patch<ProductVariant>(`${this.apiUrl}/variants/${variantId}/price`, { price });
  }

  // Yeni varyant ekle (Admin için)
  addVariant(productId: number, variant: Omit<ProductVariant, 'id' | 'productId'>): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${environment.apiUrl}/admin/products/${productId}/variants`, variant);
  }

  // Satıcı için yeni varyant ekle
  addSellerVariant(productId: number, variant: Omit<ProductVariant, 'id' | 'productId'>): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${environment.apiUrl}/products/${productId}/variants`, variant);
  }

  // Ürün özelliği ekle
  addProductAttribute(productId: number, attribute: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${productId}/attributes`, attribute);
  }



  // Varyant görseli ekle
  addVariantImage(variantId: number, image: { imageUrl: string, displayOrder: number, isMain: boolean }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/products/variants/${variantId}/images`, image);
  }

  // Varyant güncelle
  updateVariant(variantId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    console.log(`Varyant güncelleme isteği: ID=${variantId}`, variant);
    
    // Varyant verilerini backend'in beklediği formata dönüştür
    // Özellikle attributesWithIds formatının doğru olduğundan emin ol
    const payload = {
      ...variant,
      // Aktif olma durumunu her zaman boolean olarak gönder
      active: variant.status === 'active'
    };
    
    return this.http.put<ProductVariant>(`${environment.apiUrl}/admin/products/variants/${variantId}`, payload)
      .pipe(
        tap(response => {
          console.log('Varyant başarıyla güncellendi:', response);
        }),
        catchError(error => {
          console.error('Varyant güncellenirken hata oluştu:', error);
          return throwError(() => new Error('Varyant güncellenirken bir hata oluştu: ' + (error.error?.message || error.message || 'Bilinmeyen hata')));
        })
      );
  }

  // Varyant sil
  deleteVariant(variantId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/products/variants/${variantId}`);
  }

  // Benzer ürünleri getir
  getSimilarProducts(productId: number, limit: number = 4): Observable<Product[]> {
    let params = new HttpParams()
      .set('limit', limit.toString());

    return this.http.get<Product[]>(`${this.apiUrl}/${productId}/similar`, { params })
      .pipe(
        catchError(error => {
          console.error('Benzer ürünler yüklenirken hata:', error);
          return of([]);
        })
      );
  }

  // Mağazaya göre ürünleri getir (satıcı için özel endpoint)
  getProductsByStore(storeId: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
    category?: string;
  }): Observable<{ items: Product[], total: number }> {
    console.log('getProductsByStore API çağrısı:', {
      storeId: storeId,
      params: params
    });
    
    // Doğru endpoint ile API çağrısı yap
    let httpParams = new HttpParams();
    
    // Diğer parametreleri ekle
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.category) httpParams = httpParams.set('category', params.category);
    }
    
    // Satıcı özel endpoint'i kullan: /api/seller/stores/{storeId}/products
    return this.http.get<{ items: Product[], total: number }>(`${environment.apiUrl}/seller/stores/${storeId}/products`, { params: httpParams })
      .pipe(
        tap(response => console.log(`Mağaza (ID: ${storeId}) için ${response.items?.length || 0} ürün yüklendi, toplam: ${response.total || 0}`)),
        catchError(error => {
          console.error(`Mağaza (ID: ${storeId}) ürünleri yüklenirken hata:`, error);
          return throwError(() => new Error('Mağaza ürünleri yüklenirken bir hata oluştu'));
        })
      );
  }

  // Önerilen mağaza ürünleri (bir mağazanın en popüler ürünleri)
  getFeaturedStoreProducts(storeId: string, limit: number = 8): Observable<Product[]> {
    const params = {
      storeId,
      size: limit,
      sort: 'rating,desc'
    };
    
    return this.getProducts(params).pipe(
      map(response => response.items)
    );
  }

  // Popüler aramaları getir (en çok aranan terimler)
  getPopularSearches(limit: number = 5): Observable<{ text: string, count: number }[]> {
    // İsteğe sort parametresi ekleyerek backend'den sıralı veri al
    return this.http.get<{ text: string, count: number }[]>(`${this.apiUrl}/popular-searches`, {
      params: new HttpParams()
        .set('limit', limit.toString())
        .set('sort', 'count,desc') // Arama sayısına göre azalan sıralama
    }).pipe(
      // Sıralama backend'de yapılacak, ama frontend'de de garanti olarak bir kez daha sıralama yapıyoruz
      map(searches => {
        // Sayıya göre azalan sırada
        return searches.sort((a, b) => b.count - a.count);
      }),
      catchError(() => {
        console.warn('Backend popular-searches endpoint not found, returning sample data');
        // Backend endpoint yoksa örnek popüler aramaları döndür (zaten sıralı)
        return of([
          { text: 'Spor Ayakkabı', count: 325 },
          { text: 'Tişört', count: 286 },
          { text: 'Sweatshirt', count: 245 },
          { text: 'Eşofman', count: 189 },
          { text: 'Çanta', count: 156 },
          { text: 'iPhone', count: 142 },
          { text: 'Samsung', count: 128 },
          { text: 'Nike', count: 120 },
          { text: 'Adidas', count: 115 },
          { text: 'Laptop', count: 105 }
        ]);
      })
    );
  }

  // Popüler aramaların sayacını artır
  incrementSearchCount(searchTerm: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/popular-searches/increment`, { term: searchTerm })
      .pipe(
        catchError(error => {
          console.warn('Backend increment-search-count endpoint not found or failed:', error);
          // Sessizce başarısız ol, kullanıcı etkilenmemeli
          return of({ success: false });
        })
      );
  }

  // Admin ürün listesini getir (store.status filtresiz)
  getAdminProducts(params?: {
    page?: number;
    size?: number;
    sort?: string;
    category?: string;
    search?: string;
    brand?: string;
    brands?: string;
    minPrice?: number;
    maxPrice?: number;
    stockFilter?: string;
  }): Observable<{ items: Product[], total: number }> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.search) httpParams = httpParams.set('search', params.search);
      
      // Marka filtresi parametrelerini ekle
      if (params.brands) {
        httpParams = httpParams.set('brand', params.brands);
      } else if (params.brand) {
        httpParams = httpParams.set('brand', params.brand);
      }
      
      // Fiyat filtreleri
      if (params.minPrice !== undefined) {
        httpParams = httpParams.set('minPrice', params.minPrice.toString());
      }
      
      if (params.maxPrice !== undefined) {
        httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      }
      
      // Stok filtresi
      if (params.stockFilter) {
        httpParams = httpParams.set('stockFilter', params.stockFilter);
      }
    }

    console.log('getAdminProducts API çağrısı:', {
      url: `${this.apiUrl}/admin`,
      params: Object.fromEntries(httpParams.keys().map(key => [key, httpParams.get(key)]))
    });
    
    return this.http.get<{ items: Product[], total: number }>(`${this.apiUrl}/admin`, { params: httpParams })
      .pipe(
        tap(response => console.log(`getAdminProducts API yanıtı: ${response.items.length} ürün, toplam: ${response.total}`)),
        catchError(error => {
          console.error('getAdminProducts API hatası:', error);
          return throwError(() => new Error('Admin ürünleri yüklenirken bir hata oluştu'));
        })
      );
  }

  // Ürün durumunu güncelle (Admin için)
  updateProductStatus(id: number, status: string): Observable<Product> {
    return this.http.patch<Product>(`${environment.apiUrl}/admin/products/${id}/status`, { status });
  }

  // Varyant durumunu güncelle
  updateVariantStatus(variantId: number, status: string): Observable<ProductVariant> {
    return this.http.patch<ProductVariant>(`${environment.apiUrl}/products/variants/${variantId}/status`, { status });
  }

  // Sadece ürün stoğunu güncelle
  updateProductStock(productId: number, stock: number): Observable<Product> {
    return this.http.patch<Product>(`${environment.apiUrl}/products/${productId}/stock`, { stock });
  }

  // Varyant güncelle (Satıcı için)
  updateSellerVariant(variantId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    if (!variantId) {
      console.error('Varyant ID bulunamadı');
      return throwError(() => new Error('Varyant ID bulunamadı'));
    }

    // Varyant değerlerini backend'in beklediği formata dönüştür
    interface VariantUpdateRequest extends Partial<ProductVariant> {
      attributeValues?: { attributeId: number, value: string }[];
    }
    
    let requestBody: VariantUpdateRequest = { ...variant };
    if (variant.attributesWithIds && variant.attributesWithIds.length > 0) {
      requestBody.attributeValues = variant.attributesWithIds.map(attr => ({
        attributeId: attr.attribute_id,
        value: attr.value
      }));
    }

    return this.http.put<ProductVariant>(`${environment.apiUrl}/seller/products/variants/${variantId}`, requestBody)
      .pipe(
        catchError(error => {
          console.error(`Varyant ${variantId} güncellenirken hata:`, error);
          return throwError(() => new Error('Varyant güncellenirken bir hata oluştu'));
        })
      );
  }

  // Varyant sil (Satıcı için)
  deleteSellerVariant(variantId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/seller/products/variants/${variantId}`);
  }

  // Varyant durumunu güncelle (Satıcı için)
  updateSellerVariantStatus(variantId: number, status: string): Observable<ProductVariant> {
    console.log(`Varyant durumu güncelleme isteği: ID=${variantId}, status=${status}`);
    // Yanlış olan format 320901 gibi çok büyük ID'ler oluşturuyor
    // Backend'de endpoint /api/seller/products/variants/{variantId}/status şeklinde
    return this.http.patch<ProductVariant>(
      `${environment.apiUrl}/seller/products/variants/${variantId}/status`,
      { status }
    );
  }

  // Ürün durumunu güncelle (Satıcı için)
  updateSellerProductStatus(id: number, status: string): Observable<Product> {
    return this.http.patch<Product>(`${environment.apiUrl}/seller/products/${id}/status`, { status });
  }

  // Mağaza ürünlerini ara (Satıcı için)
  searchSellerStoreProducts(storeId: string, query: string, params?: {
    page?: number;
    size?: number;
    sort?: string;
    category?: string;
    stockFilter?: string;
  }): Observable<{ items: Product[], total: number }> {
    let httpParams = new HttpParams()
      .set('q', query);
    
    // Always include storeId as a parameter to filter by store
    httpParams = httpParams.set('storeId', storeId);
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.stockFilter) httpParams = httpParams.set('stockFilter', params.stockFilter);
    }
    
    console.log('Satıcı mağaza arama isteği gönderiliyor:', {
      url: `${this.apiUrl}/search`,
      params: Object.fromEntries(httpParams.keys().map(key => [key, httpParams.get(key)]))
    });
    
    // Use the standard search endpoint with storeId parameter
    return this.http.get<{ items: Product[], total: number }>(
      `${this.apiUrl}/search`, 
      { params: httpParams }
    ).pipe(
      tap(response => {
        console.log(`Mağaza (ID: ${storeId}) için arama sonuçları:`, response);
        if (response.items && response.items.length) {
          console.log(`${response.items.length} ürün bulundu, toplam: ${response.total}`);
        } else {
          console.log('Arama sonucu bulunamadı');
        }
      }),
      catchError(error => {
        console.error(`Mağaza (ID: ${storeId}) için arama sırasında hata:`, error);
        return throwError(() => new Error('Mağaza ürünleri araması başarısız oldu'));
      })
    );
  }


  //KULLANILIYOR
  // Dosya yükleme (ana ürün resimleri)
  uploadProductImages(productId: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/products/${productId}/images`, formData);
  }


  //KULLANILIYOR
  // Dosya yükleme (varyant resimleri)
  uploadVariantImages(productId: number, variantId: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/products/${productId}/variants/${variantId}/images`, formData);
  }
}
