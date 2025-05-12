import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormControl, AbstractControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryService } from '../../../services/category.service';
import { BrandService } from '../../../services/brand.service';
import { StoreService } from '../../../services/store.service';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css'],
  standalone: false
})
export class AddProductComponent implements OnInit {
  productForm!: FormGroup;
  categories: any[] = [];
  subCategories: any[] = [];
  thirdLevelCategories: any[] = [];
  brands: any[] = [];
  stores: any[] = [];
  isLoading = false;
  isSubmitting = false;
  selectedFiles: File[] = [];
  imagePreviewUrls: string[] = [];
  
  // Varyant ve özellikler için ek alanlar
  currentVariantIndex: number = -1;
  showAddAttributeForm = false;
  newAttributeKey = '';
  newAttributeValue = '';
  
  // Kategori temelli varyant özellikleri için
  categoryAttributes: any = {};
  availableAttributes: any[] = [];
  
  // Mevcut renkler
  availableColors = [
    { name: 'Siyah', code: '#000000' },
    { name: 'Beyaz', code: '#FFFFFF' },
    { name: 'Kırmızı', code: '#FF0000' },
    { name: 'Mavi', code: '#0000FF' },
    { name: 'Yeşil', code: '#00FF00' },
    { name: 'Sarı', code: '#FFFF00' },
    { name: 'Turuncu', code: '#FFA500' },
    { name: 'Mor', code: '#800080' },
    { name: 'Pembe', code: '#FFC0CB' },
    { name: 'Gri', code: '#808080' },
    { name: 'Kahverengi', code: '#A52A2A' },
    { name: 'Lacivert', code: '#000080' },
    { name: 'Turkuaz', code: '#40E0D0' },
    { name: 'Bej', code: '#F5F5DC' },
    { name: 'Gümüş', code: '#C0C0C0' },
    { name: 'Altın', code: '#FFD700' },
    { name: 'Bordo', code: '#800000' }
  ];
  
  // Mevcut beden seçenekleri
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  // Mevcut ayakkabı numaraları
  availableShoeNumbers = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
  
  // Mevcut kapasite seçenekleri
  availableCapacities = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

  // Boyut seçenekleri
  availableSizes2D = ['Tek Kişilik', 'Çift Kişilik', 'Küçük', 'Orta', 'Büyük', '4 Kişilik', '6 Kişilik', '8 Kişilik'];

  // Kapasite gerektiren elektronik ürün kategorileri
  capacityRequiredCategories: string[] = [
    'telefon', 'tablet', 'bilgisayar', 'laptop', 'masaustu', 
    'harddisk', 'ssd', 'flashbellek', 'hafizakarti', 'gaming',
    'gaminglaptop', 'notebook', 'computer', 'pc', 'ipad', 'tabletpc'
  ];
  
  // Renk, kapasite gerektirmeyen elektronik ürün kategorileri
  colorOnlyCategories: string[] = [
    'kulaklik', 'kulakustu', 'kulakici', 'kamera', 
    'hoparlor', 'bluetooth', 'klavye', 'mouse', 'fare', 
    'mikrofon', 'sarjcihazi', 'powerbank', 'modem', 'router',
    'sessistemi', 'sessistemleri', 'speaker', 'headphone', 'headphones',
    'kulaklık', 'mikrofonlu', 'gamingmouse', 'gamingklavye', 
    'mousepad', 'webcam', 'controller', 'gamepad', 'joystick',
    'oyuncu', 'gaming', 'gamer'
  ];

  // Telefon kategorisi için anahtar kelimeler
  telefonKategorileri: string[] = [
    'telefon', 'phone', 'cep telefonu', 'smartphone', 'akıllı telefon', 
    'cep', 'mobil cihaz', 'gsm', 'android', 'ios', 'iphone'
  ];

  // Bilgisayar kategorisi için anahtar kelimeler
  bilgisayarKategorileri: string[] = [
    'bilgisayar', 'laptop', 'pc', 'notebook', 'masaüstü', 'desktop',
    'gaming laptop', 'oyuncu bilgisayarı', 'ultrabook', 'all in one',
    'hepsi bir arada', 'mini pc', 'mac', 'macbook'
  ];

  // Tablet kategorisi için anahtar kelimeler
  tabletKategorileri: string[] = [
    'tablet', 'ipad', 'tabletpc', 'android tablet', 'ipad pro', 'ipad air', 
    'galaxy tab', 'tab', 'kindle', 'e-reader', 'e reader'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private brandService: BrandService,
    private storeService: StoreService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    // Dizileri başlat
    this.categories = [];
    this.subCategories = [];
    this.thirdLevelCategories = [];
    this.brands = [];
    this.stores = [];
    this.selectedFiles = [];
    this.imagePreviewUrls = [];
    this.availableAttributes = [];
    
    // Form başlat
    this.initForm();
    
    // Veri yükle
    this.loadCategories();
    this.loadBrands();
    this.loadStores();

    // URL'den storeId parametresini kontrol et
    this.route.params.subscribe(params => {
      if (params['storeId']) {
        const storeId = +params['storeId'];
        // Mağazalar yüklendikten sonra seçili mağazayı ayarla
        this.storeService.getMyStores()
          .subscribe(stores => {
            const selectedStore = stores.find(store => store.id === storeId);
            if (selectedStore) {
              this.productForm.patchValue({ store: storeId });
            }
          });
      }
    });
  }

  // Variants getter to access the variants FormArray
  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray || this.fb.array([]);
  }

  // Add getter for attributes form array
  get attributes(): FormArray {
    return this.productForm.get('attributes') as FormArray || this.fb.array([]);
  }

  initForm(): void {
    // Ensure null-safe access for the form
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      category: [null, Validators.required],
      subCategory: [null],
      thirdLevelCategory: [null],
      brand: [null],
      store: [null, Validators.required],
      stockQuantity: [0, [Validators.required, Validators.min(0)]],
      sku: [''],
      isActive: [true],
      isFeatured: [false],
      variants: this.fb.array([]), // Ensure it's an empty array
      attributes: this.fb.array([])
    });
  }

  // Kategorileri yükle
  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAllCategories()
      .pipe(
        catchError(error => {
          this.snackBar.open('Kategoriler yüklenirken hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Kategoriler yüklenirken hata:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(data => {
        // API'den gelen kategori yapısını kontrol et
        if (data && data.length > 0) {
          console.log('API kategori örneği:', data[0]);
        }
        
        // Sadece ana kategorileri filtrele (parent_id'si null olanlar)
        this.categories = data.filter(category =>  category.level === 1);
        console.log('Ana kategoriler yüklendi:', this.categories);
        
        // Kategori varyantlarını da yükle
        this.loadCategoryAttributes();
      });
  }

  // Markaları yükle
  loadBrands(): void {
    this.isLoading = true;
    this.brandService.getBrands()
      .pipe(
        catchError(error => {
          this.snackBar.open('Markalar yüklenirken hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Markalar yüklenirken hata:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        this.brands = response.items || response;
      });
  }

  // Mağazaları yükle
  loadStores(): void {
    this.isLoading = true;
    this.storeService.getMyStores()
      .pipe(
        catchError(error => {
          this.snackBar.open('Mağazalar yüklenirken hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Mağazalar yüklenirken hata:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(data => {
        this.stores = data;
      });
  }

  // Alt kategorileri yükle
  loadSubCategories(categoryId: number): void {
    if (!categoryId) {
      this.subCategories = [];
      return;
    }

    this.isLoading = true;
    this.categoryService.getSubcategories(categoryId)
      .pipe(
        catchError(error => {
          this.snackBar.open('Alt kategoriler yüklenirken hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Alt kategoriler yüklenirken hata:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(data => {
        this.subCategories = data;
      });
  }

  // Kategori bazlı varyant özellikleri için
  loadCategoryAttributes(): void {
    // API çağrısı yerine, doğrudan varsayılan veriyi kullan
    this.categoryAttributes = this.getDefaultCategoryAttributes();
    console.log('Kategori varyant özellikleri yüklendi:', this.categoryAttributes);
    
    // Eğer kategori seçilmişse, ilgili varyant özelliklerini yükle
    const categoryId = this.productForm.get('category')?.value;
    if (categoryId) {
      this.loadAttributesForCategory(categoryId);
    }
  }

  // Varsayılan kategori varyant özellikleri
  getDefaultCategoryAttributes(): any {
    return {
      // Giyim kategorisi
      1: {
        name: "Giyim",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Beden", values: this.availableSizes, required: true, type: "select" }
        ]
      },
      // Ayakkabı kategorisi
      2: {
        name: "Ayakkabı",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Numara", values: this.availableShoeNumbers, required: true, type: "select" }
        ]
      },
      // Elektronik kategorisi
      3: {
        name: "Elektronik",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Kapasite", values: this.availableCapacities, required: false, type: "select" },
          { key: "Model", values: [], required: false, type: "text", freeText: true }
        ]
      },
      // Mobilya kategorisi
      4: {
        name: "Mobilya",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Boyut", values: this.availableSizes2D, required: false, type: "select" }
        ]
      },
      // Ev Tekstili
      5: {
        name: "Ev Tekstili",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Boyut", values: ["Tek Kişilik", "Çift Kişilik", "King Size"], required: false, type: "select" }
        ]
      },
      // Aksesuar
      6: {
        name: "Aksesuar",
        attributes: [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
          { key: "Boyut", values: ["Standart", "Mini", "Büyük"], required: false, type: "select" }
        ]
      },
      // Telefon kategorisi
      7: {
        name: "Telefon",
        attributes: [
          { key: "Kapasite", values: this.availableCapacities, required: true, type: "select" },
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
        ]
      },
      // Bilgisayar kategorisi
      8: {
        name: "Bilgisayar",
        attributes: [
          { key: "Kapasite", values: this.availableCapacities, required: true, type: "select" },
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }
        ]
      }
    };
  }

  // Kategori değiştiğinde alt kategorileri güncelle
  onCategoryChange(event: any): void {
    if (!event || !event.value) return;
    
    const categoryId = event.value;
    this.loadSubCategories(categoryId);
    this.productForm.patchValue({ subCategory: null });
    
    // Kategori değiştiğinde alt-alt kategoriyi de sıfırla
    this.thirdLevelCategories = [];
    this.productForm.patchValue({ thirdLevelCategory: null });
    
    // Kategori değiştiğinde ilgili varyant özelliklerini yükle
    this.loadAttributesForCategory(categoryId);
  }
  
  // Alt kategori değiştiğinde varyant özelliklerini güncelle
  onSubCategoryChange(event: any): void {
    if (!event || !event.value) return;
    
    const subCategoryId = event.value;
    // Alt kategori altındaki kategorileri yükle
    this.loadThirdLevelCategories(subCategoryId);
    this.productForm.patchValue({ thirdLevelCategory: null });
    
    // Alt kategori değiştiğinde ilgili varyant özelliklerini yükle
    const categoryId = this.productForm.get('category')?.value;
    if (categoryId) {
      console.log('Alt kategori değişti, varyant özellikleri güncelleniyor...');
      this.loadAttributesForCategory(categoryId);
    }
  }
  
  // Alt-alt kategori değiştiğinde varyant özelliklerini güncelle
  onThirdLevelCategoryChange(event: any): void {
    if (!event || !event.value) return;
    
    // Seçilen alt-alt kategori ID'si
    const thirdLevelCategoryId = event.value;
    console.log('Alt-alt kategori değişti, ID:', thirdLevelCategoryId);
    
    // Ana kategori ve alt kategori değerlerini al
    const categoryId = this.productForm.get('category')?.value;
    const subCategoryId = this.productForm.get('subCategory')?.value;
    
    if (categoryId && subCategoryId) {
      console.log('Alt-alt kategori değişti, varyant özellikleri güncelleniyor...');
      this.loadAttributesForCategory(categoryId, subCategoryId, thirdLevelCategoryId);
    }
  }
  
  // Alt-alt kategorileri yükle
  loadThirdLevelCategories(subCategoryId: number): void {
    if (!subCategoryId) {
      this.thirdLevelCategories = [];
      return;
    }

    this.isLoading = true;
    this.categoryService.getSubcategories(subCategoryId)
      .pipe(
        catchError(error => {
          this.snackBar.open('Alt-alt kategoriler yüklenirken hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Alt-alt kategoriler yüklenirken hata:', error);
          return [];
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(data => {
        this.thirdLevelCategories = data;
      });
  }

  // Kategori bazlı varyant özelliklerini yükle
  loadAttributesForCategory(categoryId: number, subCategoryId?: number, thirdLevelCategoryId?: number): void {
    // Önceki varyant özelliklerini temizle
    this.availableAttributes = [];
    
    // Kategori bilgisini al
    const categoryInfo = this.categories.find(c => c.id === categoryId);
    if (!categoryInfo) {
      console.error('Kategori bilgisi bulunamadı');
      return;
    }

    // Kategori adını normalize et
    const normalizedCategory = this.normalizeCategoryName(categoryInfo.name);
    console.log('Normalize edilmiş kategori: ', normalizedCategory);
    
    // Alt kategori bilgisini al (eğer seçilmişse)
    let subCategoryInfo = null;
    let normalizedSubCategory = '';
    
    if (subCategoryId) {
      subCategoryInfo = this.subCategories.find(sc => sc.id === subCategoryId);
      if (subCategoryInfo) {
        normalizedSubCategory = this.normalizeCategoryName(subCategoryInfo.name);
        console.log('Normalize edilmiş alt kategori: ', normalizedSubCategory);
      }
    }
    
    // Kategori sluglarını al (varsa)
    const categorySlug = categoryInfo.slug || '';
    const subCategorySlug = subCategoryInfo?.slug || '';
    
    console.log('Kategori slugları:', categorySlug, subCategorySlug);
    
    // Kategori tipi belirle
    let categoryType = "";
    let categoryAttributes = [];
    
    // Mobilya terimleri listesi
    const mobilyaTerms = ['mobilya', 'koltuk', 'masa', 'sandalye', 'yatak', 'dolap', 'gardrop', 'vitrin', 'konsol', 'sehpa'];
    
    // Ev Tekstili terimleri listesi
    const tekstilTerms = ['tekstil', 'nevresim', 'yorgan', 'yastık', 'çarşaf', 'perde', 'halı', 'kilim', 'battaniye'];
    
    // ** EV & YAŞAM / MOBİLYA KATEGORİSİ TESPİTİ **
    const isEvYasamCategory = 
      normalizedCategory === 'evyasam' || 
      categorySlug === 'ev-yasam' ||
      categoryInfo.name.includes('Ev') && categoryInfo.name.includes('Yaşam');
    
    // Mobilya alt kategorisi mi kontrol et
    const isMobilyaSubCategory = 
      mobilyaTerms.some(term => normalizedSubCategory.includes(term)) || 
      mobilyaTerms.some(term => subCategorySlug?.includes(term)) ||
      (subCategoryInfo && mobilyaTerms.some(term => subCategoryInfo.name.toLowerCase().includes(term)));
    
    if (isEvYasamCategory && isMobilyaSubCategory) {
      console.log('MOBİLYA ALT KATEGORİSİ TESPİT EDİLDİ');
      categoryType = "Mobilya";
      categoryAttributes = this.categoryAttributes[4]?.attributes || [
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
        { key: "Boyut", values: this.availableSizes2D, required: false, type: "select" }
      ];
      
      this.availableAttributes = [...categoryAttributes];
      console.log('Mobilya kategorisi için yüklenen varyant özellikleri:', this.availableAttributes);
      return;
    }
    
    // ** SPOR & OUTDOOR KATEGORİSİ KONTROLÜ **
    if (
      normalizedCategory === 'sporoutdoor' || 
      categorySlug === 'spor-outdoor' ||
      normalizedCategory.includes('spor') ||
      normalizedCategory.includes('fitness') ||
      categoryInfo.name.includes('Spor')
    ) {
      // Spor kategorisi için varsayılan olarak ayakkabı özelliklerini yükle
      console.log('SPOR KATEGORİSİ TESPİT EDİLDİ');
      categoryType = "Spor Ayakkabı";
      categoryAttributes = this.categoryAttributes[2]?.attributes || [
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
        { key: "Numara", values: this.availableShoeNumbers, required: true, type: "select" }
      ];
      
      this.availableAttributes = [...categoryAttributes];
      console.log('Spor ayakkabı için yüklenen varyant özellikleri:', this.availableAttributes);
      return;
    }
    
    // ** AYAKKABI KATEGORİSİ TESPİTİ **
    if (
      normalizedCategory === 'ayakkabi' || 
      normalizedSubCategory === 'ayakkabi' || 
      categorySlug === 'ayakkabi' || 
      subCategorySlug === 'ayakkabi' ||
      normalizedCategory.includes('ayakkabi') || 
      normalizedSubCategory.includes('ayakkabi') ||
      normalizedSubCategory.includes('spor ayakkabi') ||
      normalizedSubCategory.includes('kosu ayakkabi')
    ) {
      console.log('AYAKKABI KATEGORİSİ TESPİT EDİLDİ');
      categoryType = "Ayakkabı";
      categoryAttributes = this.categoryAttributes[2]?.attributes || [
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
        { key: "Numara", values: this.availableShoeNumbers, required: true, type: "select" }
      ];
      
      this.availableAttributes = [...categoryAttributes];
      console.log('Ayakkabı için yüklenen varyant özellikleri:', this.availableAttributes);
      return;
    }
    
    // ** TABLET KATEGORİSİ TESPİTİ **
    if (
      normalizedSubCategory === 'tablet' || 
      this.checkCategoryInList(normalizedSubCategory, this.tabletKategorileri) ||
      normalizedCategory === 'tablet' ||
      this.checkCategoryInList(normalizedCategory, this.tabletKategorileri) ||
      (subCategoryInfo && this.tabletKategorileri.some(term => subCategoryInfo.name.toLowerCase().includes(term)))
    ) {
      console.log('TABLET KATEGORİSİ TESPİT EDİLDİ');
      categoryType = "Tablet";
      categoryAttributes = [
        { key: "Kapasite", values: this.availableCapacities, required: true, type: "select" },
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }
      ];
      
      this.availableAttributes = [...categoryAttributes];
      console.log('Tablet kategorisi için yüklenen varyant özellikleri:', this.availableAttributes);
      return;
    }
    
    // Önce alt kategori kontrolü yap, telefon veya benzeri özel kategoriler varsa onları öncelikle belirle
    if (normalizedSubCategory === 'telefon' || 
        this.checkCategoryInList(normalizedSubCategory, this.telefonKategorileri) ||
        normalizedSubCategory.includes('phone') || 
        normalizedSubCategory.includes('smartphone')) {
      
      console.log('Telefon alt kategorisi tespit edildi');
      categoryType = "Telefon";
      categoryAttributes = this.categoryAttributes[7]?.attributes || [];
    }
    // Bilgisayar alt kategorisi kontrolü
    else if (normalizedSubCategory === 'bilgisayar' || 
             normalizedSubCategory.includes('laptop') || 
             normalizedSubCategory.includes('pc') ||
             this.checkCategoryInList(normalizedSubCategory, this.bilgisayarKategorileri)) {
      
      console.log('Bilgisayar alt kategorisi tespit edildi');
      categoryType = "Bilgisayar";
      categoryAttributes = this.categoryAttributes[8]?.attributes || [];
    }
    // Tablet alt kategorisi kontrolü
    else if (normalizedSubCategory === 'tablet' || 
             this.checkCategoryInList(normalizedSubCategory, this.tabletKategorileri)) {
      
      console.log('Tablet alt kategorisi tespit edildi');
      categoryType = "Tablet";
      categoryAttributes = [
        { key: "Kapasite", values: this.availableCapacities, required: true, type: "select" },
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }
      ];
    }
    // Mobilya alt kategorisi kontrolü
    else if (isMobilyaSubCategory) {
      console.log('Mobilya alt kategorisi tespit edildi');
      categoryType = "Mobilya";
      categoryAttributes = this.categoryAttributes[4]?.attributes || [];
    }
    // Tekstil alt kategorisi kontrolü
    else if (tekstilTerms.some(term => normalizedSubCategory.includes(term)) || 
             (subCategoryInfo && tekstilTerms.some(term => subCategoryInfo.name.toLowerCase().includes(term)))) {
      console.log('Ev Tekstili alt kategorisi tespit edildi');
      categoryType = "Ev Tekstili";
      categoryAttributes = this.categoryAttributes[5]?.attributes || [];
    }
    // Ana kategoriye göre belirleme
    else if (normalizedCategory === 'telefon' || this.checkCategoryInList(normalizedCategory, this.capacityRequiredCategories)) {
      categoryType = "Telefon";
      categoryAttributes = this.categoryAttributes[7]?.attributes || [];
    } 
    else if (normalizedCategory === 'bilgisayar' || normalizedCategory.includes('laptop') || normalizedCategory.includes('pc')) {
      categoryType = "Bilgisayar";
      categoryAttributes = this.categoryAttributes[8]?.attributes || [];
    }
    else if (normalizedCategory === 'elektronik' || this.checkCategoryInList(normalizedCategory, this.colorOnlyCategories)) {
      // Elektronik kategorisi seçildi, alt kategori kontrol et
      if (subCategoryInfo) {
        const subCatName = subCategoryInfo.name.toLowerCase();
        
        // Alt kategori telefon ile ilgiliyse
        if (subCatName.includes('telefon') || 
            subCatName.includes('phone') || 
            subCatName.includes('akıllı telefon') ||
            subCatName.includes('smartphone') ||
            subCatName.includes('cep telefon')) {
          
          console.log('Elektronik > Telefon alt kategorisi tespit edildi');
          categoryType = "Telefon";
          categoryAttributes = this.categoryAttributes[7]?.attributes || [];
        }
        // Alt kategori bilgisayar ile ilgiliyse
        else if (subCatName.includes('bilgisayar') || 
                 subCatName.includes('laptop') || 
                 subCatName.includes('pc') ||
                 subCatName.includes('notebook')) {
          
          console.log('Elektronik > Bilgisayar alt kategorisi tespit edildi');
          categoryType = "Bilgisayar";
          categoryAttributes = this.categoryAttributes[8]?.attributes || [];
        } 
        else {
          // Elektronik kategorisinin diğer alt kategorileri için sadece renk
          categoryType = "Elektronik";
          categoryAttributes = [
            { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }
          ];
        }
      } else {
        // Alt kategori seçilmemiş, sadece elektronik kategorisi için
        categoryType = "Elektronik";
        categoryAttributes = [
          { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }
        ];
      }
    }
    else if (normalizedCategory === 'ayakkabi') {
      categoryType = "Ayakkabı";
      categoryAttributes = this.categoryAttributes[2]?.attributes || [];
    }
    else if (normalizedCategory === 'giyim') {
      categoryType = "Giyim";
      categoryAttributes = this.categoryAttributes[1]?.attributes || [];
    }
    else if (normalizedCategory === 'mobilya' || mobilyaTerms.some(term => normalizedCategory.includes(term))) {
      categoryType = "Mobilya";
      categoryAttributes = this.categoryAttributes[4]?.attributes || [];
    }
    else if (normalizedCategory.includes('tekstil') || tekstilTerms.some(term => normalizedCategory.includes(term))) {
      categoryType = "Ev Tekstili";
      categoryAttributes = this.categoryAttributes[5]?.attributes || [];
    }
    else if (normalizedCategory.includes('aksesuar')) {
      categoryType = "Aksesuar";
      categoryAttributes = this.categoryAttributes[6]?.attributes || [];
    }
    else if (isEvYasamCategory) {
      // Ev Yaşam kategorisi için varsayılan olarak mobilya özelliklerini yükle
      console.log('EV YAŞAM KATEGORİSİ TESPİT EDİLDİ');
      categoryType = "Ev Yaşam";
      categoryAttributes = this.categoryAttributes[4]?.attributes || [
        { key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" },
        { key: "Boyut", values: this.availableSizes2D, required: false, type: "select" }
      ];
    }
    else {
      // Kategori tipi bilinmiyorsa veya varsayılan olarak
      categoryType = categoryInfo.name;
      categoryAttributes = this.categoryAttributes[categoryId]?.attributes || 
                          [{ key: "Renk", values: this.availableColors.map(c => c.name), required: true, type: "color" }];
    }
    
    console.log('Kategori tipi:', categoryType);
    this.availableAttributes = [...categoryAttributes];
    console.log('Kategori için varyant özellikleri:', this.availableAttributes);
    
    // Mevcut varyantları temizle
    while (this.variants && this.variants.length > 0) {
      this.variants.removeAt(0);
    }
  }
  
  // Kategorinin belirli bir listede olup olmadığını kontrol et
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
    
    // Türkçe karakterleri ingilizce karakterlere çevir
    const turkishMap: Record<string, string> = {
      'ç': 'c', 'Ç': 'C',
      'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S',
      'ü': 'u', 'Ü': 'U'
    };
    
    let normalized = category.toLowerCase();
    
    // Türkçe karakterleri değiştir
    Object.keys(turkishMap).forEach(key => {
      normalized = normalized.replace(new RegExp(key, 'g'), turkishMap[key]);
    });
    
    // Özel karakterleri ve boşlukları kaldır
    normalized = normalized
      .replace(/[^a-z0-9]/g, '') // Sadece küçük harfler ve sayıları tut
      .trim();
      
    console.log(`Kategori normalleştirme: "${category}" => "${normalized}"`);
    
    return normalized;
  }

  // Varyant ekle
  addVariant(): void {
    if (!this.productForm || !this.availableAttributes) {
      this.snackBar.open('Form henüz hazır değil, lütfen sayfayı yenileyin', 'Tamam', { duration: 3000 });
      return;
    }
    
    const attributesGroup = this.fb.group({});
    
    // Kategori için tanımlı özellikleri ekle
    this.availableAttributes.forEach(attr => {
      if (!attr) return;
      
      if (attr.required) {
        attributesGroup.addControl(attr.key, this.fb.control('', Validators.required));
      } else {
        attributesGroup.addControl(attr.key, this.fb.control(''));
      }
      
      // Renk için otomatik renk kodu kontrolü ekle
      if (attr.key === 'Renk') {
        attributesGroup.addControl('RenkKodu', this.fb.control(''));
      }
    });
    
    const defaultStock = 1; // Varsayılan stok miktarı
    const variantForm = this.fb.group({
      sku: [this.generateVariantSku(this.productForm.get('name')?.value || '', attributesGroup.value)],
      price: [this.productForm.get('price')?.value || 0, [Validators.required, Validators.min(0)]],
      stockQuantity: [defaultStock, [Validators.required, Validators.min(0)]],
      isActive: [true],
      attributes: attributesGroup,
      selectedFiles: [[]],
      imagePreviewUrls: [[]]
    });
    
    // Stok değişikliklerini dinle
    variantForm.get('stockQuantity')?.valueChanges.subscribe(() => {
      this.updateTotalStock();
    });
    
    this.variants.push(variantForm);
    
    // Toplam stok miktarını güncelle
    this.updateTotalStock();
    
    this.snackBar.open('Yeni varyant eklendi', 'Tamam', { duration: 3000 });
  }

  // Varyant için otomatik SKU oluştur
  generateVariantSku(productName: string, variant: any): string {
    const prefix = productName.substring(0, 3).toUpperCase();
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Özelliklerden kısa bir kod üret
    let attributeCode = '';
    if (variant.attributes) {
      // Renk varsa, ilk harfini al
      if (variant.attributes['Renk']) {
        attributeCode += variant.attributes['Renk'].charAt(0).toUpperCase();
      }
      
      // Beden varsa, tamamını al
      if (variant.attributes['Beden']) {
        attributeCode += variant.attributes['Beden'];
      }
      
      // Numara varsa, tamamını al
      if (variant.attributes['Numara']) {
        attributeCode += variant.attributes['Numara'];
      }
      
      // Kapasite varsa, sadece rakamları al
      if (variant.attributes['Kapasite']) {
        attributeCode += variant.attributes['Kapasite'].replace(/\D/g, '');
      }
    }
    
    // Eğer özelliklerden kod oluşturulamadıysa, rastgele bir harf kullan
    if (!attributeCode) {
      attributeCode = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    
    return `${prefix}-${attributeCode}-${randomPart}`;
  }

  // Özellik ekleme formunu göster - artık kullanılmayacak, kategori belirleyecek
  showAttributeForm(variantIndex: number): void {
    // Kategori bazlı özellikler olduğu için manuel eklemeye izin verme
    this.snackBar.open('Özellikler seçtiğiniz kategoriye göre belirlenir. Değerleri düzenleyebilirsiniz.', 'Tamam', { duration: 3000 });
  }

  // Özellik eklemeyi onayla - artık kullanılmayacak
  confirmAddAttribute(): void {
    this.snackBar.open('Özellikler seçtiğiniz kategoriye göre belirlenir. Değerleri düzenleyebilirsiniz.', 'Tamam', { duration: 3000 });
    this.showAddAttributeForm = false;
  }

  // Özellik eklemeyi iptal et - artık kullanılmayacak
  cancelAddAttribute(): void {
    this.showAddAttributeForm = false;
    this.currentVariantIndex = -1;
  }

  // Varyant için özellik anahtarlarını getir
  getVariantAttributeKeys(variantIndex: number): string[] {
    if (!this.variants) return [];
    
    const variant = this.variants.at(variantIndex) as FormGroup;
    if (!variant) return [];
    
    const attributesGroup = variant.get('attributes') as FormGroup;
    return attributesGroup ? Object.keys(attributesGroup.controls).filter(key => key !== 'RenkKodu') : [];
  }
  
  // Varyant özellik değerini getir
  getVariantAttributeValue(variantIndex: number, attributeKey: string): string {
    if (!this.variants) return '';
    
    const variant = this.variants.at(variantIndex) as FormGroup;
    if (!variant) return '';
    
    const attributesGroup = variant.get('attributes') as FormGroup;
    if (!attributesGroup) return '';
    
    return attributesGroup.get(attributeKey)?.value || '';
  }

  // Renk adına göre kod bul
  getColorCode(colorName: string): string {
    const color = this.availableColors.find(c => c.name.toLowerCase() === colorName.toLowerCase());
    return color ? color.code : '#000000';
  }

  // Renk seçimi yapma
  selectColorWithCode(variantIndex: number, attributeKey: string, colorName: string, colorCode: string): void {
    if (!this.variants) return;
    
    const variant = this.variants.at(variantIndex) as FormGroup;
    if (!variant) return;
    
    const attributesGroup = variant.get('attributes') as FormGroup;
    if (!attributesGroup) return;
    
    // Renk adını güncelle
    attributesGroup.get(attributeKey)?.setValue(colorName);
    
    // Ayrıca renk kodunu güncelle (eğer yoksa ekle)
    if (attributesGroup.get('RenkKodu')) {
      attributesGroup.get('RenkKodu')?.setValue(colorCode);
    } else {
      attributesGroup.addControl('RenkKodu', this.fb.control(colorCode));
    }
  }

  // Beden veya kapasite gibi değerleri seçme
  selectSize(variantIndex: number, attributeKey: string, value: string): void {
    if (!this.variants) return;
    
    const variant = this.variants.at(variantIndex) as FormGroup;
    if (!variant) return;
    
    const attributesGroup = variant.get('attributes') as FormGroup;
    if (!attributesGroup) return;
    
    attributesGroup.get(attributeKey)?.setValue(value);
  }

  // Renk kodunun açık renkli olup olmadığını kontrol etme (metin rengi ayarı için)
  isLightColor(hexColor: string): boolean {
    // Basit bir hesaplama: Renk kod değerlerini RGB'ye dönüştürüp parlaklık hesaplama
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Parlaklık formülü (genel olarak kabul edilen 0.299R + 0.587G + 0.114B)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128; // 128'den büyükse açık renk
  }

  // Varyant için resim seçme
  onVariantFileSelected(event: Event, variantIndex: number): void {
    const element = event.target as HTMLInputElement;
    if (element.files && this.variants) {
      const files = element.files;
      
      // Form kontrolünü al
      const variantForm = this.variants.at(variantIndex) as FormGroup;
      if (!variantForm) return;
      
      const selectedFiles = [...(variantForm.get('selectedFiles')?.value || [])];
      const imagePreviewUrls = [...(variantForm.get('imagePreviewUrls')?.value || [])];
      
      // Maksimum 5 resim kontrolü
      if (selectedFiles.length + files.length > 5) {
        this.snackBar.open('Her varyant için en fazla 5 resim yükleyebilirsiniz', 'Tamam', { duration: 3000 });
        return;
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Dosya türü kontrolü
        if (!file.type.includes('image')) {
          this.snackBar.open('Lütfen sadece resim dosyaları yükleyin', 'Tamam', { duration: 3000 });
          continue;
        }
        
        // Dosya boyutu kontrolü (5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.snackBar.open('Resim boyutu 5MB\'dan küçük olmalıdır', 'Tamam', { duration: 3000 });
          continue;
        }
        
        selectedFiles.push(file);
        
        // Resim önizlemesi oluştur
        const reader = new FileReader();
        reader.onload = (e: any) => {
          imagePreviewUrls.push(e.target.result);
          // FormGroup'a değerleri güncelle
          variantForm.patchValue({
            selectedFiles: selectedFiles,
            imagePreviewUrls: imagePreviewUrls
          });
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Varyant kaldır
  removeVariant(index: number): void {
    this.variants.removeAt(index);
    
    // Toplam stok miktarını güncelle
    this.updateTotalStock();
    
    this.snackBar.open('Varyant silindi', 'Tamam', { duration: 3000 });
  }

  // Varyant resmini kaldır
  removeVariantImage(variantIndex: number, imageIndex: number): void {
    if (!this.variants) return;
    
    const variantForm = this.variants.at(variantIndex) as FormGroup;
    if (!variantForm) return;
    
    const selectedFiles = [...(variantForm.get('selectedFiles')?.value || [])];
    const imagePreviewUrls = [...(variantForm.get('imagePreviewUrls')?.value || [])];
    
    selectedFiles.splice(imageIndex, 1);
    imagePreviewUrls.splice(imageIndex, 1);
    
    variantForm.patchValue({
      selectedFiles: selectedFiles,
      imagePreviewUrls: imagePreviewUrls
    });
  }

  // Varyant resimlerini yükle
  uploadVariantImages(productId: number, variantId: number, variantIndex: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const variantForm = this.variants.at(variantIndex) as FormGroup;
      const selectedFiles = variantForm.get('selectedFiles')?.value || [];
      const uploadedImageUrls: string[] = [];
      
      if (selectedFiles.length === 0) {
        console.log(`Varyant #${variantId} için yüklenecek resim yok.`);
        resolve(uploadedImageUrls);
        return;
      }
      
      console.log(`Varyant #${variantId} için ${selectedFiles.length} resim yükleniyor...`);
      let completedUploads = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('image', selectedFiles[i]);
        formData.append('displayOrder', i.toString());
        formData.append('isMain', (i === 0 ? 'true' : 'false')); // İlk resim ana resim olarak ayarlanır
        
        console.log(`Varyant #${variantId} için resim ${i+1}/${selectedFiles.length} yükleniyor...`);
        this.productService.uploadVariantImages(productId, variantId, formData)
          .subscribe({
            next: (response) => {
              console.log(`Varyant #${variantId} için resim ${i+1} başarıyla yüklendi:`, response);
              uploadedImageUrls.push(response.imageUrl);
              completedUploads++;
              
              if (completedUploads === selectedFiles.length) {
                console.log(`Varyant #${variantId} için tüm resimler (${completedUploads}/${selectedFiles.length}) yüklendi`);
                resolve(uploadedImageUrls);
              }
            },
            error: (error) => {
              console.error(`Varyant #${variantId} için resim ${i+1} yüklenirken hata:`, error);
              completedUploads++;
              
              if (completedUploads === selectedFiles.length) {
                console.log(`Varyant #${variantId} için resim yükleme tamamlandı, bazı hatalarla: ${completedUploads}/${selectedFiles.length}`);
                resolve(uploadedImageUrls); // Bazı resimler yüklenemese bile devam et
              }
            }
          });
      }
    });
  }

  // Resim seç
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files) {
      const files = element.files;
      
      // Maksimum 5 resim kontrolü
      if (this.selectedFiles.length + files.length > 5) {
        this.snackBar.open('En fazla 5 resim yükleyebilirsiniz', 'Tamam', { duration: 3000 });
        return;
      }
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Dosya türü kontrolü
        if (!file.type.includes('image')) {
          this.snackBar.open('Lütfen sadece resim dosyaları yükleyin', 'Tamam', { duration: 3000 });
          continue;
        }
        
        // Dosya boyutu kontrolü (5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.snackBar.open('Resim boyutu 5MB\'dan küçük olmalıdır', 'Tamam', { duration: 3000 });
          continue;
        }
        
        this.selectedFiles.push(file);
        
        // Resim önizlemesi oluştur
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  // Resim kaldır
  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  // Ürün oluşturulduktan sonra resimleri yüklemek için yeni metot
  uploadProductImages(productId: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const uploadedImageUrls: string[] = [];
      
      if (this.selectedFiles.length === 0) {
        resolve(uploadedImageUrls);
        return;
      }
      
      let completedUploads = 0;
      
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('image', this.selectedFiles[i]);
        formData.append('displayOrder', i.toString());
        formData.append('isMain', (i === 0 ? 'true' : 'false')); // İlk resim ana resim olarak ayarlanır
        
        this.productService.uploadProductImages(productId, formData)
          .subscribe({
            next: (response) => {
              uploadedImageUrls.push(response.imageUrl);
              completedUploads++;
              
              if (completedUploads === this.selectedFiles.length) {
                resolve(uploadedImageUrls);
              }
            },
            error: (error) => {
              console.error('Resim yükleme hatası:', error);
              completedUploads++;
              
              if (completedUploads === this.selectedFiles.length) {
                resolve(uploadedImageUrls); // Bazı resimler yüklenemese bile devam et
              }
            }
          });
      }
    });
  }

  // Ürünü kaydet
  saveProduct(): void {
    if (this.productForm.invalid) {
      this.snackBar.open('Lütfen zorunlu alanları doldurunuz', 'Tamam', { duration: 3000 });
      console.log('Form hatası:', this.findInvalidControls());
      return;
    }

    // Toplam stok miktarını bir kez daha güncelle
    this.updateTotalStock();
    
    this.isSubmitting = true;
    
    // Form verilerini al
    const formData = this.productForm.value;
    
    // Varyantları kontrol et
    if (formData.variants.length === 0) {
      this.snackBar.open('En az bir varyant eklemelisiniz', 'Tamam', { duration: 3000 });
      this.isSubmitting = false;
      return;
    }
    
    // Ürün nesnesini oluştur - Kategori hiyerarşisi için en son seçilen kategoriyi kullan
    let categoryToUse;
    
    if (formData.thirdLevelCategory) {
      // Üçüncü seviye kategori seçildi - bunu kullan
      categoryToUse = { id: formData.thirdLevelCategory };
    } else if (formData.subCategory) {
      // Alt kategori seçildi - bunu kullan
      categoryToUse = { id: formData.subCategory };
    } else {
      // Sadece ana kategori seçildi - bunu kullan
      categoryToUse = { id: formData.category };
    }
    
    const product = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      category: categoryToUse,
      brand: formData.brand ? { id: formData.brand } : null,
      store: { id: formData.store },
      stock: formData.stockQuantity, // Bu değer artık varyantların toplam stok miktarını içerecek
      sku: formData.sku || this.generateSku(formData.name),
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      status: formData.isActive ? 'active' : 'inactive',
      variants: this.prepareVariantsForSubmission(formData.variants)
    };

    console.log('Gönderilecek ürün:', product);
    
    // API'ye gönder
    this.productService.addSellerProduct(product)
      .subscribe({
        next: async (response) => {
          console.log('Ürün başarıyla oluşturuldu:', response);
          const productId = response.id;
          
          // Ürün ana resimlerini yükle
          let imageUrls: string[] = [];
          if (this.selectedFiles.length > 0) {
            try {
              imageUrls = await this.uploadProductImages(productId);
              console.log('Ürün resimleri yüklendi:', imageUrls);
            } catch (error) {
              console.error('Ürün resimleri yüklenirken hata:', error);
            }
          }
          
          // Varyantlar için işlem
          try {
            const addedVariants = await this.addVariantsSequentially(productId, product.variants);
            console.log('Tüm varyantlar eklendi:', addedVariants);
            this.showSuccessMessage('Ürün, varyantlar ve resimler başarıyla kaydedildi');
          } catch (error) {
            console.error('Varyant ekleme işleminde hata:', error);
            this.showSuccessMessage('Ürün kaydedildi ancak bazı varyantlar eklenirken hata oluştu');
          } finally {
            this.isSubmitting = false;
            this.router.navigate(['/seller/products']);
          }
        },
        error: (error) => {
          console.error('Ürün kaydedilirken hata oluştu:', error);
          this.showErrorMessage('Ürün kaydedilirken bir hata oluştu: ' + (error.error?.message || error.message));
          this.isSubmitting = false;
        }
      });
  }
  
  // Tüm varyantları sırayla ekle
  async addVariantsSequentially(productId: number, variants: any[]): Promise<any[]> {
    const addedVariants = [];
    
    for (let i = 0; i < variants.length; i++) {
      try {
        // Her varyantı ayrı ayrı ekle
        const variantData = variants[i];
        console.log(`${i+1}/${variants.length} varyantı gönderiliyor:`, variantData);
        
        // Varyant DTO'suna boş imageUrls listesi ekle (varyant resmi için)
        variantData.imageUrls = [];
        
        const addedVariant = await firstValueFrom(this.productService.addSellerVariant(productId, variantData));
        
        console.log(`Varyant #${i+1} başarıyla eklendi:`, addedVariant);
        addedVariants.push(addedVariant);
        
        // Varyant resimlerini yükle
        const variantForm = this.variants.at(i) as FormGroup;
        const selectedFiles = variantForm.get('selectedFiles')?.value || [];
        
        if (selectedFiles.length > 0 && addedVariant) {
          try {
            console.log(`Varyant #${i+1} resimleri yükleniyor...`);
            const imageUrls = await this.uploadVariantImages(productId, addedVariant.id, i);
            console.log(`Varyant #${i+1} resimleri yüklendi:`, imageUrls);
          } catch (err) {
            console.error(`Varyant #${i+1} resimleri yüklenirken hata:`, err);
          }
        }
      } catch (err) {
        console.error(`Varyant #${i+1} eklenirken hata:`, err);
        throw err; // Hatayı yukarı ilet
      }
    }
    
    return addedVariants;
  }
  
  // Hatalı kontrolleri bul
  findInvalidControls(): string[] {
    const invalid = [];
    const controls = this.productForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    
    // Varyantlardaki hataları da kontrol et
    const variants = this.productForm.get('variants') as FormArray;
    for (let i = 0; i < variants.length; i++) {
      const variant = variants.at(i) as FormGroup;
      for (const name in variant.controls) {
        if (variant.controls[name].invalid) {
          invalid.push(`variants[${i}].${name}`);
        }
        
        // Varyant özelliklerini de kontrol et
        if (name === 'attributes') {
          const attributes = variant.get('attributes') as FormGroup;
          for (const attrName in attributes.controls) {
            if (attributes.controls[attrName].invalid) {
              invalid.push(`variants[${i}].attributes.${attrName}`);
            }
          }
        }
      }
    }
    
    return invalid;
  }
  
  // Varyantları API için hazırla
  prepareVariantsForSubmission(formVariants: any[]): any[] {
    return formVariants.map(variant => {
      // Özellikleri düzgün formatta hazırla (basit key-value objesi)
      const attributes = variant.attributes || {};
      
      // Backend'in beklediği formatta attributes hazırla (bir dizi değil bir nesne olmalı)
      const attributesObj: {[key: string]: string} = {};
      for (const key in attributes) {
        if (key !== 'RenkKodu' && attributes.hasOwnProperty(key)) {
          attributesObj[key] = attributes[key];
        }
      }
      
      // Renk kodu varsa ekstra işle
      let colorCode = '';
      if (attributes['Renk'] && attributes['RenkKodu']) {
        colorCode = attributes['RenkKodu'];
      } else if (attributes['Renk']) {
        colorCode = this.getColorCode(attributes['Renk']);
      }
      
      // Stok miktarını kontrol et (en az 0 olmalı)
      const stockQuantity = Math.max(0, variant.stockQuantity || 0);
      
      // Varyant verisini oluştur
      return {
        sku: variant.sku || '',
        price: variant.price || 0,
        sale_price: variant.salePrice || 0,
        stock: stockQuantity,
        active: variant.isActive !== undefined ? variant.isActive : true, // is_active yerine active
        color_code: colorCode,
        attributes: attributesObj, // Artık bir dizi değil bir nesne
        // Ekstra alanları temizle (form verilerini)
        selectedFiles: undefined,
        imagePreviewUrls: undefined
      };
    });
  }
  
  // Ürün için otomatik SKU oluştur
  generateSku(productName: string): string {
    const prefix = productName.substring(0, 3).toUpperCase();
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${randomPart}`;
  }
  
  // Varyant özellik ID'sini bul
  findAttributeIdForKey(key: string): number | null {
    // Örnek statik eşleştirme
    const attributeKeyMap: {[key: string]: number} = {
      'Renk': 4,
      'Beden': 5,
      'Numara': 7,
      'Boyut': 17
    };
    
    return attributeKeyMap[key] || null;
  }
  
  // Varyant resimlerini sırayla yükle
  uploadVariantImagesSequentially(productId: number, variants: any[]): void {
    if (!this.variants) return;
    
    // Her varyant için sırayla resim yükleme işlemini yap
    variants.forEach((variant, index) => {
      const variantForm = this.variants?.at(index) as FormGroup;
      if (variantForm) {
        const selectedFiles = variantForm.get('selectedFiles')?.value || [];
        if (selectedFiles.length > 0) {
          setTimeout(() => {
            this.uploadVariantImages(productId, variant.id, index)
              .then((imageUrls) => {
                console.log(`Varyant #${variant.id} resimleri yüklendi:`, imageUrls);
              })
              .catch((err) => {
                console.error(`Varyant #${variant.id} resimleri yüklenirken hata:`, err);
              });
          }, index * 1000); // Her varyant için 1 saniye ara ile çalıştır (rate limiting'i önlemek için)
        }
      }
    });
  }
  
  // Başarı mesajı göster
  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 5000,
      panelClass: 'success-snackbar'
    });
  }
  
  // Hata mesajı göster
  showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 10000,
      panelClass: 'error-snackbar'
    });
  }

  // Form gönderme işlemi
  onSubmit(): void {
    if (!this.productForm) {
      this.snackBar.open('Form henüz hazır değil, lütfen sayfayı yenileyin', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Form geçerliliğini kontrol et
    if (this.productForm.invalid) {
      this.validateAllFormFields(this.productForm);
      this.snackBar.open('Lütfen formdaki hataları düzeltin', 'Tamam', { duration: 3000 });
      return;
    }
    
    // En az bir varyant olduğunu kontrol et
    if (!this.variants || this.variants.length === 0) {
      this.snackBar.open('En az bir varyant eklemelisiniz', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Kaydet
    this.saveProduct();
  }

  // Tüm form alanlarını doğrula
  validateAllFormFields(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        this.validateAllFormFields(control);
      }
    });
  }

  // Form reset
  resetForm(): void {
    this.productForm.reset();
    this.initForm();
    this.selectedFiles = [];
    this.imagePreviewUrls = [];
    
    // Varsayılan değerler
    this.productForm.patchValue({
      isActive: true,
      isFeatured: false,
      price: 0,
      salePrice: 0,
      stockQuantity: 1,
      weight: 0
    });
    
    // Varyantları temizle
    while (this.variants.length > 0) {
      this.variants.removeAt(0);
    }
  }
  
  // Ürün düzenleme sayfasını aç
  goToEditProduct(productId: number): void {
    this.router.navigate(['/seller/products/edit', productId]);
  }
  
  // Ürün listesine dön
  cancelAndReturn(): void {
    // Değişiklikler varsa kullanıcıya sor
    if (this.productForm.dirty) {
      if (confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinizden emin misiniz?')) {
        this.router.navigate(['/seller/products']);
      }
    } else {
      this.router.navigate(['/seller/products']);
    }
  }
  
  // Ana varyant bilgisini güncelle
  updateMainVariantInfo(): void {
    // Ana ürün bilgilerini değiştirildiğinde
    // mevcut varyantları da güncelle
    const formValue = this.productForm.value;
    const price = formValue.price;
    const salePrice = formValue.salePrice;
    
    // Varyantların fiyat bilgilerini güncelle (eğer fiyat değişmemişse)
    this.variants.controls.forEach((variantControl: AbstractControl) => {
      const variant = variantControl as FormGroup;
      
      // Eğer varyantın fiyatı ana ürünün fiyatıyla aynıysa güncelle
      if (variant.get('price')?.value === formValue.price - 1 || 
          variant.get('price')?.value === formValue.price) {
        variant.patchValue({ price: price });
      }
      
      // İndirimli fiyat için de aynısını yap
      if (variant.get('salePrice')?.value === formValue.salePrice - 1 ||
          variant.get('salePrice')?.value === formValue.salePrice) {
        variant.patchValue({ salePrice: salePrice });
      }
    });
  }
  
  // Fiyat değişimini izle
  onPriceChange(): void {
    // Ana ürün fiyatı değiştiğinde varyantları güncelleme seçeneği sun
    const newPrice = this.productForm.get('price')?.value;
    
    if (this.variants.length > 0) {
      this.snackBar.open('Ana ürün fiyatı değişti. Tüm varyantların fiyatını da güncellemek ister misiniz?', 'Evet', { duration: 5000 })
        .onAction().subscribe(() => {
          // Tüm varyantların fiyatını güncelle
          this.variants.controls.forEach((variantControl: AbstractControl) => {
            const variant = variantControl as FormGroup;
            variant.patchValue({ price: newPrice });
          });
        });
    }
  }
  
  // Satış fiyatı değişimini izle
  onSalePriceChange(): void {
    // Ana ürün satış fiyatı değiştiğinde varyantları güncelleme seçeneği sun
    const newSalePrice = this.productForm.get('salePrice')?.value;
    
    if (this.variants.length > 0) {
      this.snackBar.open('Ana ürün satış fiyatı değişti. Tüm varyantların satış fiyatını da güncellemek ister misiniz?', 'Evet', { duration: 5000 })
        .onAction().subscribe(() => {
          // Tüm varyantların satış fiyatını güncelle
          this.variants.controls.forEach((variantControl: AbstractControl) => {
            const variant = variantControl as FormGroup;
            variant.patchValue({ salePrice: newSalePrice });
          });
        });
    }
  }
  
  // Varyant fiyatlarını ana üründen kopyala
  copyPriceToVariants(): void {
    const price = this.productForm.get('price')?.value || 0;
    const salePrice = this.productForm.get('salePrice')?.value || 0;
    
    if (this.variants.length > 0) {
      // Tüm varyantların fiyat bilgilerini güncelle
      this.variants.controls.forEach((variantControl: AbstractControl) => {
        const variant = variantControl as FormGroup;
        variant.patchValue({ 
          price: price,
          salePrice: salePrice 
        });
      });
      
      this.snackBar.open('Tüm varyantların fiyatları ana ürünün fiyatıyla güncellendi', 'Tamam', { duration: 3000 });
    }
  }
  
  // Varyant fiyatlarını farklılaştır (renk veya özellik bazlı)
  differentiateVariantPrices(): void {
    if (this.variants.length <= 1) {
      this.snackBar.open('Fiyat farklılaştırması için en az 2 varyant gereklidir', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Ana fiyatı baz al
    const basePrice = this.productForm.get('price')?.value || 0;
    
    // Farklılaştırma stratejisi: Örnek olarak renk bazlı
    // Koyu renkler biraz daha pahalı olsun
    const darkColors = ['Siyah', 'Lacivert', 'Bordo', 'Kahverengi'];
    
    this.variants.controls.forEach((variantControl: AbstractControl) => {
      const variant = variantControl as FormGroup;
      const attributes = variant.get('attributes') as FormGroup;
      
      if (attributes) {
        const renk = attributes.get('Renk')?.value;
        
        if (renk) {
          // Koyu renklerde %5 daha pahalı
          if (darkColors.includes(renk)) {
            variant.patchValue({ 
              price: Math.round(basePrice * 1.05),
              salePrice: Math.round((basePrice * 1.05) * 0.9) // %10 indirimli
            });
          } 
          // Açık renklerde normal fiyat
          else {
            variant.patchValue({ 
              price: basePrice,
              salePrice: Math.round(basePrice * 0.9) // %10 indirimli
            });
          }
        }
      }
    });
    
    this.snackBar.open('Varyant fiyatları renk bazlı olarak farklılaştırıldı', 'Tamam', { duration: 3000 });
  }
  
  // Varyant stok miktarlarını güncelle
  updateAllVariantStocks(stockQuantity: number): void {
    if (this.variants.length === 0) {
      return;
    }
    
    // Her bir varyantın stok miktarını güncelle
    this.variants.controls.forEach((variantControl: AbstractControl) => {
      const variant = variantControl as FormGroup;
      variant.patchValue({ stockQuantity: stockQuantity });
    });
    
    // Toplam stok miktarını güncelle
    this.updateTotalStock();
    
    this.snackBar.open(`Tüm varyantların stok miktarı ${stockQuantity} olarak güncellendi`, 'Tamam', { duration: 3000 });
  }
  
  // Tüm varyantları temizle
  clearAllVariants(): void {
    if (this.variants.length === 0) {
      return;
    }
    
    if (confirm('Tüm varyantları silmek istediğinizden emin misiniz?')) {
      while (this.variants.length > 0) {
        this.variants.removeAt(0);
      }
      
      this.snackBar.open('Tüm varyantlar silindi', 'Tamam', { duration: 3000 });
    }
  }
  
  // Form kontrolünün hatalı olup olmadığını kontrol et
  isControlInvalid(formGroup: FormGroup, controlName: string): boolean {
    const control = formGroup.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // FormControl'ün hata mesajını getir
  getErrorMessage(formGroup: FormGroup, controlName: string): string {
    const control = formGroup.get(controlName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return 'Bu alan zorunludur';
      } else if (control.errors['minlength']) {
        return `En az ${control.errors['minlength'].requiredLength} karakter olmalıdır`;
      } else if (control.errors['min']) {
        return `En az ${control.errors['min'].min} olmalıdır`;
      } else if (control.errors['email']) {
        return 'Geçerli bir e-posta adresi giriniz';
      }
    }
    return '';
  }

  // Navigate back to the products list
  goBack(): void {
    this.router.navigate(['/seller/products']);
  }

  // Drag and drop functionality
  onDragOver(event: Event): void {
    event.preventDefault();
    const element = event.target as HTMLElement;
    if (element.classList.contains('upload-button')) {
      element.classList.add('drag-over');
    }
  }

  onDragLeave(event: Event): void {
    event.preventDefault();
    const element = event.target as HTMLElement;
    if (element.classList.contains('upload-button')) {
      element.classList.remove('drag-over');
    }
  }

  onDrop(event: Event): void {
    event.preventDefault();
    const element = event.target as HTMLElement;
    if (element.classList.contains('upload-button')) {
      element.classList.remove('drag-over');
      
      // Trigger file input click
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput && (event as DragEvent).dataTransfer) {
        const files = (event as DragEvent).dataTransfer?.files;
        if (files) {
          this.handleFiles(files);
        }
      }
    }
  }

  onVariantDrop(event: Event, variantIndex: number): void {
    event.preventDefault();
    const element = event.target as HTMLElement;
    if (element.classList.contains('upload-button')) {
      element.classList.remove('drag-over');
      
      // Trigger file input click
      const fileInput = document.getElementById(`variant-image-upload-${variantIndex}`) as HTMLInputElement;
      if (fileInput && (event as DragEvent).dataTransfer) {
        const files = (event as DragEvent).dataTransfer?.files;
        if (files) {
          this.handleVariantFiles(files, variantIndex);
        }
      }
    }
  }

  // Handle dropped files for product
  handleFiles(files: FileList): void {
    const event = { target: { files: files } } as unknown as Event;
    this.onFileSelected(event);
  }

  // Handle dropped files for variant
  handleVariantFiles(files: FileList, variantIndex: number): void {
    const event = { target: { files: files } } as unknown as Event;
    this.onVariantFileSelected(event, variantIndex);
  }

  // Set main image for product
  setMainImage(index: number): void {
    if (index === 0 || index >= this.imagePreviewUrls.length) return;
    
    // Swap with the first image
    const tempFile = this.selectedFiles[0];
    const tempUrl = this.imagePreviewUrls[0];
    
    this.selectedFiles[0] = this.selectedFiles[index];
    this.imagePreviewUrls[0] = this.imagePreviewUrls[index];
    
    this.selectedFiles[index] = tempFile;
    this.imagePreviewUrls[index] = tempUrl;
    
    this.snackBar.open('Ana görsel değiştirildi', 'Tamam', { duration: 3000 });
  }

  // Set main image for variant
  setVariantMainImage(variantIndex: number, imageIndex: number): void {
    if (!this.variants) return;
    
    const variantForm = this.variants.at(variantIndex) as FormGroup;
    if (!variantForm) return;
    
    const selectedFiles = [...(variantForm.get('selectedFiles')?.value || [])];
    const imagePreviewUrls = [...(variantForm.get('imagePreviewUrls')?.value || [])];
    
    if (imageIndex === 0 || imageIndex >= imagePreviewUrls.length) return;
    
    // Swap with the first image
    const tempFile = selectedFiles[0];
    const tempUrl = imagePreviewUrls[0];
    
    selectedFiles[0] = selectedFiles[imageIndex];
    imagePreviewUrls[0] = imagePreviewUrls[imageIndex];
    
    selectedFiles[imageIndex] = tempFile;
    imagePreviewUrls[imageIndex] = tempUrl;
    
    variantForm.patchValue({
      selectedFiles: selectedFiles,
      imagePreviewUrls: imagePreviewUrls
    });
    
    this.snackBar.open('Varyant ana görseli değiştirildi', 'Tamam', { duration: 3000 });
  }

  // Add a new product attribute (not variant attribute)
  addAttribute(): void {
    const attributeForm = this.fb.group({
      name: ['', Validators.required],
      value: ['', Validators.required]
    });
    
    this.attributes.push(attributeForm);
  }

  // Remove a product attribute
  removeAttribute(index: number): void {
    this.attributes.removeAt(index);
  }

  // Get variant display name
  getVariantDisplayName(variantIndex: number): string {
    if (!this.variants) return '';
    
    const variant = this.variants.at(variantIndex) as FormGroup;
    if (!variant) return '';
    
    const attributesGroup = variant.get('attributes') as FormGroup;
    if (!attributesGroup) return '';
    
    // Get key attribute values like color or size
    const colorValue = attributesGroup.get('Renk')?.value;
    const sizeValue = attributesGroup.get('Beden')?.value;
    const capacityValue = attributesGroup.get('Kapasite')?.value;
    
    let displayParts = [];
    
    if (colorValue) displayParts.push(colorValue);
    if (sizeValue) displayParts.push(sizeValue);
    if (capacityValue) displayParts.push(capacityValue);
    
    return displayParts.length > 0 ? displayParts.join(' / ') : '';
  }

  // Tüm varyantların stok miktarlarını toplayıp ürünün ana stok miktarını güncelle
  updateTotalStock(): void {
    let totalStock = 0;
    
    // Tüm varyantların stok miktarlarını topla
    if (this.variants && this.variants.length > 0) {
      this.variants.controls.forEach((variantControl: AbstractControl) => {
        const variant = variantControl as FormGroup;
        const variantStock = variant.get('stockQuantity')?.value || 0;
        totalStock += Number(variantStock);
      });
    }
    
    // Ana ürünün stok miktarını güncelle
    this.productForm.patchValue({ stockQuantity: totalStock });
    console.log('Toplam stok güncellendi:', totalStock);
  }
}
