import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
  
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { Product } from '../../models/product.interface';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Category } from '../../models/Category';


interface Slide {
  image: string;
  title: string;
  description: string;
  link: string;
}

// ExtendedProduct interface for the image failed to load functionality
interface ExtendedProduct extends Product {
  imageFailedToLoad?: boolean;
  currentImageIndex?: number;
  allImageUrls?: string[];
  imageErrors?: boolean[];
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  categories: Category[] = [];
  featuredProducts: ExtendedProduct[] = [];
  newArrivals: ExtendedProduct[] = [];
  bestSellers: ExtendedProduct[] = [];
  products: ExtendedProduct[] = [];
  isLoading = false;
  error: string | null = null;
  email: string = '';
  newsletterForm: FormGroup;

  // Slider properties
  slides: Slide[] = [
    {
      image: 'assets/images/real-estate-9053405_1280.jpg', 
      title: 'Modern Yaşam Alanları',
      description: 'Evinizi yeniden tasarlayın ve modern bir yaşam alanına dönüştürün.',
      link: '/products?category=ev-yasam'
    },
    {
      image: 'assets/images/smartphone-407108_1280.jpg',
      title: 'Teknoloji Ürünleri',
      description: 'En son teknoloji ürünleriyle hayatınızı kolaylaştırın.',
      link: '/products?category=elektronik'
    },
    {
      image: 'assets/images/people-2572972_1280.jpg',
      title: 'Stil Sahibi Tasarımlar',
      description: 'Tarzınızı yansıtan özel koleksiyonlarımızı keşfedin.',
      link: '/products?category=giyim'
    },
    {
      image: 'assets/images/dwayne-joe-Svw-WyiZUa4-unsplash.jpg',
      title: 'Özel Tasarımlar',
      description: 'Size özel tasarlanmış benzersiz koleksiyonlar.',
      link: '/products?featured=true'
    }
  ];
  currentSlide = 0;
  slideInterval: any;
  readonly SLIDE_DURATION = 5000; // 5 seconds

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadFeaturedProducts();
    this.loadNewArrivals();
    this.loadBestSellers();
    this.startSlideShow();
  }

  ngOnDestroy(): void {
    this.stopSlideShow();
  }

  // Slider methods
  startSlideShow(): void {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, this.SLIDE_DURATION);
  }

  stopSlideShow(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.resetSlideShow();
  }

  previousSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.resetSlideShow();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.resetSlideShow();
  }

  resetSlideShow(): void {
    this.stopSlideShow();
    this.startSlideShow();
  }

  // Slide link'i için route ve query parametrelerini ayırır
  getSlideRoute(linkUrl: string): string {
    // URL'den path kısmını alır, soru işaretinden önceki kısım
    const path = linkUrl.split('?')[0];
    return path;
  }
  
  getSlideQueryParams(linkUrl: string): any {
    // URL'den query parametrelerini alır ve objeye dönüştürür
    const queryString = linkUrl.split('?')[1];
    if (!queryString) return {};
    
    const params: any = {};
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      params[key] = value;
    });
    
    return params;
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAllCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories
          .filter(category => category.slug)
          .map(category => ({
            ...category,
            description: this.getCategoryDescription(category.name)
          }));
        
        console.log('Ana sayfada gösterilen kategoriler:', this.categories);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading categories:', error);
        this.error = 'Kategoriler yüklenirken bir hata oluştu';
        this.isLoading = false;
      }
    });
  }

  private getCategoryDescription(categoryName: string): string {
    const descriptions: { [key: string]: string } = {
      'Kadın': 'Modern ve şık kadın giyim koleksiyonu',
      'Erkek': 'Trend erkek giyim koleksiyonu',
      'Çocuk': 'Rahat ve eğlenceli çocuk giyim koleksiyonu',
      'Aksesuar': 'Tarzınızı tamamlayan aksesuarlar',
      'Ayakkabı': 'Her tarza uygun ayakkabı modelleri'
    };
    return descriptions[categoryName] || 'Özel seçilmiş koleksiyon';
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (response) => {
        this.products = response.items.map(item => ({
          ...item,
          imageUrl: item.imageUrl || item.image || '',
          category: item.category || (item.categoryId ? item.categoryId.toString() : ''),
          reviewCount: item.reviewCount || 0,
          imageFailedToLoad: false
        }));
      },
      error: (error: Error) => {
        console.error('Ürünler yüklenirken hata oluştu:', error);
        this.snackBar.open('Ürünler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  loadFeaturedProducts(): void {
    this.isLoading = true;
    this.productService.getFeaturedProducts()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (products) => {
          this.featuredProducts = products.map(product => ({
            ...product,
            imageUrl: product.imageUrl || product.image || '',
            category: product.category || (product.categoryId ? product.categoryId.toString() : ''),
            reviewCount: product.reviewCount || 0,
            imageFailedToLoad: false
          }));
        },
        error: (error: Error) => {
          console.error('Ürünler yüklenirken hata oluştu:', error);
          this.error = 'Ürünler yüklenirken bir hata oluştu';
          this.snackBar.open(this.error, 'Tamam', {
            duration: 3000
          });
        }
      });
  }

  loadNewArrivals(): void {
    this.productService.getNewArrivals().subscribe({
      next: (products) => {
        this.newArrivals = products.map(product => {
          // Ürünün tüm resim URL'lerini al - getAllImageUrls backend metodundan veya geleneksel image alanından
          let allImageUrls: string[] = [];
          
          // Eğer ürünün getAllImageUrls metodu veya allImageUrls property'si varsa onu kullan
          if ((product as any).getAllImageUrls) {
            allImageUrls = (product as any).getAllImageUrls;
          } else if ((product as any).allImageUrls) {
            allImageUrls = (product as any).allImageUrls;
          } else if (Array.isArray((product as any).images)) {
            // Veya images dizisi varsa ondan URL'leri çıkart
            allImageUrls = (product as any).images.map((img: any) => img.imageUrl || img);
          } else {
            // Tek bir resim varsa onu kullan
            const singleImage = product.imageUrl || product.image || '';
            if (singleImage) {
              allImageUrls = [singleImage];
            }
          }
          
          return {
            ...product,
            imageUrl: product.imageUrl || product.image || '',
            category: product.category || (product.categoryId ? product.categoryId.toString() : ''),
            reviewCount: product.reviewCount || 0,
            imageFailedToLoad: false,
            currentImageIndex: 0,
            allImageUrls: allImageUrls,
            imageErrors: allImageUrls.map(() => false)
          };
        });
        
        console.log('New arrivals with images:', this.newArrivals);
      },
      error: (error: Error) => {
        console.error('Yeni ürünler yüklenirken hata oluştu:', error);
      }
    });
  }

  loadBestSellers(): void {
    this.productService.getBestSellers().subscribe({
      next: (products) => {
        this.bestSellers = products.map(product => ({
          ...product,
          imageUrl: product.imageUrl || product.image || '',
          category: product.category || (product.categoryId ? product.categoryId.toString() : ''),
          reviewCount: product.reviewCount || 0,
          imageFailedToLoad: false
        }));
      },
      error: (error: Error) => {
        console.error('En çok satanlar yüklenirken hata oluştu:', error);
      }
    });
  }

  // No longer used - kept for reference
  private addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
    this.snackBar.open('Ürün sepete eklendi', 'Tamam', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  subscribeNewsletter(): void {
    if (this.newsletterForm.valid) {
      this.isLoading = true;
      // TODO: Implement newsletter subscription
      console.log('Newsletter subscription for:', this.newsletterForm.value.email);
      
      // Simulate API call
      setTimeout(() => {
        this.snackBar.open('Bülten aboneliğiniz başarıyla gerçekleşti!', 'Tamam', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.newsletterForm.reset();
        this.isLoading = false;
      }, 1000);
    } else {
      this.newsletterForm.markAllAsTouched();
    }
  }

  /**
   * Resim URL'sini düzeltir. Backend'den gelen URL'leri uygun formata çevirir.
   */
  adjustImageUrl(url: string | undefined, product?: ExtendedProduct): string | null {
    if (!url) return null;
    
    // Sadece debug durumunda loglamak için konsol çıktısını kaldırıyoruz
    
    // Eğer tam URL ise (HTTP ile başlıyorsa) doğrudan kullan
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Backend'den gelen göreceli URL ise (/ ile başlıyorsa) http://localhost:8080 ekle
    if (url.startsWith('/')) {
      const fullUrl = 'http://localhost:8080' + url;
      return fullUrl;
    }
    
    // Eğer api/files ile başlıyorsa, host ekle
    if (url.startsWith('api/files/')) {
      const fullUrl = 'http://localhost:8080/' + url;
      return fullUrl;
    }
    
    // ÖNEMLİ: Backend FileController dosyaları /api/files/products/{productId}/{fileName} 
    // yapısını kullanarak serve ediyor, ama dosyalar uploads/ klasöründe saklanıyor
    if (product && product.id) {
      // Ürün ID'si varsa, doğru API endpoint'i kullan
      const fullUrl = `http://localhost:8080/api/files/products/${product.id}/${url}`;
      return fullUrl;
    }
    
    // Eğer sadece dosya adı ise ve herhangi bir ürün ID'si yoksa
    if (url.includes('.')) {
      // Muhtemelen bu bir ürün ID'si olmadan gelen resim, backend tarafından nasıl servis edildiğini kontrol et
      return `http://localhost:8080/products/${url}`;
    }
    
    // Hiçbir koşula uymuyorsa yedek görsel döndür
    return 'assets/images/no-image.jpg';
  }

  /**
   * Bir ürün için önceki resmi göster
   */
  prevImage(product: ExtendedProduct): void {
    if (!product.allImageUrls || product.allImageUrls.length <= 1) return;
    
    const currentIndex = product.currentImageIndex || 0;
    product.currentImageIndex = (currentIndex - 1 + product.allImageUrls.length) % product.allImageUrls.length;
  }
  
  /**
   * Bir ürün için sonraki resmi göster
   */
  nextImage(product: ExtendedProduct): void {
    if (!product.allImageUrls || product.allImageUrls.length <= 1) return;
    
    const currentIndex = product.currentImageIndex || 0;
    product.currentImageIndex = (currentIndex + 1) % product.allImageUrls.length;
  }
  
  /**
   * Belirli bir resmi aktif yap
   */
  setActiveImage(product: ExtendedProduct, index: number): void {
    if (!product.allImageUrls || index >= product.allImageUrls.length) return;
    
    product.currentImageIndex = index;
  }
  
  /**
   * Resim yükleme hatası
   */
  handleImageError(product: ExtendedProduct, imageIndex: number): void {
    if (!product.imageErrors) {
      product.imageErrors = Array(product.allImageUrls?.length || 0).fill(false);
    }
    
    // Bu resmi hatalı olarak işaretle
    product.imageErrors[imageIndex] = true;
    
    // Eğer tüm resimler hatalıysa, imageFailedToLoad'u true yap
    if (product.imageErrors.every(error => error)) {
      product.imageFailedToLoad = true;
    }
  }
}
