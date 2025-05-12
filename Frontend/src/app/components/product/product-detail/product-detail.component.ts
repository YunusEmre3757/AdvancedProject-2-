import { Component, OnInit, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Product, ProductAttribute, AttributeType, AttributeValue, ProductVariant } from '../../../models/product.interface';
import { ProductService } from '../../../services/product.service';
import { CartService } from '../../../services/cart.service';
import { FavoriteService } from '../../../services/favorite.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ProductReviewsComponent } from '../product-reviews/product-reviews.component';

// Product arayüzünü genişletmek için
export interface ProductWithOptions extends Product {
  attributes?: ProductAttribute[];
  loadedVariants?: ProductVariant[];
}

// Ürün tipleri için varyant konfigürasyonları
export interface VariantConfig {
  primaryAttr: string;  // Ana varyant özelliği (renk, model vb.)
  secondaryAttr: string | null; // İkincil varyant özelliği (beden, boyut vb.)
  showColorPicker: boolean; // Renk seçimi gösterilecek mi?
  showImageSwitch: boolean; // Görsel değişimi olacak mı?
}

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  standalone: false,
  animations: [
    trigger('cartAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ]),
    trigger('addedToCart', [
      state('initial', style({ transform: 'scale(1)' })),
      state('added', style({ transform: 'scale(1.2)' })),
      transition('initial => added', animate('300ms ease-out')),
      transition('added => initial', animate('300ms ease-in'))
    ])
  ]
})
export class ProductDetailComponent implements OnInit {
  @ViewChild('productImage') productImageEl?: ElementRef;
  
  product: ProductWithOptions | null = null;
  loading: boolean = false;
  error: string | null = null;
  quantity: number = 1;
  isInFavorites: boolean = false;
  similarProducts: Product[] = [];
  similarProductsLoading: boolean = false;
  variantsLoading: boolean = false;
  showReviews: boolean = false; // Değerlendirmeleri göster/gizle
  
  // Varyant seçimleri için
  availableVariants: Map<string, {id: number, name: string, code?: string, imageUrl?: string, available: boolean}[]> = new Map();
  selectedVariants: Map<string, {id: number, name: string, code?: string, imageUrl?: string, available: boolean}> = new Map();
  variantConfig: VariantConfig | null = null;
  selectedVariant: ProductVariant | null = null;
  
  // Renk ve beden seçimleri için
  availableColors: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}[] = [];
  availableSizes: {id: number, name: string, available: boolean}[] = [];
  selectedColor: {id: number, name: string, code?: string, imageUrl?: string, available: boolean} | null = null;
  selectedSize: {id: number, name: string, available: boolean} | null = null;
  
  // Ürün tipinin elektronik olup olmadığı
  isElectronicOrPhone: boolean = false;
  
  // Kategori - Varyant konfigürasyon eşleştirmeleri
  categoryVariantConfigs: Record<string, VariantConfig> = {
    'ayakkabi': {
      primaryAttr: 'Renk',
      secondaryAttr: 'Numara',
      showColorPicker: true,
      showImageSwitch: true
    },
    'giyim': {
      primaryAttr: 'Renk', 
      secondaryAttr: 'Beden',
      showColorPicker: true,
      showImageSwitch: true
    },
    'elektronik': {
      primaryAttr: 'Kapasite',
      secondaryAttr: 'Renk',
      showColorPicker: true,
      showImageSwitch: true
    },
    'bilgisayar': {
      primaryAttr: 'Kapasite',
      secondaryAttr: 'Renk',
      showColorPicker: true,
      showImageSwitch: true
    },
    'telefon': {
      primaryAttr: 'Kapasite',
      secondaryAttr: 'Renk',
      showColorPicker: true,
      showImageSwitch: true
    },
    'mobilya': {
      primaryAttr: 'Renk',
      secondaryAttr: 'Boyut',
      showColorPicker: true,
      showImageSwitch: true
    },
    'aksesuar': {
      primaryAttr: 'Renk',
      secondaryAttr: null,
      showColorPicker: true,
      showImageSwitch: true
    },
    'kitap': {
      primaryAttr: 'Format',
      secondaryAttr: null,
      showColorPicker: false,
      showImageSwitch: false
    },
    'default': {
      primaryAttr: 'Tip',
      secondaryAttr: 'Boyut',
      showColorPicker: false,
      showImageSwitch: true
    }
  };
  
  // Kapasite gerektiren elektronik ürün kategorileri
  capacityRequiredCategories: string[] = [
    'telefon', 'bilgisayar', 'laptop', 'masaustu', 
    'harddisk', 'ssd', 'flashbellek', 'hafizakarti', 'gaming',
    'gaminglaptop', 'notebook', 'computer', 'pc'
  ];
  
  // Renk, kapasite gerektirmeyen elektronik ürün kategorileri
  colorOnlyCategories: string[] = [
    'kulaklik', 'kulakustu', 'kulakici', 'kamera', 
    'hoparlor', 'bluetooth', 'klavye', 'mouse', 'fare', 
    'mikrofon', 'sarjcihazi', 'powerbank', 'modem', 'router',
    'sessistemi', 'sessistemleri', 'speaker', 'headphone', 'headphones',
    'kulaklık', 'mikrofonlu', 'gamingmouse', 'gamingklavye', 
    'mousepad', 'webcam', 'controller', 'gamepad', 'joystick',
    'oyuncu', 'gaming', 'gamer','tablet'
  ];
  
  // Sepet animasyonu için
  showCartNotification: boolean = false;
  cartAnimationState: 'initial' | 'added' = 'initial';
  lastAddedItem: any = null;
  
  // Seçili özellik değerleri
  selectedAttributes: Map<number, AttributeValue> = new Map();
  
  // Attribute tipleri için kolay erişim
  attributeTypes = AttributeType;

  // Önbelleğe alınmış canAddToCart durumu
  private _canAddToCart: boolean = false;

  // Image gallery properties
  selectedImage: string | null = null;
  currentVariantImages: string[] = [];
  currentImageIndex: number = 0;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private favoriteService: FavoriteService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      if (id.match(/^\d+$/)) {
        // ID is numeric
        this.loadProductWithOptions(parseInt(id, 10));
      } else {
        // ID is a slug
        this.loadProductWithOptionsBySlug(id);
      }
    }
  }

  // Ürünü ve özelliklerini veritabanından yükle
  private loadProductWithOptions(productId: number): void {
    // Önce temel ürün bilgisini al
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.product = product as ProductWithOptions;
        this.isInFavorites = this.favoriteService.isInFavorites(product.id);
        
        // Ürün kategorisine göre varyant konfigürasyonunu belirle
        this.determineVariantConfig(product);
        
        // Ürüne ait dinamik özellikleri al
        this.productService.getProductAttributes(product.id).subscribe({
          next: (attributes) => {
            this.product!.attributes = attributes;
            this.setDefaultSelections();
            this.loading = false;
            
            // Benzer ürünleri yükle
            this.loadSimilarProducts(productId);
            
            // Varyantları yükle
            this.loadProductVariants(productId);
          },
          error: (error) => {
            console.error('Ürün özellikleri yüklenirken hata:', error);
            this.loading = false;
            
            // API erişilemediğinde ürünü yine de göster
            if (this.product) {
              this.setDefaultSelections();
              this.loadSimilarProducts(productId);
              this.loadProductVariants(productId);
            }
          }
        });
      },
      error: (error: Error) => {
        this.error = 'Ürün yüklenirken bir hata oluştu';
        this.loading = false;
        console.error('Ürün yüklenirken hata:', error);
      }
    });
  }

  // Ürün kategorisine göre varyant konfigürasyonunu belirle
  private determineVariantConfig(product: Product): void {
    // Normalize edilmiş kategori adı
    const category = this.normalizeCategoryName(product.category);
    
    console.log('Original category:', product.category);
    console.log('Normalize edilmiş kategori adı:', category);
    
    // Ürünün elektronik olup olmadığını belirle
    this.isElectronicOrPhone = category === 'elektronik' || 
                              category === 'telefon' ||
                              category.includes('elektronik') ||
                              category === 'telefonlar' ||
                              category.includes('ses') ||
                              category.includes('kulak') ||
                              category.includes('fare') ||
                              category.includes('mouse') ||
                              category.includes('gaming') ||
                              category.includes('klavye') ||
                              this.checkCategoryInList(category, this.capacityRequiredCategories) ||
                              this.checkCategoryInList(category, this.colorOnlyCategories);
    
    // Kategori için özel konfigürasyon var mı kontrol et
    if (category === 'telefonlar') {
      // telefonlar kategorisi için özel konfigürasyon (id==2 Telefonlar kategorisi)
      this.variantConfig = {
        primaryAttr: 'Kapasite',
        secondaryAttr: 'Renk',
        showColorPicker: true,
        showImageSwitch: true
      };
      console.log('Telefonlar kategorisi için özel konfigürasyon uygulandı:', this.variantConfig);
    }
    // Bilgisayar/Laptop kategorisi için özel kontrol
    else if (category === 'bilgisayar' || category.includes('laptop') || category.includes('computer') || category.includes('gaming')) {
      this.variantConfig = {
        primaryAttr: 'Kapasite',
        secondaryAttr: 'Renk',
        showColorPicker: true,
        showImageSwitch: true
      };
      console.log('Bilgisayar/Laptop kategorisi için özel konfigürasyon uygulandı:', this.variantConfig);
    } 
    else {
      this.variantConfig = this.categoryVariantConfigs[category] || this.categoryVariantConfigs['default'];
    }
    
    // Elektronik alt kategorileri için dinamik konfigürasyon ataması
    if (this.checkCategoryInList(category, this.capacityRequiredCategories)) {
      // Kapasite gerektiren kategoriler (telefon, tablet, bilgisayar, vb.)
      this.variantConfig = this.categoryVariantConfigs['elektronik']; // kapasite+renk
      console.log(`${category} için kapasite+renk konfigürasyonu uygulandı`);
    } 
    else if (this.checkCategoryInList(category, this.colorOnlyCategories)) {
      // Sadece renk gerektiren kategoriler (kulaklık, kamera, vb.)
      this.variantConfig = {
        primaryAttr: 'Renk',
        secondaryAttr: null,
        showColorPicker: true,
        showImageSwitch: true
      };
      console.log(`${category} için sadece renk konfigürasyonu uygulandı`);
    }
    
    // Sorunlu ürün ID'leri için özel konfigürasyonlar
    
    console.log('Kategori:', category);
    console.log('Seçilen varyant konfigürasyonu:', this.variantConfig);
    console.log('Elektronik veya ses ürünü mü:', this.isElectronicOrPhone);
  }
  
  // Bir kategori adının belirli bir liste içinde olup olmadığını kontrol eden yardımcı metot
  private checkCategoryInList(category: string, list: string[]): boolean {
    if (!category) return false;
    
    // Doğrudan eşleşme
    if (list.includes(category)) return true;
    
    // Kategori adı liste elemanlarından birini içeriyor mu?
    return list.some(item => category.includes(item));
  }

  // Kategori adını normalize et (küçük harf, boşluk yok)
  private normalizeCategoryName(category: string): string {
    if (!category) return 'default';
    
    // Kategori obje olarak geldiyse
    if (typeof category === 'object' && (category as any).name) {
      category = (category as any).name;
    }
    
    // String'e çevirme
    category = String(category).toLowerCase();
    
    // Ana kategoriler
    const giyimKategorileri = ['giyim', 'elbise', 'pantolon', 'kazak', 'ceket', 'gömlek', 'gomlek', 'tişört', 'tisort', 't-shirt', 't shirt'];
    const ayakkabiKategorileri = ['ayakkabı', 'ayakkabi', 'bot', 'çizme', 'cizme', 'sandalet', 'terlik'];
    const elektronikKategorileri = ['elektronik', 'electronic'];
    const telefonKategorileri = ['telefon', 'phone', 'cep telefonu', 'smartphone', 'akıllı telefon'];
    const mobilyaKategorileri = ['mobilya', 'koltuk', 'masa', 'sandalye', 'yatak'];
    const kitapKategorileri = ['kitap', 'dergi', 'book', 'magazine'];
    const bilgisayarKategorileri = ['bilgisayar', 'laptop', 'gaming', 'pc', 'computer', 'notebook', 'gaming laptop', 'gaminglaptop'];
    
    // Özel kategori kontrolleri - alt kategorileri ana kategorilere yönlendir
    for (const term of giyimKategorileri) {
      if (category.includes(term)) return 'giyim';
    }
    
    for (const term of ayakkabiKategorileri) {
      if (category.includes(term)) return 'ayakkabi';
    }
    
    for (const term of elektronikKategorileri) {
      if (category.includes(term)) return 'elektronik';
    }

    for (const term of bilgisayarKategorileri) {
      if (category.includes(term)) return 'bilgisayar';
    }
    
    for (const term of telefonKategorileri) {
      if (category.includes(term)) return 'telefon';
    }
    
    for (const term of mobilyaKategorileri) {
      if (category.includes(term)) return 'mobilya';
    }
    
    for (const term of kitapKategorileri) {
      if (category.includes(term)) return 'kitap';
    }
    
    // Türkçe karakterleri ingilizce karşılıklarına çevir
    const tr = 'çğıöşüÇĞİÖŞÜ';
    const en = 'cgioscuCGIOSU';
    let normalized = '';
    
    for (let i = 0; i < category.length; i++) {
      const trIndex = tr.indexOf(category[i]);
      if (trIndex >= 0) {
        normalized += en[trIndex];
      } else {
        normalized += category[i];
      }
    }
    
    // Küçük harfe çevir, boşlukları kaldır
    return normalized.toLowerCase().replace(/\s+/g, '');
  }

  // Slug ile ürünü ve özelliklerini veritabanından yükle
  private loadProductWithOptionsBySlug(slug: string): void {
    this.productService.getProductBySlug(slug).subscribe({
      next: (product) => {
        this.product = product as ProductWithOptions;
        this.isInFavorites = this.favoriteService.isInFavorites(product.id);
        
        // Ürüne ait dinamik özellikleri al
        this.productService.getProductAttributes(product.id).subscribe({
          next: (attributes) => {
            this.product!.attributes = attributes;
            this.setDefaultSelections();
            this.loading = false;
            
            // Benzer ürünleri yükle
            this.loadSimilarProducts(product.id);
            
            // Varyantları yükle
            this.loadProductVariants(product.id);
          },
          error: (error) => {
            console.error('Ürün özellikleri yüklenirken hata:', error);
            this.loading = false;
            
            // API erişilemediğinde ürünü yine de göster
            if (this.product) {
              this.setDefaultSelections();
              this.loadSimilarProducts(product.id);
              this.loadProductVariants(product.id);
            }
          }
        });
      },
      error: (error: Error) => {
        this.error = 'Ürün yüklenirken bir hata oluştu';
        this.loading = false;
        console.error('Ürün yüklenirken hata:', error);
      }
    });
  }

  // Ürün varyantlarını yükle
  private loadProductVariants(productId: number): void {
    this.variantsLoading = true;
    
    this.productService.getProductVariants(productId).subscribe({
      next: (variants) => {
        if (this.product) {
          this.product.loadedVariants = variants;
          
          console.log('Backend\'den gelen ürün varyantları:', variants);
          
          // Varyantlardan seçenekleri oluştur
          if (variants && variants.length > 0) {
            this.processVariants(variants);
          } else {
            console.error('Ürün varyantları bulunamadı:', variants);
          }
        }
        
        this.variantsLoading = false;
      },
      error: (error) => {
        console.error('Ürün varyantları yüklenirken hata:', error);
        this.variantsLoading = false;
      }
    });
  }
  
  /**
   * Varyant özelliklerini işle
   */
  private processVariants(variants: ProductVariant[]): void {
    console.log('Varyantlar işleniyor:', variants);
    
    // Varyant filtreleri
    const availableAttrs = this.getAvailableAttributesFromVariants(variants);
    console.log('Varyanttaki mevcut özellikler:', availableAttrs);
    
    // Dinamik olarak kategori ve mevcut varyant özelliklerine göre varyant konfigürasyonunu güncelle
    if (this.isElectronicOrPhone) {
      // Elektronik ürünler için öncelikle mevcut attributelere göre konfigürasyon güncelle
      const hasCapacity = availableAttrs.some(attr => 
        attr.toLowerCase() === 'kapasite' || 
        attr.toLowerCase() === 'hafıza' || 
        attr.toLowerCase() === 'depolama');
      
      const hasColor = availableAttrs.some(attr => 
        attr.toLowerCase() === 'renk');
        
      // Ürünün özelliklerine göre dinamik olarak varyant konfigürasyonunu belirle
      if (hasCapacity && hasColor) {
        // Hem kapasite hem renk varsa ikisini de göster
        this.variantConfig = {
          primaryAttr: 'Kapasite',
          secondaryAttr: 'Renk',
          showColorPicker: true,
          showImageSwitch: true
        };
      } else if (hasCapacity) {
        // Sadece kapasite varsa
        this.variantConfig = {
          primaryAttr: 'Kapasite',
          secondaryAttr: null,
          showColorPicker: false,
          showImageSwitch: true
        };
      } else if (hasColor) {
        // Sadece renk varsa
        this.variantConfig = {
          primaryAttr: 'Renk',
          secondaryAttr: null,
          showColorPicker: true,
          showImageSwitch: true
        };
        
        // Renk varyantları için renk kodunu kullan
        if (availableAttrs.includes('RenkKodu')) {
          console.log('Renk kodu özelliği bulundu, renk seçiminde kullanılacak');
        }
      }
    }
    
    // Kategori tipine göre varyant özelliklerini belirle
    if (this.variantConfig) {
      // Mobilya ürünleri için özel kontrol
      if (availableAttrs.includes('Malzeme') && availableAttrs.includes('Renk') && availableAttrs.includes('Boyut')) {
        console.log('Mobilya türü ürün varyantları işleniyor');
        this.processVariantAttribute(variants, 'Renk');
        this.processVariantAttribute(variants, 'Malzeme');
        this.processVariantAttribute(variants, 'Boyut');
        
        // Mobilya için varyant konfigürasyonunu güncelle
        this.variantConfig = this.categoryVariantConfigs['mobilya'];
      }
      // Standart işlemeye devam et
      else {
        // Mevcut özellikler arasında primaryAttr varsa işle
        if (this.variantConfig.primaryAttr) {
          const normalizedPrimaryAttr = this.variantConfig.primaryAttr.toLowerCase();
          const primaryAttrExists = availableAttrs.some(
            attr => attr.toLowerCase() === normalizedPrimaryAttr
          );
          
          if (primaryAttrExists) {
            this.processVariantAttribute(variants, this.variantConfig.primaryAttr);
          }
        }
        
        // Mevcut özellikler arasında secondaryAttr varsa işle
        if (this.variantConfig.secondaryAttr) {
          const normalizedSecondaryAttr = this.variantConfig.secondaryAttr.toLowerCase();
          const secondaryAttrExists = availableAttrs.some(
            attr => attr.toLowerCase() === normalizedSecondaryAttr
          );
          
          if (secondaryAttrExists) {
            this.processVariantAttribute(variants, this.variantConfig.secondaryAttr);
          }
        }
      }
    }
    
    // Trendyol-style renk ve beden listelerini oluştur
    this.updateColorAndSizeLists();
    
    // Varyantlar işlendikten sonra, bir varyant seçili olup olmadığını kontrol et
    if (!this.selectedVariant && variants.length > 0) {
      console.log('Varyant henüz seçilmemiş, ilk varyant otomatik seçiliyor...');
      const firstAvailableVariant = variants.find(v => v.stock > 0 && v.active);
      
      if (firstAvailableVariant) {
        console.log('İlk uygun varyant seçildi:', firstAvailableVariant);
        this.selectedVariant = firstAvailableVariant;
        this.updateColorAndSizeFromVariant(firstAvailableVariant);
        this.updateVariantImages(firstAvailableVariant);
      } else {
        console.log('Uygun varyant bulunamadı, ilk varyant seçiliyor:', variants[0]);
        this.selectedVariant = variants[0];
        this.updateColorAndSizeFromVariant(variants[0]);
        this.updateVariantImages(variants[0]);
      }
    }
    
    // Sepete eklenebilirlik durumunu güncelle
    this.updateCanAddToCartState();
  }
  
  // Varyanttaki mevcut özellikleri çıkar
  private getAvailableAttributesFromVariants(variants: ProductVariant[]): string[] {
    const allAttributes = new Set<string>();
    
    variants.forEach(variant => {
      if (variant.attributes) {
        Object.keys(variant.attributes).forEach(key => {
          allAttributes.add(key);
        });
      }
    });
    
    return Array.from(allAttributes);
  }
  
  /**
   * Varyant özelliğini işle
   */
  private processVariantAttribute(variants: ProductVariant[], attrName: string): void {
    const options: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}[] = [];
    const processedValues = new Set<string>();
    
    console.log(`${attrName} özelliği işleniyor...`);
    
    // Büyük/küçük harf duyarlılığını kaldır
    const normalizedAttrName = attrName.toLowerCase();
    
    // Tüm varyantlardan normalleştirilmiş özellik değerlerini al
    const variantValues = variants.map(v => {
      if (v.attributes) {
        // Büyük/küçük harf eşleşmesi için tüm özellikleri kontrol et
        for (const [key, value] of Object.entries(v.attributes)) {
          if (key.toLowerCase() === normalizedAttrName) {
            return value;
          }
        }
      }
      return undefined;
    });
    
    console.log(`Varyantlardan özellik değerleri çıkarılıyor: `, variantValues);
    
    // Tüm varyantları döngüye al ve belirtilen özelliğin değerlerini işle
    variants.forEach((variant, index) => {
      if (variant.attributes) {
        // Büyük/küçük harf duyarsız arama için tüm özellikleri kontrol et
        let value: string | undefined;
        
        for (const [key, val] of Object.entries(variant.attributes)) {
          if (key.toLowerCase() === normalizedAttrName) {
            value = val;
            break;
          }
        }
        
        if (value) {
          // Aynı değerin tekrar işlenmesini önle
          if (processedValues.has(value)) {
            return;
          }
          
          processedValues.add(value);
          
          // Stok kontrolü
          const isAvailable = variant.stock > 0 && variant.active;
          
          // Görsel URL
          let imageUrl: string | undefined;
          if (variant.imageUrls && variant.imageUrls.length > 0) {
            imageUrl = variant.imageUrls[0];
          }
          
          // Renk kodu (Renk özelliği için)
          let colorCode: string | undefined;
          let displayName = value;
          
          if (normalizedAttrName === 'renk') {
            // Backend'den gelen renk kodunu kullan
            colorCode = variant.attributes['RenkKodu'];
            
            // Backend'den renk kodu gelmezse fallback olarak frontend'de oluştur
            if (!colorCode) {
              colorCode = this.getColorCodeFromName(value);
              console.log(`Backend'den renk kodu gelmedi, frontend'de oluşturuldu: ${value} -> ${colorCode}`);
            } else {
              console.log(`Backend'den renk kodu alındı: ${value} -> ${colorCode}`);
            }
            
            // Renk ismini daha güzel göstermek için İngilizce -> Türkçe çeviri
            const colorTranslation: Record<string, string> = {
              'BLACK': 'Siyah',
              'WHITE': 'Beyaz',
              'RED': 'Kırmızı',
              'BLUE': 'Mavi',
              'GREEN': 'Yeşil',
              'YELLOW': 'Sarı',
              'PURPLE': 'Mor',
              'ORANGE': 'Turuncu',
              'PINK': 'Pembe',
              'GRAY': 'Gri',
              'GREY': 'Gri',
              'BROWN': 'Kahverengi',
              'NAVY': 'Lacivert',
              'BEIGE': 'Bej',
              'GOLD': 'Altın',
              'SILVER': 'Gümüş',
              'CREAM': 'Krem',
              'BURGUNDY': 'Bordo',
              'KHAKI': 'Haki',
              'TURQUOISE': 'Turkuaz'
            };
            
            // İngilizce renk adlarını Türkçe olarak göster
            if (value.toUpperCase() in colorTranslation) {
              displayName = colorTranslation[value.toUpperCase()];
            }
            
            console.log(`Renk bilgisi işlendi: ${value} -> ${colorCode} (${displayName})`);
          }
          
          // Varyant seçeneğini listeye ekle
          options.push({
            id: index,
            name: displayName,
            code: colorCode,
            imageUrl,
            available: isAvailable
          });
        }
      }
    });
    
    console.log(`${attrName} için oluşturulan seçenekler:`, options);
    
    // Özellik tipine göre doğru sıralama yap
    if (normalizedAttrName === 'beden') {
      // Beden sıralaması (XS -> XXL)
      const sizeOrder: Record<string, number> = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, '2XL': 6, '3XL': 7
      };
      
      options.sort((a, b) => {
        // Önce sizeOrder'da tanımlı bedenleri sırala
        if (sizeOrder[a.name] && sizeOrder[b.name]) {
          return sizeOrder[a.name] - sizeOrder[b.name];
        }
        
        // Numerik sıralama yap (34, 36, 38, ...)
        const numA = parseInt(a.name);
        const numB = parseInt(b.name);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        // Diğer durumlarda alfabetik sırala
        return a.name.localeCompare(b.name);
      });
    } else if (normalizedAttrName === 'numara') {
      // Ayakkabı numarası sıralaması (küçükten büyüğe)
      options.sort((a, b) => {
        const numA = parseInt(a.name);
        const numB = parseInt(b.name);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.name.localeCompare(b.name);
      });
    } else if (normalizedAttrName === 'malzeme') {
      // Malzeme sıralaması (alfabetik)
      options.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`Malzeme seçenekleri sıralandı:`, options.map(o => o.name));
    } else if (normalizedAttrName === 'boyut') {
      // Boyut sıralaması (ör: "4 Kişilik", "6 Kişilik", "8 Kişilik")
      const sizeOrder: Record<string, number> = {
        '4 Kişilik': 1, '6 Kişilik': 2, '8 Kişilik': 3
      };
      
      options.sort((a, b) => {
        if (sizeOrder[a.name] && sizeOrder[b.name]) {
          return sizeOrder[a.name] - sizeOrder[b.name];
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log(`Boyut seçenekleri sıralandı:`, options.map(o => o.name));
    } else if (normalizedAttrName === 'kapasite') {
      // Kapasite sıralaması (küçükten büyüğe)
      const getCapacitySize = (cap: string): number => {
        const match = cap.match(/(\d+)(GB|TB)/i);
        if (!match) return 0;
        
        const size = parseInt(match[1]);
        const unit = match[2].toUpperCase();
        
        return unit === 'TB' ? size * 1024 : size;
      };
      
      options.sort((a, b) => getCapacitySize(a.name) - getCapacitySize(b.name));
      console.log(`Kapasite sıralaması yapıldı:`, options.map(o => o.name));
    } else {
      // Diğer özellikler için alfabetik sıralama
      options.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Mevcut varyant seçeneklerini güncelle
    this.availableVariants.set(attrName, options);
    
    console.log(`${attrName} seçenekleri UI için hazırlandı:`, options);
    console.log(`availableVariants Map'i şu anki durumu:`, this.availableVariants);
  }
  
  // Varyant seçeneği seç
  selectVariantOption(attrName: string, option: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}): void {
    console.log(`selectVariantOption çağrıldı: ${attrName} = ${option.name} (available: ${option.available})`);
    
    // Önce, bu özelliğin seçili olup olmadığını kontrol edelim
    const currentSelection = this.selectedVariants.get(attrName);
    const isAlreadySelected = currentSelection && currentSelection.id === option.id;
    
    console.log(`Şu anki seçim:`, currentSelection);
    console.log(`Zaten seçili mi: ${isAlreadySelected}`);
    
    // Seçimi kaydet
    this.selectedVariants.set(attrName, option);
    
    // Ana özellik seçildiğinde ikincil özellikleri güncelle
    if (this.variantConfig && attrName === this.variantConfig.primaryAttr && this.variantConfig.secondaryAttr) {
      console.log(`Ana özellik seçildi (${attrName}), ikincil özellikler güncellenecek`);
      
      // İkincil özellikleri güncelle (ana seçime göre)
      this.updateSecondaryOptionsForced();
    }
    
    // Mobilya için özel işlem - Malzeme seçildiğinde Boyutları güncelle
    if (attrName === 'Malzeme' && this.variantConfig && this.variantConfig.secondaryAttr === 'Boyut') {
      this.updateSizeOptionsForSelectedMaterial(option.name);
    }
    
    // Seçilen özellik kombinasyonuna göre varyantı bul
    this.updateSelectedVariant();
    
    // Sepete eklenebilir durumunu güncelle
    this.updateCanAddToCartState();
    
    // Varyant seçimi sonrası güncellemeleri logla
    console.log('Seçilen varyantlar Map:', {});
    this.selectedVariants.forEach((value, key) => {
      console.log(`  ${key}: ${value.name}`);
    });
    console.log(`Seçilen varyant:`, this.selectedVariant);
    console.log(`Sepete eklenebilir mi: ${this._canAddToCart}`);
    
    console.log(`Varyant seçimi sonrası durum:`, {
      selectedVariants: this.selectedVariants,
      selectedVariant: this.selectedVariant,
      canAddToCart: this._canAddToCart
    });
  }
  
  // Seçilen malzemeye göre boyut seçeneklerini güncelle (Mobilya için)
  private updateSizeOptionsForSelectedMaterial(materialName: string): void {
    if (!this.product?.loadedVariants) return;
    
    console.log(`Seçilen malzeme için boyut seçenekleri güncelleniyor: ${materialName}`);
    
    // Seçilen rengi al
    const selectedColor = this.selectedVariants.get('Renk')?.name;
    if (!selectedColor) {
      console.warn('Renk seçilmeden malzeme seçimi yapıldı');
      return;
    }
    
    // Seçilen renk ve malzemeye sahip varyantları filtrele
    const filteredVariants = this.product.loadedVariants.filter(variant => {
      return Object.entries(variant.attributes).some(([key, value]) => 
        key === 'Renk' && value === selectedColor
      ) && 
      Object.entries(variant.attributes).some(([key, value]) => 
        key === 'Malzeme' && value === materialName
      );
    });
    
    console.log(`Seçilen renk ve malzeme için varyantlar:`, filteredVariants);
    
    // Bu renk ve malzemedeki varyantlardan boyut seçeneklerini çıkar
    const availableSizes = new Set<string>();
    filteredVariants.forEach(variant => {
      if (variant.attributes['Boyut']) {
        availableSizes.add(variant.attributes['Boyut']);
      }
    });
    
    console.log(`Seçilen renk ve malzeme için mevcut boyutlar:`, Array.from(availableSizes));
    
    // Boyut seçeneklerini oluştur
    const sizeOptions: {id: number, name: string, available: boolean}[] = [];
    Array.from(availableSizes).forEach((size, index) => {
      const variant = filteredVariants.find(v => v.attributes['Boyut'] === size);
      sizeOptions.push({
        id: index,
        name: size,
        available: variant ? (variant.stock > 0 && variant.active) : false
      });
    });
    
    // Boyut seçeneklerini doğru sırala
    const sizeOrder: Record<string, number> = {
      '4 Kişilik': 1, '6 Kişilik': 2, '8 Kişilik': 3
    };
    
    sizeOptions.sort((a, b) => {
      if (sizeOrder[a.name] && sizeOrder[b.name]) {
        return sizeOrder[a.name] - sizeOrder[b.name];
      }
      return a.name.localeCompare(b.name);
    });
    
    // Mevcut boyut seçeneklerini güncelle
    this.availableVariants.set('Boyut', sizeOptions);
    
    // Önceki boyut seçimi bu renk ve malzeme için geçerli mi kontrol et
    const currentSizeSelection = this.selectedVariants.get('Boyut');
    const isSizeStillValid = currentSizeSelection && 
                           sizeOptions.some(s => s.name === currentSizeSelection.name);
    
    if (!isSizeStillValid && sizeOptions.length > 0) {
      // Mevcut seçim geçerli değilse, ilk boyutu seç
      console.log(`Önceki boyut seçimi geçerli değil, ilk boyut seçiliyor: ${sizeOptions[0].name}`);
      this.selectVariantOption('Boyut', sizeOptions[0]);
    }
  }
  
  // İkincil varyant seçeneklerini güncelle (ana seçime göre) - Yeni güçlendirilmiş versiyon
  private updateSecondaryOptionsForced(): void {
    if (!this.product?.loadedVariants || !this.variantConfig || !this.variantConfig.secondaryAttr) {
      console.warn("updateSecondaryOptionsForced: Varyant verisi veya konfigürasyon bulunamadı!");
      return;
    }

    console.log("İkincil seçenekler için GÜÇLÜ güncelleme çağrıldı!");
    
    const primaryAttr = this.variantConfig.primaryAttr; // ör: Kapasite
    const secondaryAttr = this.variantConfig.secondaryAttr; // ör: Renk
    const selectedPrimaryValue = this.selectedVariants.get(primaryAttr)?.name; // ör: 1TB
    
    if (!selectedPrimaryValue) {
      console.warn(`Ana özellik (${primaryAttr}) seçilmemiş!`);
      return;
    }
    
    console.log(`Ana özellik seçimi: ${primaryAttr} = ${selectedPrimaryValue}`);
    console.log(`İkincil özellik güncellemesi: ${secondaryAttr}`);
    
    // İlk varyant seçimini temizle
    this.selectedVariant = null;
    
    // Ana özelliğin seçilmiş değerine sahip varyantları filtrele
    const filteredVariants = this.product.loadedVariants.filter(variant => {
      // Özellik büyük/küçük harfe duyarsız kontrolü
      return Object.keys(variant.attributes).some(key => {
        // Özellik adını kontrol et (Kapasite/Storage vs.)
        if (key.toLowerCase() === primaryAttr.toLowerCase() || 
            (primaryAttr === 'Kapasite' && key === 'Storage') || 
            (primaryAttr === 'Storage' && key === 'Kapasite')) {
          
          // Değeri kontrol et
          const value = variant.attributes[key];
          return value.toLowerCase() === selectedPrimaryValue.toLowerCase();
        }
        return false;
      });
    });
    
    console.log(`Ana özellik değerine (${selectedPrimaryValue}) göre filtrelenmiş varyantlar:`, filteredVariants);
    
    if (filteredVariants.length === 0) {
      console.warn(`${primaryAttr} = ${selectedPrimaryValue} için eşleşen varyant bulunamadı!`);
      return;
    }
    
    // İkincil özellik için kullanılabilir değerleri topla
    const secondaryValues = new Set<string>();
    
    filteredVariants.forEach(variant => {
      Object.keys(variant.attributes).forEach(key => {
        // İkincil özelliğin adı doğru mu?
        if (key.toLowerCase() === secondaryAttr.toLowerCase() || 
            (secondaryAttr === 'Renk' && key === 'Color') || 
            (secondaryAttr === 'Color' && key === 'Renk')) {
          
          secondaryValues.add(variant.attributes[key]);
        }
      });
    });
    
    console.log(`${primaryAttr} = ${selectedPrimaryValue} için kullanılabilir ${secondaryAttr} değerleri:`, 
                Array.from(secondaryValues));
    
    // İkincil özellik değerlerini seçeneklere dönüştür
    const secondaryOptions: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}[] = [];
    
    Array.from(secondaryValues).forEach((value, index) => {
      // Bu değere sahip bir varyant bulalım
      const variant = filteredVariants.find(v => 
        Object.entries(v.attributes).some(([k, val]) => 
          (k.toLowerCase() === secondaryAttr.toLowerCase() || 
           (secondaryAttr === 'Renk' && k === 'Color') || 
           (secondaryAttr === 'Color' && k === 'Renk')) && 
          val.toLowerCase() === value.toLowerCase()
        )
      );
      
      if (variant) {
        // Bu ikincil değere sahip varyant bulundu
        
        // Renk kodu varsa al (Renk özelliği için)
        let colorCode: string | undefined;
        if (secondaryAttr.toLowerCase() === 'renk' || secondaryAttr === 'Color') {
          colorCode = variant.attributes['RenkKodu'] || this.getColorCodeFromName(value);
        }
        
        // Varyant resmi varsa al
        let imageUrl: string | undefined;
        if (variant.imageUrls && variant.imageUrls.length > 0) {
          imageUrl = variant.imageUrls[0];
        }
        
        // Seçenek nesnesini oluştur
        const option = {
          id: index,
          name: value,
          code: colorCode,
          imageUrl: imageUrl,
          available: variant.stock > 0 && variant.active
        };
        
        secondaryOptions.push(option);
      }
    });
    
    console.log(`${secondaryAttr} için oluşturulan seçenekler:`, secondaryOptions);
    
    // Önceki ikincil seçimi kontrol et
    const previousSelection = this.selectedVariants.get(secondaryAttr);
    const stillValid = previousSelection && 
                      secondaryOptions.some(opt => opt.name.toLowerCase() === previousSelection.name.toLowerCase());
    
    // Mevcut ikincil seçenek listesini güncelle
    this.availableVariants.set(secondaryAttr, secondaryOptions);
    
    // availableColors/availableSizes UI öğelerini güncelle
    if (secondaryAttr.toLowerCase() === 'renk' || secondaryAttr === 'Color') {
      this.availableColors = secondaryOptions;
      console.log('Renk listesi güncellendi:', this.availableColors);
      
      // Önceki seçim geçerli mi, yoksa ilk seçeneği mi kullanalım?
      if (stillValid && previousSelection) {
        console.log('Önceki renk seçimi hala geçerli:', previousSelection.name);
        // İsim eşleşmesine göre seçeneği bul
        const matchingOption = secondaryOptions.find(opt => 
          opt.name.toLowerCase() === previousSelection.name.toLowerCase());
        
        if (matchingOption) {
          this.selectedColor = matchingOption;
          this.selectedVariants.set(secondaryAttr, matchingOption);
        }
      } else if (secondaryOptions.length > 0) {
        console.log('İlk renk seçeneği otomatik seçiliyor:', secondaryOptions[0].name);
        this.selectedColor = secondaryOptions[0];
        this.selectedVariants.set(secondaryAttr, secondaryOptions[0]);
    } else {
        // Seçenek kalmadı
        console.warn('Renk seçeneği kalmadı!');
        this.selectedColor = null;
        this.selectedVariants.delete(secondaryAttr);
      }
    } 
    else if (['beden', 'numara', 'boyut', 'size'].includes(secondaryAttr.toLowerCase())) {
      this.availableSizes = secondaryOptions;
      console.log('Beden/numara listesi güncellendi:', this.availableSizes);
      
      // Önceki seçim geçerli mi, yoksa ilk seçeneği mi kullanalım?
      if (stillValid && previousSelection) {
        console.log('Önceki beden seçimi hala geçerli:', previousSelection.name);
        const matchingOption = secondaryOptions.find(opt => 
          opt.name.toLowerCase() === previousSelection.name.toLowerCase());
        
        if (matchingOption) {
          this.selectedSize = matchingOption;
          this.selectedVariants.set(secondaryAttr, matchingOption);
        }
      } else if (secondaryOptions.length > 0) {
        console.log('İlk beden seçeneği otomatik seçiliyor:', secondaryOptions[0].name);
        this.selectedSize = secondaryOptions[0];
        this.selectedVariants.set(secondaryAttr, secondaryOptions[0]);
    } else {
        // Seçenek kalmadı
        console.warn('Beden/numara seçeneği kalmadı!');
        this.selectedSize = null;
        this.selectedVariants.delete(secondaryAttr);
      }
    }
    
    // Son kontroller
    console.log('İkincil seçenekler güncelleme sonrası durum:');
    console.log('- Mevcut seçimler:', this.selectedVariants);
    console.log('- Renk listesi:', this.availableColors);
    console.log('- Beden listesi:', this.availableSizes);
  }
  
  // Seçilen özellik kombinasyonuna göre varyantı bul
  private updateSelectedVariant(): void {
    if (!this.product?.loadedVariants || !this.variantConfig) return;

    const primaryAttr = this.variantConfig.primaryAttr;
    const secondaryAttr = this.variantConfig.secondaryAttr;
    
    const primaryValue = this.selectedVariants.get(primaryAttr)?.name;
    const secondaryValue = secondaryAttr ? this.selectedVariants.get(secondaryAttr)?.name : null;
    
    if (!primaryValue) return;
    
    console.log(`Varyant aranıyor - ${primaryAttr}: ${primaryValue}, ${secondaryAttr}: ${secondaryValue}`);
    console.log('Tüm yüklü varyantlar:', this.product.loadedVariants);
    
    // Küçük/büyük harf duyarsız karşılaştırma için
    const normalizedPrimaryAttr = primaryAttr.toLowerCase();
    const normalizedSecondaryAttr = secondaryAttr ? secondaryAttr.toLowerCase() : null;
    const normalizedPrimaryValue = primaryValue.toLowerCase();
    const normalizedSecondaryValue = secondaryValue ? secondaryValue.toLowerCase() : null;
    
    // İngilizce/Türkçe karşılıklar
    const attributeTranslations: Record<string, string[]> = {
      'renk': ['color', 'renk'],
      'kapasite': ['storage', 'capacity', 'kapasite'],
      'beden': ['size', 'beden'],
      'numara': ['size', 'numara']
    };
    
    console.log('Normalize edilmiş arama kriterleri:',
               {primaryAttr: normalizedPrimaryAttr, primaryValue: normalizedPrimaryValue,
                secondaryAttr: normalizedSecondaryAttr, secondaryValue: normalizedSecondaryValue});
    
    // Debugging
    interface MatchResult {
      variantId: number;
      sku: string;
      attributes: Record<string, string>;
      primaryMatches: boolean;
      secondaryMatches: boolean;
      stock: number;
      active: boolean;
    }
    
    let matchResults: MatchResult[] = [];
    
    // Seçilen değerlere göre varyantı bul
    let filteredVariants = this.product.loadedVariants.filter(v => {
      let primaryMatches = false;
      let secondaryMatches = true; // İkincil özellik yoksa true kabul edelim
      
      // Debug için
      let matchResult: MatchResult = {
        variantId: v.id,
        sku: v.sku,
        attributes: v.attributes,
        primaryMatches: false,
        secondaryMatches: true,
        stock: v.stock,
        active: v.active
      };
      
      // Tüm attribute'lar üzerinde dolaşıp, büyük/küçük harf duyarsız eşleşme yapalım
      Object.entries(v.attributes).forEach(([key, value]) => {
        // Öznitelik anahtarı ve değeri küçük harfe çevir
        const normalizedKey = key.toLowerCase();
        const normalizedValue = String(value).toLowerCase();
        
        console.log(`Varyant ${v.id} için özellik kontrolü: ${key} = ${value}`);
        
        // Primary attribute eşleşmesi - Türkçe/İngilizce uyumluluğunu sağla
        const primaryMatchers = attributeTranslations[normalizedPrimaryAttr] || [normalizedPrimaryAttr];
        if (primaryMatchers.includes(normalizedKey) && normalizedValue === normalizedPrimaryValue) {
          primaryMatches = true;
          matchResult.primaryMatches = true;
          console.log(`  - Primary eşleşme bulundu: ${key} = ${value}`);
        }
        
        // Secondary attribute eşleşmesi (eğer varsa) - Türkçe/İngilizce uyumluluğunu sağla
        if (normalizedSecondaryAttr && normalizedSecondaryValue) {
          const secondaryMatchers = attributeTranslations[normalizedSecondaryAttr] || [normalizedSecondaryAttr];
          if (secondaryMatchers.includes(normalizedKey)) {
            secondaryMatches = (normalizedValue === normalizedSecondaryValue);
            matchResult.secondaryMatches = secondaryMatches;
            console.log(`  - Secondary kontrol: ${key} = ${value}, eşleşme: ${secondaryMatches}`);
          }
        }
      });
      
      // Her varyant için eşleşme sonuçlarını kaydet (debugging için)
      matchResults.push(matchResult);
      
      const overallMatch = primaryMatches && secondaryMatches;
      if (overallMatch) {
        console.log(`Eşleşen varyant bulundu! ID: ${v.id}, SKU: ${v.sku}`);
      }
      
      return overallMatch;
    });
    
    console.log('Eşleşme sonuçları (tüm varyantlar için):', matchResults);
    console.log('İlk filtrelenen varyantlar:', filteredVariants);
    
    // Stok ve aktiflik filtresi daha sonra yapılsın
    // Eğer hiç eşleşen varyant bulunamazsa, stok ve aktiflik kontrolünü atlayıp
    // sadece özellik eşleşmesi yapan ilk varyantı al
    if (filteredVariants.length === 0) {
      console.warn('Özellik eşleşmesi var, ancak stokta veya aktif değil');
      
      // Tekrar filtrele, bu sefer stok ve aktiflik kontrolü yapma
      filteredVariants = this.product.loadedVariants.filter(v => {
        let primaryMatches = false;
        let secondaryMatches = true;
        
        Object.entries(v.attributes).forEach(([key, value]) => {
          const normalizedKey = key.toLowerCase();
          const normalizedValue = String(value).toLowerCase();
          
          // Primary attribute eşleşmesi - Türkçe/İngilizce uyumluluğunu sağla
          const primaryMatchers = attributeTranslations[normalizedPrimaryAttr] || [normalizedPrimaryAttr];
          if (primaryMatchers.includes(normalizedKey) && normalizedValue === normalizedPrimaryValue) {
            primaryMatches = true;
          }
          
          // Secondary attribute eşleşmesi (eğer varsa) - Türkçe/İngilizce uyumluluğunu sağla
          if (normalizedSecondaryAttr && normalizedSecondaryValue) {
            const secondaryMatchers = attributeTranslations[normalizedSecondaryAttr] || [normalizedSecondaryAttr];
            if (secondaryMatchers.includes(normalizedKey)) {
              secondaryMatches = (normalizedValue === normalizedSecondaryValue);
            }
          }
        });
        
        return primaryMatches && secondaryMatches;
      });
      
      console.log('Stok/aktiflik kontrolü olmadan filtrelenen varyantlar:', filteredVariants);
    }
    
    // Stok ve aktiflik kontrolü olan varyantları filtrele
    const availableVariants = filteredVariants.filter(v => v.stock > 0 && v.active);
    console.log('Stokta olan ve aktif varyantlar:', availableVariants);
    
    if (availableVariants.length > 0) {
      this.selectedVariant = availableVariants[0];
      this.quantity = 1; // Yeni varyant seçildiğinde miktarı sıfırla
      
      // Renk ve beden durumunu güncelle
      this.updateColorAndSizeFromVariant(this.selectedVariant);
      
      // Varyant görsellerini güncelle
      this.updateVariantImages(this.selectedVariant);
      
      console.log('Seçilen varyant:', this.selectedVariant);
    } else if (filteredVariants.length > 0) {
      // Stokta olmayan veya aktif olmayan bir varyant seçilmiş
      this.selectedVariant = filteredVariants[0];
      this.updateVariantImages(this.selectedVariant);
      console.warn('Seçilen varyant stokta yok veya aktif değil:', this.selectedVariant);
    } else {
      console.warn('Eşleşen varyant bulunamadı');
      this.selectedVariant = null;
      // Varyant bulunamadığında, ürünün ana görselini kullan
      this.currentVariantImages = [];
      this.selectedImage = null;
    }
    
    // Sepete eklenebilirlik durumunu güncelle
    this.updateCanAddToCartState();
  }
  
  // Varyant bilgisine göre renk ve beden bilgisini güncelle
  private updateColorAndSizeFromVariant(variant: ProductVariant): void {
    if (!this.variantConfig) return;
    
    const primaryAttr = this.variantConfig.primaryAttr;
    const secondaryAttr = this.variantConfig.secondaryAttr;
    
    // Renk bilgisini güncelle
    if (primaryAttr === 'Renk' && variant.attributes['Renk']) {
      const colorName = variant.attributes['Renk'];
      const color = this.availableColors.find(c => c.name === colorName);
      if (color) {
        this.selectedColor = color;
      }
    }
    
    // Beden bilgisini güncelle
    if (secondaryAttr && variant.attributes[secondaryAttr]) {
      const sizeName = variant.attributes[secondaryAttr];
      const size = this.availableSizes.find(s => s.name === sizeName);
      if (size) {
        this.selectedSize = size;
      }
    }
  }
  
  /**
   * Renk ve beden listelerini güncelle
   */
  private updateColorAndSizeLists(): void {
    console.log('Renk ve beden listeleri güncelleniyor...');
    
    // Varyant konfigürasyonu yoksa erken çık
    if (!this.variantConfig) {
      console.error('Varyant konfigürasyonu bulunamadı');
      return;
    }
    
    // Elektronik veya ses ürünleri için elektronik flag'ini güncelle
    const category = this.product?.category ? this.normalizeCategoryName(this.product.category) : '';
    this.isElectronicOrPhone = category === 'elektronik' || 
                              category === 'telefon' ||
                              category === 'bilgisayar' ||
                              category.includes('ses') ||
                              category.includes('kulak') ||
                              category.includes('fare') ||
                              category.includes('mouse') ||
                              this.checkCategoryInList(category, this.capacityRequiredCategories) ||
                              this.checkCategoryInList(category, this.colorOnlyCategories);
    
    console.log('Kategori:', category);
    console.log('Varyant config:', this.variantConfig);
    console.log('Elektronik veya elektronik ürün mü:', this.isElectronicOrPhone);
    console.log('Tüm mevcut varyant özellikleri:', Array.from(this.availableVariants.keys()));
    
    // RESET - Başlangıçta seçimleri sıfırla
    this.availableColors = [];
    this.availableSizes = [];
    this.selectedColor = null;
    this.selectedSize = null;
    
    // Elektronik cihazların öncelikle Kapasite (primaryAttr) göstermesi gerekiyor
    if (this.isElectronicOrPhone) {
      console.log('Elektronik/Telefon/Bilgisayar ürünü için kapasite seçenekleri hazırlanıyor');
      
      // Kapasite (Ana Özellik) seçeneklerini yükle
      if (this.availableVariants.has('Kapasite')) {
        this.availableSizes = this.availableVariants.get('Kapasite')!;
        console.log('Kapasite listesi yüklendi:', this.availableSizes);
        
        // İlk kapasiteyi otomatik seç
        if (this.availableSizes.length > 0) {
          console.log('İlk kapasite seçiliyor:', this.availableSizes[0]);
          this.selectVariantOption('Kapasite', this.availableSizes[0]);
          this.selectedSize = this.availableSizes[0];
        }
      } else {
        console.warn('Kapasite seçenekleri bulunamadı, alternatif arıyorum...');
        
        // İngilizce "Storage" kelimesi kontrolü
        if (this.availableVariants.has('Storage')) {
          console.log('Storage bulundu, Kapasite yerine kullanılıyor');
          this.availableSizes = this.availableVariants.get('Storage')!;
          
          if (this.availableSizes.length > 0) {
            console.log('İlk storage seçiliyor:', this.availableSizes[0]);
            this.selectVariantOption('Storage', this.availableSizes[0]);
            this.selectedSize = this.availableSizes[0];
          }
        }
      }
      
      // Sonra Renk (İkincil Özellik) seçeneklerini yükle
      if (this.availableVariants.has('Renk')) {
        this.availableColors = this.availableVariants.get('Renk')!;
        this.processColorOptions(this.availableColors);
      } else if (this.availableVariants.has('Color')) {
        console.log('Color bulundu, Renk yerine kullanılıyor');
        this.availableColors = this.availableVariants.get('Color')!;
        this.processColorOptions(this.availableColors);
      }
    } 
    // Giyim, ayakkabı vb. diğer kategoriler için
    else {
      console.log('Giyim/Ayakkabı tarzı ürün için renk ve beden seçenekleri hazırlanıyor');
      
      // Renk listesini güncelle (Ana Özellik)
      if (this.availableVariants.has('Renk')) {
        this.availableColors = this.availableVariants.get('Renk')!;
        this.processColorOptions(this.availableColors);
        
        // İlk rengi otomatik seç
        if (this.availableColors.length > 0 && !this.selectedColor) {
          console.log('İlk renk seçiliyor:', this.availableColors[0]);
          this.selectColor(this.availableColors[0]);
        }
      }
      
      // Beden/Numara listesini güncelle (İkincil Özellik)
      const sizeAttr = this.variantConfig.secondaryAttr;
      if (sizeAttr && this.availableVariants.has(sizeAttr)) {
        this.availableSizes = this.availableVariants.get(sizeAttr)!;
        console.log(`${sizeAttr} listesi yüklendi:`, this.availableSizes);
        
        // İlk bedeni otomatik seç
        if (this.availableSizes.length > 0 && !this.selectedSize) {
          console.log(`İlk beden seçiliyor: ${this.availableSizes[0].name}`);
          this.selectSize(this.availableSizes[0]);
        }
      }
    }
    
    console.log('Güncellenmiş seçenekler: Renkler=', this.availableColors, 'Kapasite/Beden=', this.availableSizes);
  }
  
  // Renk seçeneklerini işle 
  private processColorOptions(colors: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}[]): void {
    // Renk kodlarını kontrol et, yoksa ekle
    colors.forEach(color => {
      if (!color.code) {
        color.code = this.getColorCodeFromName(color.name);
        console.log(`Renk kodu eksik, oluşturuldu: ${color.name} -> ${color.code}`);
      }
    });
    
    console.log('Renk listesi işlendi:', colors);
  }
  
  // Renk seçimi
  selectColor(color: {id: number, name: string, code?: string, imageUrl?: string, available: boolean}): void {
    console.log('Renk seçildi:', color);
    
    // Renk kodu yoksa ekle
    if (!color.code) {
      color.code = this.getColorCodeFromName(color.name);
      console.log(`Renk kodu bulunamadı, oluşturuldu: ${color.name} -> ${color.code}`);
    }
    
    this.selectedColor = color;
    
    // Elektronik/telefon dışındaki ürünlerde renk genelde primaryAttr olarak kullanılır
    // Giyim, ayakkabı, mobilya gibi kategorilerde
    if (this.variantConfig) {
      if (this.variantConfig.primaryAttr === 'Renk') {
        console.log('Renk ana özellik - ikincil seçenekler güncellenecek');
        this.selectVariantOption('Renk', color);
        console.log('Renk değişimi sonrası mevcut bedenler:', this.availableSizes);
        
        // Mobilya için özel işlem - renk değiştiğinde malzeme seçeneklerini güncelle
        if (this.variantConfig.secondaryAttr === 'Boyut' && this.availableVariants.has('Malzeme')) {
          this.updateMaterialOptionsForSelectedColor(color.name);
        }
      } 
      else if (this.variantConfig.secondaryAttr === 'Renk') {
        console.log('Renk ikincil özellik - varyant güncelleniyor');
        this.selectVariantOption('Renk', color);
      } else {
        console.warn('Renk, ana veya ikincil özellik değil, bu beklenmeyen bir durum. Varyant konfig:', this.variantConfig);
      }
    } else {
      console.warn('Varyant konfigürasyonu bulunamadı');
    }
    
    // Ek kontrol - updateSelectedVariant zaten çağrılıyor olmalı, ama emin olalım
    if (!this.selectedVariant) {
      console.log('Renk seçimi sonrası selectedVariant null, manuel olarak güncelleniyor');
      this.updateSelectedVariant();
    }
  }
  
  // Seçilen renge göre malzeme seçeneklerini güncelle (Mobilya için)
  private updateMaterialOptionsForSelectedColor(colorName: string): void {
    if (!this.product?.loadedVariants) return;
    
    console.log(`Seçilen renk için malzeme seçenekleri güncelleniyor: ${colorName}`);
    
    // Seçilen renge sahip varyantları filtrele
    const variantsWithSelectedColor = this.product.loadedVariants.filter(variant => {
      return Object.entries(variant.attributes).some(([key, value]) => 
        key === 'Renk' && value === colorName
      );
    });
    
    console.log(`Seçilen renk için varyantlar:`, variantsWithSelectedColor);
    
    // Bu renkteki varyantlardan malzeme seçeneklerini çıkar
    const availableMaterials = new Set<string>();
    variantsWithSelectedColor.forEach(variant => {
      if (variant.attributes['Malzeme']) {
        availableMaterials.add(variant.attributes['Malzeme']);
      }
    });
    
    console.log(`Seçilen renk için mevcut malzemeler:`, Array.from(availableMaterials));
    
    // Malzeme seçeneklerini oluştur
    const materialOptions: {id: number, name: string, available: boolean}[] = [];
    Array.from(availableMaterials).forEach((material, index) => {
      const variant = variantsWithSelectedColor.find(v => v.attributes['Malzeme'] === material);
      materialOptions.push({
        id: index,
        name: material,
        available: variant ? (variant.stock > 0 && variant.active) : false
      });
    });
    
    // Mevcut malzeme seçeneklerini güncelle
    this.availableVariants.set('Malzeme', materialOptions);
    
    // Önceki malzeme seçimi bu renk için geçerli mi kontrol et
    const currentMaterialSelection = this.selectedVariants.get('Malzeme');
    const isMaterialStillValid = currentMaterialSelection && 
                               materialOptions.some(m => m.name === currentMaterialSelection.name);
    
    if (!isMaterialStillValid && materialOptions.length > 0) {
      // Mevcut seçim geçerli değilse, ilk malzemeyi seç
      console.log(`Önceki malzeme seçimi geçerli değil, ilk malzeme seçiliyor: ${materialOptions[0].name}`);
      this.selectVariantOption('Malzeme', materialOptions[0]);
    }
  }
  
  // Beden seçimi
  selectSize(size: {id: number, name: string, available: boolean}): void {
    console.log('DÜZELTME SONRASI: Beden/Numara/Kapasite seçildi:', size);
    
    this.selectedSize = size;
    
    // Varyant konfigürasyonu kontrolü
    if (!this.variantConfig) {
      console.warn('DÜZELTME: Varyant konfigürasyonu bulunamadı');
      return;
    }
    
    console.log('DÜZELTME: Varyant konfigürasyonu:', this.variantConfig);
    
    // Elektronik veya Telefon ürünleri için
    const isElectronicOrPhone = 
      this.product?.category === 'elektronik' || 
      this.product?.category === 'telefon' || 
      (typeof this.product?.category === 'object' && 
      ((this.product.category as any).name === 'Elektronik' || 
        (this.product.category as any).name === 'Telefon'));
    
    console.log('DÜZELTME: Elektronik/Telefon ürünü mü?', isElectronicOrPhone);
    
    // Elektronik cihazlar için (telefonlar, tabletler vs)
    if (this.variantConfig.primaryAttr === 'Kapasite') {
      console.log('DÜZELTME: Kapasite için seçim yapılıyor');
      this.selectVariantOption('Kapasite', size);
      return;
    }
    
    // Ayakkabı için numara
    if (this.variantConfig.secondaryAttr === 'Numara') {
      console.log('DÜZELTME: Ayakkabı için numara seçiliyor');
      this.selectVariantOption('Numara', size);
      return;
    }
    
    // Giyim için beden
    if (this.variantConfig.secondaryAttr === 'Beden') {
      console.log('DÜZELTME: Giyim için beden seçiliyor');
      this.selectVariantOption('Beden', size);
      return;
    }
    
    // Mobilya için boyut
    if (this.variantConfig.secondaryAttr === 'Boyut') {
      console.log('DÜZELTME: Mobilya için boyut seçiliyor');
      this.selectVariantOption('Boyut', size);
      return;
    }
    
    // Tek varyantlı ürünler için
    if (!this.variantConfig.secondaryAttr) {
      console.log(`DÜZELTME: Tek varyantlı ürün için ${this.variantConfig.primaryAttr} seçiliyor`);
      this.selectVariantOption(this.variantConfig.primaryAttr, size);
      return;
    }
    
    // Diğer durumlar için varsayılan olarak secundaryAttr kullan
    console.log(`DÜZELTME: Diğer durumlar için varsayılan olarak ${this.variantConfig.secondaryAttr} seçiliyor`);
    this.selectVariantOption(this.variantConfig.secondaryAttr, size);
    
    // Seçim bilgisini log'la
    console.log(`DÜZELTME: ${isElectronicOrPhone ? 'Kapasite' : 'Beden/Numara'} seçimi yapıldı:`, this.selectedSize);
    console.log('DÜZELTME: Seçilen varyantlar:', this.selectedVariants);
  }
  
  // Varyant seçeneği mevcut mu kontrolü
  isVariantOptionAvailable(attrName: string, option: {id: number, name: string, available: boolean}): boolean {
    return option.available;
  }
  
  // Varyant seçeneği seçili mi kontrolü 
  isVariantOptionSelected(attrName: string, option: {id: number, name: string, available: boolean}): boolean {
    return this.selectedVariants.get(attrName)?.id === option.id;
  }
  
  // Renk kodu tahmini (gerçek uygulamalarda bu veri backend'den gelir)
  private getColorCodeFromName(colorName: string): string {
    if (!colorName) return '#CCCCCC';
    
    // Renk isimlerini büyük harfe çevir ve standardize et
    const normalizedColorName = colorName.toUpperCase();
    
    // Renk İngilizce/Türkçe eşleşmeleri
    const colorMap: Record<string, string> = {
      // İngilizce renk adları
      'BLACK': '#000000',
      'WHITE': '#FFFFFF',
      'RED': '#FF0000',
      'BLUE': '#0000FF',
      'GREEN': '#00AA00',
      'YELLOW': '#FFFF00',
      'PURPLE': '#800080',
      'ORANGE': '#FF8C00',
      'PINK': '#FFC0CB',
      'GRAY': '#808080',
      'GREY': '#808080',
      'BROWN': '#8B4513',
      'NAVY': '#000080',
      'NAVY BLUE': '#000080',
      'BEIGE': '#F5F5DC',
      'GOLD': '#FFD700',
      'SILVER': '#C0C0C0',
      'CREAM': '#FFFDD0',
      'BURGUNDY': '#800000',
      'KHAKI': '#BDB76B',
      'TURQUOISE': '#40E0D0',
      'INDIGO': '#4B0082',
      'CORAL': '#FF7F50',
      'OLIVE': '#6B8E23',
      'FUCHSIA': '#FF00FF',
      'MAGENTA': '#FF00FF',
      'LAVENDER': '#C883C8',
      'LIGHT BLUE': '#ADD8E6',
      'DARK GREEN': '#006400',
      'LIGHT GREEN': '#90EE90',
      'DARK GRAY': '#696969',
      'LIGHT GRAY': '#D3D3D3',
      'DARK RED': '#8B0000',
      'COPPER': '#B87333',
      'LIGHT PINK': '#FFB6C1',
      'DARK PINK': '#FF1493',
      'MAROON': '#800000',
      'SKY BLUE': '#6495ED',
      'PETROL BLUE': '#2E5894',
      'MUSTARD': '#FFDB58',
      'CARAMEL': '#D2691E',
      'CHAMPAGNE': '#F7E7CE',
      'BRONZE': '#CD7F32',
      'POWDER': '#F5CCB0',
      'MINT': '#98FB98',
      'LEMON': '#FFFF66',
      'SALMON': '#FA8072',
      'MIDNIGHT BLUE': '#191970',
      'WOOD': '#DEB887',
      
      // Türkçe renk adları
      'SİYAH': '#000000',
      'BEYAZ': '#FFFFFF',
      'KIRMIZI': '#FF0000',
      'MAVİ': '#0000FF',
      'YEŞİL': '#00AA00',
      'SARI': '#FFFF00',
      'MOR': '#800080',
      'TURUNCU': '#FF8C00',
      'PEMBE': '#FFC0CB',
      'GRİ': '#808080',
      'KAHVERENGİ': '#8B4513',
      'LACİVERT': '#000080',
      'BEJ': '#F5F5DC',
      'ALTIN': '#FFD700',
      'GÜMÜŞ': '#C0C0C0',
      'KREM': '#FFFDD0',
      'BORDO': '#800000',
      'HAKİ': '#BDB76B',
      'TURKUAZ': '#40E0D0',
      'İNDİGO': '#4B0082',
      'MERCAN': '#FF7F50',
      'ZEYTİN YEŞİLİ': '#6B8E23',
      'FUŞYA': '#FF00FF',
      'EFLATUN': '#9370DB',
      'AÇIK MAVİ': '#ADD8E6',
      'KOYU YEŞİL': '#006400',
      'AÇIK YEŞİL': '#90EE90',
      'LİLA': '#C883C8',
      'KOYU GRİ': '#696969',
      'AÇIK GRİ': '#D3D3D3',
      'KOYU KIRMIZI': '#8B0000',
      'BAKIR': '#B87333',
      'AÇIK PEMBE': '#FFB6C1',
      'KOYU PEMBE': '#FF1493',
      'MENEKŞE': '#C71585',
      'GÖK MAVİSİ': '#6495ED',
      'PETROL MAVİSİ': '#2E5894',
      'HARDAL': '#FFDB58',
      'KARAMEL': '#D2691E',
      'NEFTİ': '#556B2F',
      'ŞAMPANYA': '#F7E7CE',
      'BRONZ': '#CD7F32',
      'PUDRA': '#F5CCB0',
      'MİNT YEŞİLİ': '#98FB98',
      'LİMON SARISI': '#FFFF66',
      'SOMON': '#FA8072',
      'GECE MAVİSİ': '#191970',
      'AHŞAP': '#DEB887'
    };
    
    // Doğrudan renk kodunu kontrol et
    if (normalizedColorName.startsWith('#') && normalizedColorName.length === 7) {
      return normalizedColorName;
    }
    
    // Renk kodunu bul
    return colorMap[normalizedColorName] || '#CCCCCC';
  }
  
  // Ürün resmini al
  getProductImage(): string {
    // First check if there's a selected image
    if (this.selectedImage) {
      return this.selectedImage;
    }
    
    // Then check if selected variant has images
    if (this.selectedVariant && this.selectedVariant.imageUrls && this.selectedVariant.imageUrls.length > 0) {
      return this.adjustImageUrl(this.selectedVariant.imageUrls[0]) || '';
    }
    
    // Fallback to product default image
    return this.adjustImageUrl(this.product?.imageUrl) || 'assets/images/placeholder.jpg';
  }
  
  // Varyant özellik adını format
  formatVariantLabel(attrName: string): string {
    return attrName;
  }
  
  // Ana varyant seçeneği için stil belirle (renk gösterimi için)
  getPrimaryOptionStyle(option: {id: number, name: string, code?: string}): any {
    if (this.variantConfig?.showColorPicker && option.code) {
      return { 'background-color': option.code };
    }
    return {};
  }
  
  // Ürün stok durumu
  getStockStatus(): {status: 'in-stock' | 'low-stock' | 'out-of-stock', quantity: number} {
    const stock = this.selectedVariant ? this.selectedVariant.stock : (this.product?.stock || 0);
    
    if (stock <= 0) {
      return {status: 'out-of-stock', quantity: 0};
    } else if (stock < 5) {
      return {status: 'low-stock', quantity: stock};
    } else {
      return {status: 'in-stock', quantity: stock};
    }
  }
  
  // Ürün fiyatı
  getProductPrice(): number {
    if (this.selectedVariant) {
      return this.selectedVariant.salePrice || this.selectedVariant.price;
    } else if (this.product) {
      return this.product.price;
    }
    return 0;
  }
  
  // İndirimli fiyatı
  getOriginalPrice(): number | undefined {
    if (this.selectedVariant && this.selectedVariant.salePrice) {
      return this.selectedVariant.price;
    } else if (this.product && this.product.discount) {
      return this.product.discountedPrice;
    }
    return undefined;
  }
  
  // Varsayılan seçimleri ayarla
  private setDefaultSelections(): void {
    if (!this.product?.attributes) return;
    
    // Her özellik için stokta olan ilk değeri seç
    this.product.attributes.forEach(attribute => {
      const inStockValue = attribute.values.find(value => value.inStock);
      if (inStockValue) {
        this.selectedAttributes.set(attribute.id, inStockValue);
      }
    });
  }

  // Özellik değeri seçimi
  selectAttributeValue(attribute: ProductAttribute, value: AttributeValue): void {
    if (!value.inStock) return; // Stokta yoksa seçime izin verme
    
    this.selectedAttributes.set(attribute.id, value);
    
    // Gerekirse fiyat ayarlaması yap
    if (value.priceAdjustment) {
      // Burada fiyat ayarlaması işlemleri yapılabilir
      console.log(`Fiyat ayarlaması: ${value.priceAdjustment}`);
    }
  }
  
  // Seçili değerin bilgisini al
  getSelectedValue(attribute: ProductAttribute): AttributeValue | undefined {
    return this.selectedAttributes.get(attribute.id);
  }
  
  // Seçili değerin adını al
  getSelectedValueName(attribute: ProductAttribute): string {
    const selected = this.selectedAttributes.get(attribute.id);
    return selected ? selected.displayText : '';
  }
  
  // Değer seçili mi?
  isValueSelected(attribute: ProductAttribute, value: AttributeValue): boolean {
    const selected = this.selectedAttributes.get(attribute.id);
    return selected ? selected.id === value.id : false;
  }
  
  // Ürün için stok kontrolü
  hasSelectedAllAttributes(): boolean {
    if (!this.product?.attributes) return true;
    
    // Tüm özelliklerin bir değeri seçilmiş mi kontrol et
    return this.product.attributes.every(attr => 
      this.selectedAttributes.has(attr.id)
    );
  }

  // Renk özellikleri için renk kodunu al
  getColorCode(value: AttributeValue): string {
    return value.colorCode || '#CCCCCC';
  }
  
  // Beden rehberini aç
  openSizeGuide(): void {
    // Burada bir dialog açılabilir
    this.snackBar.open('Beden rehberi açılıyor...', 'Tamam', {
      duration: 2000,
    });
    // Gerçek uygulamada MatDialog ile beden rehberi açılabilir
  }

  addToCart(): void {
    if (this.product) {
      // Ürün resmi üzerinde animasyon efekti
      this.cartAnimationState = 'added';
      setTimeout(() => this.cartAnimationState = 'initial', 300);
      
      // Eğer seçili bir varyant varsa onu kullan, yoksa normal ürünü ekle
      if (this.selectedVariant) {
        console.log('Seçilen varyant:', this.selectedVariant);
        console.log('Seçilen varyantlar Map:', this.selectedVariants);
        
        // Seçilen varyant özelliklerini logla
        Object.entries(this.selectedVariant.attributes).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        
        console.log('Seçilen varyant:', this.selectedVariant);
        console.log('Sepete eklenebilir mi:', this.canAddToCart());
        console.log('Varyant seçimi sonrası durum:', {
          selectedVariants: this.selectedVariants, 
          selectedVariant: this.selectedVariant, 
          canAddToCart: this.canAddToCart()
        });
        
        // Doğru şekilde: ürünü ana ürün olarak, varyantı ayrıca gönder
        this.cartService.addToCart(this.product, this.quantity, this.selectedVariant);
      } else {
        // Seçilen özellikleri sepete eklenecek ürüne dahil et
        const selectedOptions: Record<string, string> = {};
        
        this.selectedAttributes.forEach((value, key) => {
          // Özellik adını bul
          const attribute = this.product!.attributes?.find(attr => attr.id === key);
          if (attribute) {
            selectedOptions[attribute.name] = value.displayText;
          }
        });
        
        // Varyant olmayan ürünü ekle
        this.cartService.addToCart(this.product, this.quantity);
        this.lastAddedItem = this.product;
      }
      
      // Ürün resmi animasyonu
      if (this.productImageEl) {
        const img = this.productImageEl.nativeElement;
        this.renderer.addClass(img, 'added-to-cart-animation');
        setTimeout(() => {
          this.renderer.removeClass(img, 'added-to-cart-animation');
        }, 1000);
      }
      
      // Sepet bildirimi göster
      this.showCartNotification = true;
      setTimeout(() => {
        this.showCartNotification = false;
      }, 5000);  // 5 saniye sonra bildirim kaybolur
    }
  }

  toggleFavorite(): void {
    if (this.product) {
      if (this.isInFavorites) {
        this.favoriteService.removeFromFavorites(this.product.id);
        this.isInFavorites = false;
        this.snackBar.open('Ürün favorilerden çıkarıldı', 'Tamam', {
          duration: 2000,
        });
      } else {
        this.favoriteService.addToFavorites(this.product);
        this.isInFavorites = true;
        this.snackBar.open('Ürün favorilere eklendi', 'Tamam', {
          duration: 2000,
        });
      }
    }
  }

  incrementQuantity(): void {
    // Eğer seçili bir varyant varsa onun stok miktarını kontrol et
    const maxStock = this.selectedVariant ? this.selectedVariant.stock : (this.product?.stock || 0);
    
    if (this.quantity < maxStock) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  goBack(): void {
    this.location.back();
  }

  // Benzer ürünleri yükle
  private loadSimilarProducts(productId: number): void {
    this.similarProductsLoading = true;
    this.productService.getSimilarProducts(productId, 4).subscribe({
      next: (products) => {
        this.similarProducts = products;
        this.similarProductsLoading = false;
      },
      error: (error) => {
        console.error('Benzer ürünler yüklenirken hata:', error);
        this.similarProductsLoading = false;
      }
    });
  }

  // Sepet bildirimini kapat
  closeCartNotification(): void {
    this.showCartNotification = false;
  }
  
  // Sepete git
  goToCart(): void {
    this.closeCartNotification();
    this.router.navigate(['/cart']);
  }

  // Değerlendirmeleri göster/gizle
  toggleReviews(): void {
    if (this.product) {
      this.dialog.open(ProductReviewsComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'reviews-dialog',
        data: { productId: this.product.id }
      });
    }
  }

  // Sepete eklenebilir durumunu güncelle
  private updateCanAddToCartState(): void {
    // canAddToCart işlevinin mevcut mantığını kullan
    if (this.variantConfig) {
      if (this.variantConfig.secondaryAttr) {
        const primarySelected = this.selectedVariants.has(this.variantConfig.primaryAttr);
        const secondarySelected = this.selectedVariants.has(this.variantConfig.secondaryAttr);
        
        if (!primarySelected || !secondarySelected) {
          this._canAddToCart = false;
          return;
        }
      } else {
        // Tek varyantlı ürünler için (kitap gibi)
        const primarySelected = this.selectedVariants.has(this.variantConfig.primaryAttr);
        
        if (!primarySelected) {
          this._canAddToCart = false;
          return;
        }
      }
    }
    
    if (this.selectedVariant) {
      this._canAddToCart = this.selectedVariant.stock > 0 && this.selectedVariant.active;
      return;
    }
    
    this._canAddToCart = this.product?.stock ? this.product.stock > 0 : false;
  }
  
  // Sepete eklenebilir mi?
  canAddToCart(): boolean {
    return this._canAddToCart;
  }
  
  /**
   * Mevcut tüm varyant özelliklerinin adlarını döndürür
   */
  getAvailableAttributeNames(): string[] {
    return Array.from(this.availableVariants.keys());
  }
  
  /**
   * Varyantların işlenip işlenmediğini kontrol eder
   */
  hasProcessedVariants(): boolean {
    return this.availableVariants.size > 0 && 
           (this.availableVariants.has('Renk') || this.availableVariants.has('Kapasite') || 
            this.availableVariants.has('Malzeme') || this.availableVariants.has('Boyut'));
  }
  
  /**
   * Resim URL'sini düzeltir. Backend'den gelen URL'leri uygun formata çevirir.
   * Eğer URL http://localhost:8080 ile başlıyorsa, bunu kaldırır ve göreli URL'e dönüştürür
   */
  adjustImageUrl(url: string | undefined | null): string | null {
    if (!url) return null;
    
    // Backend'den gelen URL'leri düzelt
    if (url.startsWith('http://localhost:8080')) {
      // URL'yi olduğu gibi kullan
      return url;
    }
    
    return url;
  }

  // Belirli bir görseli seç
  selectImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
    // Update current image index for proper navigation
    this.currentImageIndex = this.currentVariantImages.findIndex(img => img === imageUrl);
    if (this.currentImageIndex < 0) this.currentImageIndex = 0;
  }

  // Navigate to previous image
  previousImage(): void {
    if (!this.currentVariantImages || this.currentVariantImages.length <= 1) return;
    
    this.currentImageIndex = (this.currentImageIndex - 1 + this.currentVariantImages.length) % this.currentVariantImages.length;
    this.selectedImage = this.currentVariantImages[this.currentImageIndex];
  }

  // Navigate to next image
  nextImage(): void {
    if (!this.currentVariantImages || this.currentVariantImages.length <= 1) return;
    
    this.currentImageIndex = (this.currentImageIndex + 1) % this.currentVariantImages.length;
    this.selectedImage = this.currentVariantImages[this.currentImageIndex];
  }

  // Open full-screen image viewer
  openImageViewer(): void {
    // This will be implemented with a dialog in a future enhancement
    console.log('Opening image viewer for:', this.selectedImage);
    this.snackBar.open('Görsel görüntüleyici açılıyor...', 'Tamam', {
      duration: 2000,
    });
  }

  // Varyant görsellerini güncelle
  private updateVariantImages(variant: ProductVariant | null): void {
    if (!variant || !variant.imageUrls || variant.imageUrls.length === 0) {
      // Varyant yoksa veya görselleri yoksa
      this.currentVariantImages = [];
      this.selectedImage = this.product?.imageUrl || null;
      this.currentImageIndex = 0;
      return;
    }

    // Varyant görsellerini set et
    this.currentVariantImages = variant.imageUrls.map(url => this.adjustImageUrl(url) || '');
    
    // İlk görseli seç
    if (this.currentVariantImages.length > 0) {
      this.selectedImage = this.currentVariantImages[0];
      this.currentImageIndex = 0;
    } else {
      this.selectedImage = null;
      this.currentImageIndex = 0;
    }
    
    console.log('Varyant görselleri güncellendi:', this.currentVariantImages);
  }
} 