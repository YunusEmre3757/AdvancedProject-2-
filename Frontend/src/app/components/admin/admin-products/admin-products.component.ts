import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { Product, ProductType, ProductVariant } from '../../../models/product.interface';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/Category';
import { BrandService } from '../../../services/brand.service';
import { Brand } from '../../../models/brand.interface';

// Extend the Product interface to include a showVariants property
interface ExtendedProduct extends Product {
  showVariants?: boolean;
}

@Component({
  selector: 'app-admin-products',
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css'],
  standalone: false
})
export class AdminProductsComponent implements OnInit {
  products: ExtendedProduct[] = [];
  loading = true;
  error: string | null = null;
  page = 0;
  size = 10;
  totalProducts = 0;
  searchQuery = '';
  
  // Matematik hesaplamaları için Math nesnesini ekle
  Math = Math;
  
  // Ürün detayları için
  selectedProduct: ExtendedProduct | null = null;
  showProductDetailsModal = false;
  productDetailsLoading = false;
  
  // Ürün durumu güncelleme için
  statusUpdateProcessing = false;
  statusUpdateSuccess = false;
  statusUpdateMessage = '';
  
  // Ürün ekleme/düzenleme için
  productToEdit: Partial<ExtendedProduct> = this.getEmptyProduct();
  showProductEditModal = false;
  isNewProduct = true;
  editModalTitle = 'Yeni Ürün Ekle';
  
  // Filtreler
  categoryFilter: string = '';
  minPriceFilter: number | null = null;
  maxPriceFilter: number | null = null;
  stockFilter: string = 'all'; // all, instock, outofstock
  
  // Kategori listesi
  categories: Category[] = [];
  categoryHierarchy: any[] = [];
  
  // Marka listesi
  brands: Brand[] = [];
  
  productTypes = Object.values(ProductType);
  
  // Varyant düzenleme değişkenleri
  variantToEdit: Partial<ProductVariant> = {};
  showVariantEditModal = false;
  editVariantTitle = '';
  currentProductId = 0;
  
  // Varyant özellikleri için yeni değişkenler
  showAddAttributeForm = false;
  newAttributeKey = '';
  newAttributeValue = '';
  
  // Renk paleti ve beden seçicisi için veriler
  availableColors = [
    { name: 'Siyah', code: '#000000' },
    { name: 'Beyaz', code: '#FFFFFF' },
    { name: 'Kırmızı', code: '#FF0000' },
    { name: 'Yeşil', code: '#008000' },
    { name: 'Mavi', code: '#0000FF' },
    { name: 'Sarı', code: '#FFFF00' },
    { name: 'Mor', code: '#800080' },
    { name: 'Turuncu', code: '#FFA500' },
    { name: 'Pembe', code: '#FFC0CB' },
    { name: 'Gri', code: '#808080' },
    { name: 'Kahverengi', code: '#A52A2A' },
    { name: 'Lacivert', code: '#000080' },
    { name: 'Bej', code: '#F5F5DC' },
    { name: 'Turkuaz', code: '#40E0D0' },
    { name: 'Bordo', code: '#800000' }
  ];
  
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private brandService: BrandService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadBrands();
    this.loadProducts();
  }
  
  // Tüm kategorileri yükle
  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Kategoriler yüklendi:', this.categories);
      },
      error: (err) => {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
        this.showErrorMessage('Kategoriler yüklenirken bir hata oluştu');
      }
    });
    
    // Ayrıca kategori hiyerarşisini de yükle
    this.categoryService.getCategoryHierarchy().subscribe({
      next: (hierarchy) => {
        this.categoryHierarchy = hierarchy;
        console.log('Kategori hiyerarşisi yüklendi:', this.categoryHierarchy);
      },
      error: (err) => {
        console.error('Kategori hiyerarşisi yüklenirken hata oluştu:', err);
      }
    });
  }
  
  // Tüm markaları yükle
  loadBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (response: { items: Brand[], total: number }) => {
        this.brands = response.items;
        console.log('Markalar yüklendi:', this.brands);
      },
      error: (err: any) => {
        console.error('Markalar yüklenirken hata oluştu:', err);
        this.showErrorMessage('Markalar yüklenirken bir hata oluştu');
      }
    });
  }
  
  loadProducts(): void {
    this.loading = true;
    
    // Create parameters object that includes filters
    const params: any = {
      page: this.page,
      size: this.size
    };
    
    // Add category filter if selected
    if (this.categoryFilter) {
      // Kategori filtresi varsa, ID'yi sayıya çevirerek gönder
      params.category = this.categoryFilter.toString();
    }
    
    // Add price range filters if set
    if (this.minPriceFilter !== null) {
      params.minPrice = this.minPriceFilter;
    }
    
    if (this.maxPriceFilter !== null) {
      params.maxPrice = this.maxPriceFilter;
    }
    
    // Add stock filter
    if (this.stockFilter !== 'all') {
      params.stockFilter = this.stockFilter;
    }
    
    this.productService.getAdminProducts(params).subscribe({
      next: (response) => {
        this.products = response.items;
        this.totalProducts = response.total;
        
        // Her ürün için varyantları yükle ve stok bilgilerini güncelle
        this.products.forEach(product => {
          if (product.variants && product.variants.length > 0) {
            // Varyantları varsa stoğu hesapla
            const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
            product.stock = totalStock;
            product.totalStock = totalStock;
          }
        });
        
        this.loading = false;
        console.log('Ürün listesi yüklendi:', this.products);
      },
      error: (err) => {
        console.error('Ürünler yüklenirken hata oluştu:', err);
        this.error = 'Ürün listesi yüklenirken bir hata oluştu.';
        this.loading = false;
        this.showErrorMessage('Ürünler yüklenirken bir hata oluştu');
      }
    });
  }
  
  searchProducts(): void {
    if (!this.searchQuery.trim()) {
      this.loadProducts();
      return;
    }

    this.loading = true;
    
    // Create parameters object that includes filters
    const params: any = {
      page: this.page,
      size: this.size
    };
    
    // Add category filter if selected
    if (this.categoryFilter) {
      // Kategori filtresi varsa, ID'yi sayıya çevirerek gönder
      params.category = this.categoryFilter.toString();
    }
    
    // Add price range filters if set
    if (this.minPriceFilter !== null) {
      params.minPrice = this.minPriceFilter;
    }
    
    if (this.maxPriceFilter !== null) {
      params.maxPrice = this.maxPriceFilter;
    }
    
    // Add stock filter
    if (this.stockFilter !== 'all') {
      params.stockFilter = this.stockFilter;
    }
    
    this.productService.searchProducts(this.searchQuery, params).subscribe({
      next: (response) => {
        this.products = response.items;
        this.totalProducts = response.total;
        this.loading = false;
        
        if (this.products.length === 0) {
          this.showInfoMessage('Arama sonucunda ürün bulunamadı');
        }
      },
      error: (err) => {
        console.error('Ürün aramasında hata oluştu:', err);
        this.error = 'Ürün araması yapılırken bir hata oluştu.';
        this.loading = false;
        this.showErrorMessage('Ürün aramasında bir hata oluştu');
      }
    });
  }
  
  onPageChange(event: number): void {
    this.page = event;
    if (this.searchQuery.trim()) {
      this.searchProducts();
    } else {
      this.loadProducts();
    }
  }
  
  // Dönüş tipini açıkça belirt ve any[] olarak değiştir
  getPageNumbers(): any[] {
    const totalPages = Math.ceil(this.totalProducts / this.size);
    let pages: any[] = [];
    
    // Sayfa sayısı 5 veya daha az ise, tüm sayfaları göster
    if (totalPages <= 5) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sayfa sayısı 5'ten fazlaysa, sayfalama mantığı uygula
      if (this.page < 2) {
        // İlk 3 sayfa
        pages = [0, 1, 2, '...', totalPages - 1];
      } else if (this.page > totalPages - 3) {
        // Son 3 sayfa
        pages = [0, '...', totalPages - 3, totalPages - 2, totalPages - 1];
      } else {
        // Orta sayfalar
        pages = [0, '...', this.page - 1, this.page, this.page + 1, '...', totalPages - 1];
      }
    }
    
    return pages;
  }
  
  // Sayfa numarası kontrol fonksiyonu
  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
  
  // Son sayfa numarasını hesaplama
  getLastPageIndex(): number {
    return Math.ceil(this.totalProducts / this.size) - 1;
  }
  
  // Ürün ekleme modalını aç
  openAddProductModal(): void {
    this.productToEdit = this.getEmptyProduct();
    this.isNewProduct = true;
    this.editModalTitle = 'Yeni Ürün Ekle';
    this.showProductEditModal = true;
  }
  
  // Ürün düzenleme modalını aç
  openEditProductModal(product: ExtendedProduct): void {
    // Derin kopyalama yapalım ki orijinal ürünü etkilemesin
    this.productToEdit = {...JSON.parse(JSON.stringify(product))};
    
    // Eğer category bir obje ise, categoryId değerini alıp koyalım
    if (product.category && typeof product.category === 'object' && product.category.id) {
      this.productToEdit.categoryId = product.category.id;
    } else if (typeof product.category === 'string') {
      // Kategori adıyla eşleşen kategoriyi bul
      const matchingCategory = this.categories.find(c => c.name.toLowerCase() === product.category.toString().toLowerCase());
      if (matchingCategory) {
        this.productToEdit.categoryId = matchingCategory.id;
      }
    }
    
    // Eğer brand bir obje ise, brandId değerini alıp koyalım
    if (product.brand && typeof product.brand === 'object' && product.brand.id) {
      // Bu bir referans olduğundan objede kalmalı, böylece seçicide görünür
      this.productToEdit.brand = product.brand;
    }
    
    this.isNewProduct = false;
    this.editModalTitle = 'Ürün Düzenle: ' + product.name;
    this.showProductEditModal = true;
  }
  
  // Ürün ekleme/düzenleme modalını kapat
  closeProductEditModal(): void {
    this.showProductEditModal = false;
  }
  
  // Yeni ürün ekle veya mevcut ürünü güncelle
  saveProduct(): void {
    // Kategori ID'sini kategori nesnesine dönüştür
    if (this.productToEdit.categoryId) {
      const categoryId = this.productToEdit.categoryId;
      const selectedCategory = this.categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        this.productToEdit.category = selectedCategory as any;
      }
    }
    
    if (this.isNewProduct) {
      this.productService.addProduct(this.productToEdit as Omit<ExtendedProduct, 'id'>).subscribe({
        next: (product) => {
          this.showSuccessMessage('Ürün başarıyla eklendi');
          this.closeProductEditModal();
          this.loadProducts();
        },
        error: (err) => {
          console.error('Ürün eklenirken hata oluştu:', err);
          this.showErrorMessage('Ürün eklenirken bir hata oluştu: ' + 
            (err.error?.message || err.message || 'Bilinmeyen hata'));
        }
      });
    } else {
      this.productService.updateProduct(this.productToEdit.id!, this.productToEdit).subscribe({
        next: (product) => {
          this.showSuccessMessage('Ürün başarıyla güncellendi');
          this.closeProductEditModal();
          // Listede ürünü güncelle
          const index = this.products.findIndex(p => p.id === product.id);
          if (index !== -1) {
            this.products[index] = product;
          }
        },
        error: (err) => {
          console.error('Ürün güncellenirken hata oluştu:', err);
          this.showErrorMessage('Ürün güncellenirken bir hata oluştu: ' + 
            (err.error?.message || err.message || 'Bilinmeyen hata'));
        }
      });
    }
  }
  
  // Ürün silme işlemi
  deleteProduct(productId: number): void {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.showSuccessMessage('Ürün başarıyla silindi');
        // Listeden ürünü kaldır
        this.products = this.products.filter(p => p.id !== productId);
        this.totalProducts--; // Toplam sayıyı güncelle
      },
      error: (err) => {
        console.error('Ürün silinirken hata oluştu:', err);
        this.showErrorMessage('Ürün silinirken bir hata oluştu: ' + 
          (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }
  
  // Ürün durum güncelleme (aktif/pasif)
  toggleProductStatus(product: ExtendedProduct): void {
    const currentStatus = product.status || (product.isActive ? 'active' : 'inactive');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    this.statusUpdateProcessing = true;
    
    this.productService.updateProductStatus(product.id, newStatus).subscribe({
      next: (updatedProduct) => {
        product.status = updatedProduct.status;
        product.isActive = updatedProduct.status === 'active';
        
        // Eğer ürünün varyantları yüklenmişse, varyantların durumlarını da güncelle
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(variant => {
            // UI'da varyant durumlarını güncelle (Backend'de zaten güncelleniyor olmalı)
            variant.status = newStatus;
            variant.active = newStatus === 'active';
          });
          
          // Seçili ürün detaylarında da varyantları güncelle
          if (this.selectedProduct && this.selectedProduct.id === product.id && this.selectedProduct.variants) {
            this.selectedProduct.variants.forEach(variant => {
              variant.status = newStatus;
              variant.active = newStatus === 'active';
            });
          }
        }
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Ürün durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`;
        
        setTimeout(() => {
          this.statusUpdateSuccess = false;
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Ürün durumu güncellenirken hata oluştu:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Ürün durumu güncellenirken bir hata oluştu';
        this.showErrorMessage('Ürün durumu güncellenirken bir hata oluştu');
      }
    });
  }
  
  // Ürün detaylarını görüntüle
  viewProductDetails(productId: number): void {
    this.productDetailsLoading = true;
    this.selectedProduct = null;
    
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.selectedProduct = product;
        this.productDetailsLoading = false;
        this.showProductDetailsModal = true;
      },
      error: (err) => {
        console.error('Ürün detayları alınırken hata oluştu:', err);
        this.productDetailsLoading = false;
        this.showErrorMessage('Ürün detayları alınırken bir hata oluştu');
      }
    });
  }
  
  // Ürün detay modalını kapat
  closeProductDetailsModal(): void {
    this.showProductDetailsModal = false;
  }
  
  // Boş ürün objesi oluşturma (form için)
  private getEmptyProduct(): Partial<ExtendedProduct> {
    return {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      categoryId: undefined,
      brand: undefined,
      stock: 0,
      rating: 0,
      reviews: 0,
      reviewCount: 0,
      featured: false,
      isActive: true,
      discount: 0,
      slug: '',
      specifications: {}
    };
  }
  
  // Bildirim gösterme fonksiyonları
  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  showInfoMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000
    });
  }
  
  // İndirimli fiyatı hesapla
  calculateDiscountedPrice(price: number, discount: number | undefined): number {
    if (!discount) return price;
    return price - (price * discount / 100);
  }
  
  // Kategori slug'ını formatlama
  formatCategoryName(category: string | any): string {
    if (!category) return 'Kategorisiz';
    
    if (typeof category === 'string') {
      return category;
    }
    
    if (typeof category === 'object' && category.name) {
      return category.name;
    }
    
    // Kategori ID'sine göre isim bul
    if (typeof category === 'object' && category.id) {
      const foundCategory = this.categories.find(c => c.id === category.id);
      if (foundCategory) {
        return foundCategory.name;
      }
    }
    
    return 'Kategorisiz';
  }
  
  // Fiyat formatı
  formatPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  }
  
  // Ürünü ön görünüm sayfasında aç
  previewProduct(product: ExtendedProduct): void {
    window.open(`http://localhost:4200/products/${product.id}`, '_blank');
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  // Reset filters to default values
  clearFilters(): void {
    this.categoryFilter = '';
    this.minPriceFilter = null;
    this.maxPriceFilter = null;
    this.stockFilter = 'all';
    this.loadProducts();
  }

  // Kategori IDsinden kategori adını bul
  getCategoryNameById(categoryId: number): string {
    if (!categoryId || !this.categories.length) return 'Kategorisiz';
    
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Kategorisiz';
  }

  // Ürün varyantlarını göster/gizle
  toggleVariants(product: ExtendedProduct): void {
    product.showVariants = !product.showVariants;
    
    // Eğer varyantlar gösterilecekse ve daha önce yüklenmemişse, yükle
    if (product.showVariants && (!product.variants || product.variants.length === 0)) {
      this.loadProductVariants(product.id);
    }
  }
  
  // Ürün varyantlarını yükle
  loadProductVariants(productId: number): void {
    // Ürünü listede bul
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    
    // Eğer üründe zaten varyantlar yüklüyse, tekrar yükleme
    if (product.variants && product.variants.length > 0) return;
    
    // Admin için özel varyant API'sini kullan
    this.productService.getAdminProductVariants(productId).subscribe({
      next: (variants) => {
        // Ürünün varyantlarını güncelle
        product.variants = variants;
      },
      error: (err) => {
        console.error('Ürün varyantları yüklenirken hata oluştu:', err);
        this.showErrorMessage('Varyantlar yüklenirken bir hata oluştu');
        // Hata durumunda varyant bölümünü gizle
        product.showVariants = false;
      }
    });
  }

  // Varyant özelliklerini formatlama
  formatVariantAttributes(attributes: { [key: string]: string } | undefined): string {
    if (!attributes || Object.keys(attributes).length === 0) {
      return 'Özellik yok';
    }

    // Özellik anahtarlarını düzgün formatlama
    const formattedAttributes = Object.entries(attributes).map(([key, value]) => {
      // Anahtar formatlamaları - camelCase ve underscore formatlarını daha okunabilir hale getir
      let formattedKey = key
        .replace(/([A-Z])/g, ' $1') // camelCase'i boşluklarla ayır
        .replace(/_/g, ' ')         // alt çizgileri boşluklara dönüştür
        .trim();
      
      // İlk harfi büyük yap
      formattedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
      
      return `${formattedKey}: ${value}`;
    });

    return formattedAttributes.join(', ');
  }

  // Varyant durum değiştirme (aktif/pasif)
  toggleVariantStatus(variant: any, productId: number): void {
    const currentStatus = variant.status || (variant.active ? 'active' : 'inactive');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    this.statusUpdateProcessing = true;
    
    this.productService.updateVariantStatus(variant.id, newStatus).subscribe({
      next: (updatedVariant: ProductVariant) => {
        // Güncellenen varyantı mevcut varyant listesiyle eşleştir
        variant.status = updatedVariant.status;
        variant.active = updatedVariant.status === 'active';
        
        // Ürün listesindeki ilgili ürünü bul
        const product = this.products.find(p => p.id === productId);
        if (product) {
          // Ürünün toplam stoğunu hesapla
          this.updateProductTotalStock(product);
        }
        
        // Seçili ürünün toplam stoğunu güncelle (detay modalı açıksa)
        if (this.selectedProduct && this.selectedProduct.id === productId) {
          this.updateProductTotalStock(this.selectedProduct);
        }
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Varyant durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`;
        
        setTimeout(() => {
          this.statusUpdateSuccess = false;
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err: any) => {
        console.error('Varyant durumu güncellenirken hata oluştu:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.showErrorMessage('Varyant durumu güncellenirken bir hata oluştu');
      }
    });
  }
  
  // Varyant silme
  deleteVariant(variantId: number, productId: number): void {
    if (!confirm('Bu varyantı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    this.productService.deleteVariant(variantId).subscribe({
      next: () => {
        this.showSuccessMessage('Varyant başarıyla silindi');
        
        // Ürün listesindeki varyantı güncelle
        const product = this.products.find(p => p.id === productId);
        if (product && product.variants) {
          product.variants = product.variants.filter(v => v.id !== variantId);
          
          // Ürün varyantı silindiğinde toplam stoğu güncelle
          this.updateProductTotalStock(product);
        }
        
        // Seçili ürünün varyantını da güncelle (detay modalı açıksa)
        if (this.selectedProduct && this.selectedProduct.variants) {
          this.selectedProduct.variants = this.selectedProduct.variants.filter(v => v.id !== variantId);
          
          // Seçili ürünün varyantı silindiğinde toplam stoğu güncelle
          this.updateProductTotalStock(this.selectedProduct);
        }
      },
      error: (err) => {
        console.error('Varyant silinirken hata oluştu:', err);
        this.showErrorMessage('Varyant silinirken bir hata oluştu');
      }
    });
  }
  
  // Varyantı düzenleme modalını aç
  editVariant(variant: ProductVariant, productId: number): void {
    // Derin kopyalama yapalım ki orijinal varyantı etkilemesin
    this.variantToEdit = { ...JSON.parse(JSON.stringify(variant)) };
    this.currentProductId = productId;
    this.editVariantTitle = `Varyant Düzenle: ${variant.sku}`;
    this.showVariantEditModal = true;
  }
  
  // Varyant düzenleme modalını kapat
  closeVariantEditModal(): void {
    this.showVariantEditModal = false;
  }
  
  // Varyant güncelleme işlemi
  saveVariant(): void {
    if (!this.variantToEdit.id) {
      this.showErrorMessage('Varyant ID bulunamadı');
      return;
    }
    
    console.log('Varyant güncelleme öncesi tam varyant bilgisi:', this.variantToEdit);
    
    // Varyant nesnesini hazırla
    const updatedVariant: Partial<ProductVariant> = {
      id: this.variantToEdit.id,
      productId: this.variantToEdit.productId,
      sku: this.variantToEdit.sku,
      price: this.variantToEdit.price || 0,
      salePrice: this.variantToEdit.salePrice,
      stock: this.variantToEdit.stock,
      status: this.variantToEdit.status || 'active',
      active: this.variantToEdit.status === 'active',
      imageUrls: this.variantToEdit.imageUrls,
      attributes: {} // Bu alanı boş başlatıyoruz
    };
    
    // Özellikleri varsa, tam olarak kopyala
    if (this.variantToEdit.attributes) {
      // Tüm özellikleri doğrudan kopyala
      updatedVariant.attributes = { ...this.variantToEdit.attributes };
      console.log('Varyant özellikleri:', updatedVariant.attributes);
      
      // Özellikler için attribute_id bilgisini ekle
      updatedVariant.attributesWithIds = [];
      
      for (const key in this.variantToEdit.attributes) {
        if (this.variantToEdit.attributes.hasOwnProperty(key)) {
          const value = this.variantToEdit.attributes[key];
          
          // Özellik adına göre attribute_id'yi bulmak için
          // Mevcut attributes veri yapısında key'e karşılık gelen attribute_id'yi buluyoruz
          const attributeId = this.findAttributeIdForKey(key);
          
          updatedVariant.attributesWithIds.push({
            attribute_id: attributeId || 1, // Eğer ID bulunamazsa 1 kullan
            key: key,
            value: value
          });
        }
      }
      
      // attributesWithIds dizisini logla
      console.log('Güncellenecek attributesWithIds:', updatedVariant.attributesWithIds);
    }
    
    console.log('Güncellenecek varyant:', updatedVariant);
    
    this.productService.updateVariant(this.variantToEdit.id, updatedVariant).subscribe({
      next: (updated) => {
        console.log('Backend\'den dönen güncellenmiş varyant:', updated);
        this.showSuccessMessage('Varyant başarıyla güncellendi');
        this.closeVariantEditModal();
        
        // Listedeki varyantı güncelle
        const product = this.products.find(p => p.id === this.currentProductId);
        if (product && product.variants) {
          const index = product.variants.findIndex(v => v.id === updated.id);
          if (index !== -1) {
            product.variants[index] = updated;
          }
          
          // Ürünün toplam stoğunu hesapla
          this.updateProductTotalStock(product);
        }
        
        // Seçili ürünün varyantını da güncelle (detay modalı açıksa)
        if (this.selectedProduct && this.selectedProduct.variants) {
          const index = this.selectedProduct.variants.findIndex(v => v.id === updated.id);
          if (index !== -1) {
            this.selectedProduct.variants[index] = updated;
          }
          
          // Seçili ürünün toplam stoğunu güncelle
          this.updateProductTotalStock(this.selectedProduct);
        }
      },
      error: (err) => {
        console.error('Varyant güncellenirken hata oluştu:', err);
        this.showErrorMessage('Varyant güncellenirken bir hata oluştu: ' + (err.error?.message || err.message));
      }
    });
  }
  
  // Ürünün toplam stoğunu hesapla ve güncelle
  updateProductTotalStock(product: ExtendedProduct): void {
    // Eğer ürünün varyantları varsa, toplam stoku hesapla
    if (product.variants && product.variants.length > 0) {
      const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
      
      // Ürünün stok değerini güncelle
      product.stock = totalStock;
      product.totalStock = totalStock;
      
      // Sadece stok bilgisini güncelleyen özel bir endpoint kullan
      // Burada kategori sorunu oluşmaması için kısmi güncelleme yapan bir endpoint kullanmak daha iyi
      this.productService.updateProductStock(product.id, totalStock).subscribe({
        next: (updatedProduct) => {
          console.log('Ürün toplam stoğu güncellendi:', totalStock);
        },
        error: (err) => {
          console.error('Ürün toplam stoğu güncellenirken hata oluştu:', err);
          // Sessizce başarısız ol, kullanıcıyı rahatsız etme
        }
      });
    }
  }
  
  // Verilen özellik adına göre attribute_id'yi bulan yardımcı fonksiyon
  findAttributeIdForKey(key: string): number | null {
    // Burada mevcut attribute id'leri için bir eşleştirme yapıyoruz
    // Not: Bu fonksiyon, gerçek uygulamanın yapısına göre değiştirilmelidir
    
    // Örnek statik eşleştirme (gerçek uygulamada veritabanından gelmelidir)
    const attributeKeyMap: {[key: string]: number} = {
      'Renk': 4,
      'Beden': 5,
      'Numara': 7,
      'Materyal': 6,
      'Malzeme': 15,
      'Boyut': 17,
      'Desen': 13,
      'Sezon': 14
    };
    
    return attributeKeyMap[key] || null;
  }
  
  // Varyant özelliklerini düzenle (attributes)
  // Yeni özellik ekle
  addAttribute(): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    const key = prompt('Özellik adı:');
    if (key && key.trim() !== '') {
      const value = prompt(`"${key}" için değer:`);
      if (value && value.trim() !== '') {
        this.variantToEdit.attributes![key.trim()] = value.trim();
      }
    }
  }
  
  // Özellik düzenle
  editAttribute(key: string): void {
    if (!this.variantToEdit.attributes) {
      return;
    }
    
    const newValue = prompt(`"${key}" için yeni değer:`, this.variantToEdit.attributes[key]);
    if (newValue !== null) {
      this.variantToEdit.attributes[key] = newValue;
    }
  }
  
  // Özellik sil
  removeAttribute(key: string): void {
    if (!this.variantToEdit.attributes) {
      return;
    }
    
    if (confirm(`"${key}" özelliğini silmek istediğinizden emin misiniz?`)) {
      delete this.variantToEdit.attributes[key];
    }
  }

  // Özellik ekleme formunu göster
  showAttributeForm(): void {
    this.showAddAttributeForm = true;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Özellik ekleme formunu iptal et
  cancelAddAttribute(): void {
    this.showAddAttributeForm = false;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Yeni özelliği ekle
  confirmAddAttribute(): void {
    if (!this.newAttributeKey || !this.newAttributeValue) {
      return;
    }
    
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    // Aynı isimde özellik var mı kontrol et
    if (this.variantToEdit.attributes[this.newAttributeKey]) {
      if (!confirm(`"${this.newAttributeKey}" özelliği zaten var. Üzerine yazmak istiyor musunuz?`)) {
        return;
      }
    }
    
    this.variantToEdit.attributes[this.newAttributeKey] = this.newAttributeValue;
    this.showAddAttributeForm = false;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Renk paletinden bir renk seç
  selectColor(attributeKey: string, colorName: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    this.variantToEdit.attributes[attributeKey] = colorName;
  }
  
  // Renk paletinden bir renk seç ve RenkKodu'nu otomatik güncelle
  selectColorWithCode(attributeKey: string, colorName: string, colorCode: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    // Renk adını güncelle
    this.variantToEdit.attributes[attributeKey] = colorName;
    
    // RenkKodu alanını da güncelle (eğer varsa)
    if (this.variantToEdit.attributes.hasOwnProperty('RenkKodu')) {
      this.variantToEdit.attributes['RenkKodu'] = colorCode;
    } else {
      // RenkKodu alanı yoksa ekle
      this.variantToEdit.attributes['RenkKodu'] = colorCode;
    }
  }
  
  // Beden seçiciden bir beden seç
  selectSize(attributeKey: string, size: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    this.variantToEdit.attributes[attributeKey] = size;
  }
  
  // Rengin açık mı koyu mu olduğunu kontrol et (metin rengini belirlemek için)
  isLightColor(hexColor: string): boolean {
    // Hex renk kodunu RGB değerlerine dönüştür
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Rengin parlaklığını hesapla (YIQ formülü)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 128'den büyükse açık renk (koyu metin), değilse koyu renk (açık metin)
    return brightness > 128;
  }
}
