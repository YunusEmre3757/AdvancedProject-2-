import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Product } from '../../../models/product.interface';
import { Brand } from '../../../models/brand.interface';
import { ProductService } from '../../../services/product.service';
import { BrandService } from '../../../services/brand.service';
import { CartService } from '../../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/Category';
import { Subscription, filter } from 'rxjs';

// Ürün nesnesini genişlet
interface ExtendedProduct extends Product {
  imageFailedToLoad?: boolean;
  currentImageIndex?: number;
  allImageUrls?: string[];
  imageErrors?: boolean[];
  discountPercentage?: number;
  originalPrice?: number;
}

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  standalone: false
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: ExtendedProduct[] = [];
  loading: boolean = false;
  error: string | null = null;
  categoryId: number | string | null = null;
  categorySlug: string | null = null;
  selectedBrandIds: number[] = [];
  selectedBrands: Brand[] = [];
  page = 0;
  size = 12;
  totalItems = 0;
  sortOption: string = 'name,asc';
  searchQuery: string = '';
  availableBrands: Brand[] = [];
  initialLoaded: boolean = false;
  
  // Öne çıkan ürünler için değişken
  isFeatured: boolean = false;
  
  // Fiyat aralığı için değişkenler
  minPrice: number | null = null;
  maxPrice: number | null = null;

  // Subscription to handle router navigation events
  private routerSubscription: Subscription | null = null;

  constructor(
    private productService: ProductService,
    private brandService: BrandService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    // Subscribe to navigation events to handle browser back button
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Check if we're on the products page
      if (this.router.url.includes('/products') && !this.router.url.includes('/products/')) {
        const queryParams = this.route.snapshot.queryParams;
        console.log('Navigation detected to products page, checking query params:', queryParams);
        
        // Update component state from the current URL parameters
        this.updateStateFromQueryParams(queryParams);
      }
    });

    this.route.paramMap.subscribe(params => {
      this.categoryId = params.get('categoryId');
      const brandIdParam = params.get('brandId');
      
      if (brandIdParam) {
        const brandId = parseInt(brandIdParam, 10);
        this.selectedBrandIds = [brandId];
        this.loadBrandDetails(brandId);
      }
      
      // Don't load products yet, wait for queryParams
    });

    this.route.queryParamMap.subscribe(params => {
      const category = params.get('category');
      const newSearchQuery = params.get('search') || '';
      const brandsParam = params.getAll('brands');
      const minPriceParam = params.get('minPrice');
      const maxPriceParam = params.get('maxPrice');
      const featured = params.get('featured') === 'true';
      let shouldLoadProducts = false;
      
      // Store featured status in a class property
      if (featured !== this.isFeatured) {
        console.log(`Öne çıkan ürünler filtresi değişti: ${this.isFeatured} -> ${featured}`);
        this.isFeatured = featured;
        shouldLoadProducts = true;
      }
      
      // Check if search query changed
      if (newSearchQuery !== this.searchQuery) {
        console.log(`Arama sorgusu değişti: "${this.searchQuery}" -> "${newSearchQuery}"`);
        this.searchQuery = newSearchQuery;
        shouldLoadProducts = true;
      }
      
      // Check if price range changed
      const newMinPrice = minPriceParam ? parseFloat(minPriceParam) : null;
      const newMaxPrice = maxPriceParam ? parseFloat(maxPriceParam) : null;
      
      if (newMinPrice !== this.minPrice || newMaxPrice !== this.maxPrice) {
        console.log(`Fiyat aralığı değişti: ${this.minPrice}-${this.maxPrice} -> ${newMinPrice}-${newMaxPrice}`);
        this.minPrice = newMinPrice;
        this.maxPrice = newMaxPrice;
        shouldLoadProducts = true;
      }
      
      if (brandsParam && brandsParam.length > 0) {
        const newBrandIds = brandsParam.map(brandId => parseInt(brandId, 10));
        const brandIdsChanged = this.selectedBrandIds.length !== newBrandIds.length || 
                                !this.selectedBrandIds.every(id => newBrandIds.includes(id));
                                
        if (brandIdsChanged) {
          console.log(`Marka filtreleri değişti: [${this.selectedBrandIds}] -> [${newBrandIds}]`);
          this.selectedBrandIds = newBrandIds;
          this.loadBrandsDetails(newBrandIds);
          shouldLoadProducts = true;
        }
      } else {
        if (this.selectedBrandIds.length > 0) {
          console.log('Marka filtreleri temizlendi');
          this.selectedBrandIds = [];
          this.selectedBrands = [];
          shouldLoadProducts = true;
        }
      }
      
      if (category && category !== this.categorySlug) {
        console.log(`Kategori değişti: ${this.categorySlug} -> ${category}`);
        this.categorySlug = category;
        this.findCategoryIdFromSlug(category);
        shouldLoadProducts = false;
      } else if (!category && this.categorySlug) {
        console.log('Kategori filtresi temizlendi');
        this.categorySlug = null;
        this.categoryId = null;
        shouldLoadProducts = true;
      }
      
      // Only load all products if no filter is applied AND this is the first load
      if (!this.initialLoaded && !this.searchQuery && !this.categoryId && 
          !this.categorySlug && this.selectedBrandIds.length === 0) {
        console.log('İlk yükleme, herhangi bir filtre yok, ürünler yükleniyor');
        shouldLoadProducts = true;
        this.initialLoaded = true;
      }
      
      if (shouldLoadProducts) {
        console.log('Parametreler değişti, ürünler yeniden yükleniyor');
        this.loadProducts();
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Update component state from URL query parameters
  private updateStateFromQueryParams(params: any): void {
    console.log('Updating state from query params:', params);
    
    // Handle featured parameter
    this.isFeatured = params.featured === 'true';
    
    // Handle brands parameter
    if (params.brands) {
      const brandIds = Array.isArray(params.brands) 
        ? params.brands.map((id: string) => parseInt(id, 10))
        : [parseInt(params.brands, 10)];
        
      this.selectedBrandIds = brandIds;
      this.loadBrandsDetails(brandIds);
    } else {
      this.selectedBrandIds = [];
      this.selectedBrands = [];
    }
    
    // Handle price parameters
    this.minPrice = params.minPrice ? parseFloat(params.minPrice) : null;
    this.maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : null;
    
    // Handle search query
    this.searchQuery = params.search || '';
    
    // Handle category
    if (params.category) {
      this.categorySlug = params.category;
      this.findCategoryIdFromSlug(params.category);
    } else {
      this.categorySlug = null;
      this.categoryId = null;
      
      // Kategori ve arama parametresi yoksa ürünleri yükle
      if (!params.search) {
        this.loadProducts();
      } else {
        // Sadece arama parametresi varsa ürünleri yükle
        this.loadProducts();
      }
    }
    
    // Eğer hem kategori hem arama parametresi varsa, findCategoryIdFromSlug metodunun içinde loadProducts() çağrılıyor
  }

  loadBrandsDetails(brandIds: number[]): void {
    this.selectedBrands = [];
    
    brandIds.forEach(brandId => {
      this.brandService.getBrand(brandId).subscribe({
        next: (brand) => {
          this.selectedBrands.push(brand);
        },
        error: (err) => {
          console.error(`Marka ID ${brandId} bilgileri yüklenirken hata:`, err);
        }
      });
    });
  }

  loadBrandDetails(brandId: number): void {
    this.brandService.getBrand(brandId).subscribe({
      next: (brand) => {
        if (!this.selectedBrands.some(b => b.id === brand.id)) {
          this.selectedBrands.push(brand);
        }
      },
      error: (err) => {
        console.error('Marka bilgileri yüklenirken hata:', err);
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.products = [];
    this.error = '';

    // Öne çıkan ürünleri göster
    if (this.isFeatured) {
      console.log('Öne çıkan ürünler yükleniyor');
      this.productService.getFeaturedProducts().subscribe({
        next: (products) => {
          this.products = this.prepareProductsForDisplay(products);
          this.totalItems = products.length;
          this.loading = false;
          this.extractBrandsFromProducts();
        },
        error: (error: Error) => {
          this.error = 'Öne çıkan ürünler yüklenirken bir hata oluştu';
          this.loading = false;
          console.error('Öne çıkan ürünler yüklenirken hata:', error);
        }
      });
      return;
    }

    // Parametreleri hazırla
    const params: any = {
      page: this.page,
      size: this.size
    };
    
    if (this.sortOption) {
      params.sort = this.sortOption;
    }
    
    // Marka ID'leri
    if (this.selectedBrandIds.length > 0) {
      if (this.selectedBrandIds.length === 1) {
        params.brand = this.selectedBrandIds[0].toString();
      } else {
        params.brands = this.selectedBrandIds.join(',');
      }
    }
    
    // Fiyat filtreleri
    if (this.minPrice !== null) {
      params.minPrice = this.minPrice;
    }
    
    if (this.maxPrice !== null) {
      params.maxPrice = this.maxPrice;
    }
    
    // Önce kategori Id veya arama sorgusuna göre ürünleri yükle
    if (this.searchQuery) {
      console.log(`Arama sorgusu "${this.searchQuery}" ile ürünler yükleniyor`);
      
      // Kategori de varsa kategori içinde arama yap
      if (this.categorySlug) {
        console.log(`Kategori slug "${this.categorySlug}" içinde arama yapılıyor: "${this.searchQuery}"`);
        params.category = this.categorySlug;
      }
      
      this.productService.searchProducts(this.searchQuery, params).subscribe({
        next: (response) => {
          this.products = this.prepareProductsForDisplay(response.items);
          this.totalItems = response.total;
          this.loading = false;
          
          this.extractBrandsFromProducts();
        },
        error: (error: Error) => {
          this.error = 'Arama sonuçları yüklenirken bir hata oluştu';
          this.loading = false;
          console.error('Arama sonuçları yüklenirken hata:', error);
        }
      });
    }
    else if (this.categorySlug) {
      if (this.selectedBrandIds.length > 0 || this.minPrice !== null || this.maxPrice !== null) {
        console.log(`Kategori slug "${this.categorySlug}" ve filtreler ile filtreleniyor`);
        
        params.category = this.categorySlug;
        this.productService.getProducts(params).subscribe({
          next: (response) => {
            this.products = this.prepareProductsForDisplay(response.items);
            this.totalItems = response.total;
            this.loading = false;
            
            this.extractBrandsFromProducts();
          },
          error: (error: Error) => {
            this.error = 'Ürünler yüklenirken bir hata oluştu';
            this.loading = false;
            console.error('Filtrelenmiş ürünleri yüklerken hata:', error);
          }
        });
      } else {
        console.log(`Sadece kategori slug "${this.categorySlug}" ile filtreleniyor`);
        this.productService.getProductsByCategory(this.categorySlug).subscribe({
          next: (products) => {
            this.products = this.prepareProductsForDisplay(products);
            this.loading = false;
            this.totalItems = products.length;
            
            this.extractBrandsFromProducts();
          },
          error: (error: Error) => {
            this.error = 'Ürünler yüklenirken bir hata oluştu';
            this.loading = false;
            console.error('Kategori ürünleri yüklenirken hata:', error);
          }
        });
      }
    }
    else if (this.categoryId) {
      // ID varsa, doğrudan kategori getir
      this.productService.getProductsByCategory(this.categoryId).subscribe({
        next: (products) => {
          this.products = this.prepareProductsForDisplay(products);
          this.loading = false;
          this.totalItems = products.length;
          
          this.extractBrandsFromProducts();
        },
        error: (error: Error) => {
          this.error = 'Kategori ürünleri yüklenirken bir hata oluştu';
          this.loading = false;
          console.error('Kategori ürünleri yüklenirken hata:', error);
        }
      });
    }
    else {
      // Genel ürünleri filtrelerle getir (kategori veya arama olmadığında)
      this.productService.getProducts(params).subscribe({
        next: (response) => {
          this.products = this.prepareProductsForDisplay(response.items);
          this.totalItems = response.total;
          this.loading = false;
          
          this.extractBrandsFromProducts();
        },
        error: (error: Error) => {
          this.error = 'Ürünler yüklenirken bir hata oluştu';
          this.loading = false;
          console.error('Ürünler yüklenirken hata:', error);
        }
      });
    }
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
    this.snackBar.open('Ürün sepete eklendi', 'Tamam', {
      duration: 2000,
    });
  }

  handlePageEvent(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.loadProducts();
  }

  sortProducts(sortOption: string): void {
    this.sortOption = sortOption;
    this.loadProducts();
  }
  
  onBrandFilterChange(brandIds: number[]): void {
    console.log(`Marka filtreleri değişti: [${this.selectedBrandIds}] -> [${brandIds}]`);
    this.selectedBrandIds = brandIds;
    this.page = 0;
    
    if (brandIds.length > 0) {
      this.loadBrandsDetails(brandIds);
    } else {
      this.selectedBrands = [];
    }
    
    const queryParams: any = { ...this.route.snapshot.queryParams };
    
    delete queryParams.brands;
    
    if (brandIds.length > 0) {
      queryParams.brands = brandIds.map(id => id.toString());
    }
    
    if (this.categorySlug) {
      queryParams.category = this.categorySlug;
    }
    
    console.log('URL parametreleri güncelleniyor:', queryParams);
    
    this.router.navigate(['/products'], {
      queryParams,
      replaceUrl: true
    }).then(() => {
      console.log('Filtreleme sonrası ürünler yükleniyor...');
      this.loadProducts();
    });
  }

  findCategoryIdFromSlug(slug: string | null): void {
    if (!slug) {
      this.categoryId = null;
      this.loadProducts();
      return;
    }

    this.categoryService.getAllCategories().subscribe({
      next: (categories: Category[]) => {
        let foundCategory: Category | undefined;
        
        // Normalize the incoming slug for better matching
        const normalizedSearchSlug = this.normalizeSlug(slug);
        console.log(`Aranan normalize edilmiş slug: ${normalizedSearchSlug}`);
        
        // Level 1: Direct match or normalized match
        foundCategory = categories.find(c => 
          c.slug === slug || 
          this.normalizeSlug(c.slug) === normalizedSearchSlug
        );
        
        if (!foundCategory) {
          // Level 2: Find in subcategories
          for (const category of categories) {
            if (category.subcategories) {
              const subCategory = category.subcategories.find(sub => 
                sub.slug === slug || 
                this.normalizeSlug(sub.slug) === normalizedSearchSlug
              );
              
              if (subCategory) {
                foundCategory = subCategory;
                break;
              }
              
              // Level 3: Find in sub-subcategories
              for (const subCat of category.subcategories) {
                if (subCat.subcategories) {
                  const subSubCategory = subCat.subcategories.find(subSub => 
                    subSub.slug === slug || 
                    this.normalizeSlug(subSub.slug) === normalizedSearchSlug
                  );
                  
                  if (subSubCategory) {
                    foundCategory = subSubCategory;
                    break;
                  }
                }
              }
              
              if (foundCategory) break;
            }
          }
        }
        
        if (foundCategory && foundCategory.id) {
          console.log(`Kategori slug'ı ${slug} için ID bulundu: ${foundCategory.id}`);
          this.categoryId = foundCategory.id;
          
          console.log(`Kategori ID ${foundCategory.id} için ürünler yükleniyor...`);
          this.loadProducts();
        } else {
          console.error(`Slug değeri ${slug} olan kategori bulunamadı`);
          console.log('Mevcut slug değerleri:', categories.map(c => c.slug).join(', '));
          this.categoryId = null;
          
          // Kategoriyi bulamasak bile slug değerini koru ve yine de yüklemeyi dene
          // Backend tarafında daha gelişmiş slug eşleştirme yapılıyor olabilir
          console.log(`Kategori bulunamadı ama yine de slug ${slug} ile ürünleri yüklemeyi deneyeceğiz`);
          this.loadProducts();
        }
      },
      error: (error: Error) => {
        console.error('Kategoriler yüklenirken hata:', error);
        this.categoryId = null;
        this.loadProducts();
      }
    });
  }

  normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/i̇/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  }

  private extractBrandsFromProducts(): void {
    if (this.products && this.products.length > 0) {
      const brandSet = new Set<number>();
      const brandsMap = new Map<number, Brand>();
      
      this.products.forEach(product => {
        if (product.brand && product.brand.id) {
          brandSet.add(product.brand.id);
          brandsMap.set(product.brand.id, product.brand);
        }
      });
      
      this.availableBrands = Array.from(brandSet).map(id => brandsMap.get(id)!);
      
      // Ürünler var ancak hiçbirinin markası yoksa
      if (this.availableBrands.length === 0 && this.searchQuery) {
        console.log('Ürünler bulundu ancak hiçbir marka bilgisi yok');
      } else {
        console.log('Mevcut sonuçlarda bulunan markalar:', this.availableBrands.map(b => b.name).join(', '));
      }
    } else {
      // Eğer aktif bir arama varsa ve sonuç yoksa, marka listesini boş bırak
      if (this.searchQuery) {
        this.availableBrands = [];
        console.log('Arama sonuçlarında ürün bulunamadı, marka listesi temizlendi');
      }
      // Eğer arama yoksa, marka listesini temizleme (tüm markalar gösterilecek)
      else {
        console.log('Arama yapılmadı, marka listesi değiştirilmedi');
      }
    }
  }

  // Yeni metod: Fiyat filtresini uygula
  applyPriceFilter(minPrice: number | null, maxPrice: number | null): void {
    // Ensure values are non-negative
    minPrice = minPrice !== null && minPrice < 0 ? 0 : minPrice;
    maxPrice = maxPrice !== null && maxPrice < 0 ? 0 : maxPrice;
    
    console.log(`Fiyat filtresi uygulanıyor: ${minPrice} - ${maxPrice}`);
    this.minPrice = minPrice;
    this.maxPrice = maxPrice;
    this.page = 0; // İlk sayfaya dön
    
    // Update query params
    const queryParams: any = { ...this.route.snapshot.queryParams };
    
    // Mevcut minPrice/maxPrice parametrelerini kaldır
    delete queryParams.minPrice;
    delete queryParams.maxPrice;
    
    // Yeni fiyat filtrelerini ekle
    if (minPrice !== null) {
      queryParams.minPrice = minPrice.toString();
    }
    
    if (maxPrice !== null) {
      queryParams.maxPrice = maxPrice.toString();
    }
    
    // Use absolute navigation to ensure consistent behavior
    this.router.navigate(['/products'], {
      queryParams,
      replaceUrl: true
    }).then(() => {
      this.loadProducts();
    });
  }
  
  /**
   * Clear brand filters only
   */
  clearBrandFilters(): void {
    console.log('Marka filtreleri temizleniyor');
    this.selectedBrandIds = [];
    this.selectedBrands = [];
    this.page = 0;
    
    // Keep other filters but remove brand filters
    const queryParams: any = { ...this.route.snapshot.queryParams };
    delete queryParams.brands;
    
    this.router.navigate(['/products'], {
      queryParams,
      replaceUrl: true
    }).then(() => {
      this.loadProducts();
    });
  }

  /**
   * Remove a specific brand from filters
   */
  removeBrand(brandId: number): void {
    console.log(`Marka ID ${brandId} filtreleden kaldırılıyor`);
    this.selectedBrandIds = this.selectedBrandIds.filter(id => id !== brandId);
    this.selectedBrands = this.selectedBrands.filter(brand => brand.id !== brandId);
    this.page = 0;
    
    // Update query params
    const queryParams: any = { ...this.route.snapshot.queryParams };
    
    if (this.selectedBrandIds.length > 0) {
      queryParams.brands = this.selectedBrandIds.map(id => id.toString());
    } else {
      delete queryParams.brands;
    }
    
    this.router.navigate(['/products'], {
      queryParams,
      replaceUrl: true
    }).then(() => {
      this.loadProducts();
    });
  }
  
  // Fiyat filtresini temizle
  clearPriceFilter(): void {
    this.minPrice = null;
    this.maxPrice = null;
    
    // Keep other filters but remove price filters
    const queryParams: any = { ...this.route.snapshot.queryParams };
    delete queryParams.minPrice;
    delete queryParams.maxPrice;
    
    this.router.navigate(['/products'], {
      queryParams,
      replaceUrl: true
    }).then(() => {
      this.loadProducts();
    });
  }
  
  /**
   * Resim URL'sini düzeltir. Backend'den gelen URL'leri uygun formata çevirir.
   */
  adjustImageUrl(url: string | undefined, product?: ExtendedProduct): string | null {
    if (!url) return null;
    
    // Eğer tam URL ise (HTTP ile başlıyorsa)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Backend'den gelen göreceli URL ise (tam URL değilse) http://localhost:8080 ekle
    // Seller Profile sayfasında da kullanılan yöntem
    if (url.startsWith('/')) {
      const fullUrl = 'http://localhost:8080' + url;
      return fullUrl;
    }
    
    // Sadece dosya adı ise (205_1746369039124_gia-oris-LgiAq4E-rHU-unsplash.jpg) ve ürün ID'si varsa
    if (product && product.id) {
      // Dosya adına ürün ID'sini ekleyerek oluştur
      const fullUrl = `http://localhost:8080/api/files/products/${product.id}/${url}`;
      return fullUrl;
    }
    
    // Hiçbir durumla eşleşmedi, varsayılan olarak backend API ile birleştir
    const defaultUrl = `http://localhost:8080/api/files/products/${url}`;
    return defaultUrl;
  }

  /**
   * Prepare products with image carousel support
   */
  private prepareProductsForDisplay(products: Product[]): ExtendedProduct[] {
    return products.map(product => {
      // Set up image URLs for carousel
      let allImageUrls: string[] = [];
      
      // Extract images from product if available
      if ((product as any).getAllImageUrls) {
        allImageUrls = (product as any).getAllImageUrls;
      } else if ((product as any).allImageUrls) {
        allImageUrls = (product as any).allImageUrls;
      } else if (Array.isArray((product as any).images)) {
        // If product has images array, extract URLs
        allImageUrls = (product as any).images.map((img: any) => img.imageUrl || img);
      } else if (product.imageUrl) {
        // If only a single image is available
        allImageUrls = [product.imageUrl];
      }
      
      // Calculate discount percentage if original price exists
      let discountPercentage: number | undefined;
      let originalPrice: number | undefined;
      
      if ((product as any).originalPrice && product.price) {
        // Use a type assertion to tell TypeScript that originalPrice is a number
        const origPrice: number = (product as any).originalPrice;
        originalPrice = origPrice;
        
        // Calculate discount percentage
        if (origPrice > 0) {
          const discount = origPrice - product.price;
          discountPercentage = Math.round((discount / origPrice) * 100);
        }
      }
      
      return {
        ...product,
        imageUrl: product.imageUrl || product.image || '',
        imageFailedToLoad: false,
        currentImageIndex: 0,
        allImageUrls: allImageUrls.length ? allImageUrls : [product.imageUrl || ''],
        imageErrors: allImageUrls.length ? Array(allImageUrls.length).fill(false) : [false],
        discountPercentage,
        originalPrice
      };
    });
  }

  /**
   * Navigate to previous image in the product carousel
   */
  prevImage(product: ExtendedProduct): void {
    if (!product.allImageUrls || product.allImageUrls.length <= 1) return;
    
    const currentIndex = product.currentImageIndex || 0;
    product.currentImageIndex = (currentIndex - 1 + product.allImageUrls.length) % product.allImageUrls.length;
  }
  
  /**
   * Navigate to next image in the product carousel
   */
  nextImage(product: ExtendedProduct): void {
    if (!product.allImageUrls || product.allImageUrls.length <= 1) return;
    
    const currentIndex = product.currentImageIndex || 0;
    product.currentImageIndex = (currentIndex + 1) % product.allImageUrls.length;
  }
  
  /**
   * Set a specific image as active in the carousel
   */
  setActiveImage(product: ExtendedProduct, index: number): void {
    if (!product.allImageUrls || index >= product.allImageUrls.length) return;
    
    product.currentImageIndex = index;
  }
  
  /**
   * Handle image loading error
   */
  handleImageError(product: ExtendedProduct, imageIndex: number): void {
    if (!product.imageErrors) {
      product.imageErrors = Array(product.allImageUrls?.length || 0).fill(false);
    }
    
    // Mark this image as failed
    product.imageErrors[imageIndex] = true;
    
    // If all images failed, mark the product as having failed images
    if (product.imageErrors.every(error => error)) {
      product.imageFailedToLoad = true;
    }
  }

  /**
   * Clear all active filters (brands and price)
   */
  clearAllFilters(): void {
    console.log('Tüm filtreler temizleniyor');
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedBrandIds = [];
    this.selectedBrands = [];
    this.page = 0;
    
    // Remove all query parameters and replace the URL
    this.router.navigate(['/products'], {
      replaceUrl: true
    }).then(() => {
      this.loadProducts();
    });
  }
} 
