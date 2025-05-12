import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, Subject } from 'rxjs';
import { User } from '../../models/user.interface';
import { AuthService } from '../../services/auth.service';
import { CategoryHierarchy } from '../../models/Category';
import { CartService } from '../../services/cart.service';
import { CategoryService } from '../../services/category.service';
import { FavoriteService } from '../../services/favorite.service';
import { ProductService } from '../../services/product.service';
import { StoreService } from '../../services/store.service';
import { Store } from '../../models/store.interface';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// Arama önerisi için interface
interface SearchSuggestion {
  text: string;
  type: string;
  id?: number; // Mağaza gibi öğeler için ID değeri (opsiyonel)
}

// Popüler arama için interface
interface PopularSearch {
  text: string;
  count: number;
}

// Add Product interface definition for use with product search
interface ProductSearchResult {
  id: number;
  name: string;
  price?: number;
  imageUrl?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  cartCount = 0;
  favoriteCount = 0;
  currentPromoMessage = 'Yeni Sezon Ürünlerinde %20 İndirim!';
  fadeAnimation = false;
  isUserMenuOpen = false;
  isCategoryMenuOpen = false;
  currentUser: User | null = null;
  categories: CategoryHierarchy[] = [];
  activeCategory: CategoryHierarchy | null = null;
  activeSubcategory: CategoryHierarchy | null = null;
  
  // Arama ile ilgili değişkenler
  searchQuery: string = '';
  showSearchSuggestions = false;
  searchSuggestions: SearchSuggestion[] = [];
  recentSearches: string[] = [];
  popularSearches: PopularSearch[] = [];
  popularSearchLimit: number = 5; // Gösterilecek popüler arama sayısı
  private searchTerms = new Subject<string>();
  
  private messageIndex: number = 0;
  private messageInterval: Subscription | undefined;
  @ViewChild('categoryButton') categoryButton!: ElementRef;
  @ViewChild('megaMenu') megaMenu!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef;
  isMouseOverMenu = false;
  closeMenuTimeout: any;
  showPopularSearches: boolean = true;
  suggestedMarkets: Store[] = [];

  private promoMessages: string[] = [
    'ADICLUB ÜYELERİNE ÜCRETSİZ KARGO',
    '150 TL VE ÜZERİ ALIŞVERİŞLERDE %15 İNDİRİM',
    'YENİ SEZON ÜRÜNLERİNDE 2 AL 1 ÖDE',
    'OUTLET ÜRÜNLERİNDE %70\'E VARAN İNDİRİM',
    'AYAKKABILARDA 2. ÜRÜNE %50 İNDİRİM'
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private favoriteService: FavoriteService,
    private categoryService: CategoryService,
    private productService: ProductService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        console.log('Auth state updated:', { isLoggedIn: this.isLoggedIn, user: this.currentUser });
      })
    );

    // Subscribe to cart count
    this.subscriptions.push(
      this.cartService.getCartItemCount().subscribe(
        count => this.cartCount = count
      )
    );

    // Subscribe to favorites count
    this.subscriptions.push(
      this.favoriteService.getFavoriteCount().subscribe(
        count => this.favoriteCount = count
      )
    );

    // Subscribe to categories
    this.subscriptions.push(
      this.categoryService.getCategoryHierarchy().subscribe(
        categories => {
          this.categories = categories;
          if (categories.length > 0) {
            this.activeCategory = categories[0];
          }
        }
      )
    );

    // Arama işlemleri için debounce
    this.subscriptions.push(
      this.searchTerms.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(term => {
        this.getSuggestions(term);
      })
    );

    // Son aramaları local storage'dan al
    this.loadRecentSearches();
    
    // Popüler aramaları backend'den yükle
    this.loadPopularSearches();

    this.startMessageRotation();

    // Close menus when clicking outside
    document.addEventListener('click', (event: MouseEvent) => {
      const userMenu = document.querySelector('.user-menu-container');
      const categoryMenu = document.querySelector('.category-menu-container');
      const searchBox = document.querySelector('.search-box');
      
      if (userMenu && !userMenu.contains(event.target as Node)) {
        this.isUserMenuOpen = false;
      }
      if (categoryMenu && !categoryMenu.contains(event.target as Node)) {
        this.isCategoryMenuOpen = false;
        this.activeCategory = this.categories.length > 0 ? this.categories[0] : null;
      }
      if (searchBox && !searchBox.contains(event.target as Node)) {
        this.showSearchSuggestions = false;
      }
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());

    if (this.messageInterval) {
      this.messageInterval.unsubscribe();
    }

    window.removeEventListener('click', this.closeUserMenu);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
        this.closeUserMenu();
      },
      error: (error: any) => {
        console.error('Logout error:', error);
      }
    });
  }

  // Yeni arama metodları
  onSearchKeyUp(event: KeyboardEvent): void {
    const term = this.searchQuery.trim();
    if (term) {
      this.searchTerms.next(term);
    } else {
      this.searchSuggestions = [];
      // Arama kutusu boşsa popüler aramalar görünmeye devam etsin
      this.showPopularSearches = true;
    }

    // ESC tuşuna basıldığında öneri kutusunu kapat
    if (event.key === 'Escape') {
      this.showSearchSuggestions = false;
    }
  }

  onSearch(): void {
    const term = this.searchQuery.trim();
    if (term) {
      this.addToRecentSearches(term);
      
      // Arama yapıldığında backend'e bildir (arama sayısını arttırmak için)
      this.productService.incrementSearchCount(term).subscribe({
        next: () => console.log(`"${term}" araması için sayaç arttırıldı`),
        error: (err) => console.error('Arama sayısı arttırılamadı:', err)
      });
      
      // Eğer aktif bir kategori varsa, kategori içinde ara
      if (this.activeCategory) {
        this.router.navigate(['/products'], { 
          queryParams: { 
            search: term,
            category: this.activeCategory.slug
          }
        });
      } else {
        // Genel arama yap
        this.router.navigate(['/products'], { 
          queryParams: { search: term }
        });
      }
      
      this.showSearchSuggestions = false;
    }
  }

  selectSearchSuggestion(suggestion: SearchSuggestion | string): void {
    // String veya obje olarak geçirilebilir
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
    const type = typeof suggestion === 'string' ? '' : suggestion.type;
    const id = typeof suggestion === 'string' ? undefined : (suggestion as any).id;
    
    // Eğer bu bir ürün araması ise, doğrudan ürün sayfasına yönlendir
    if (type === 'Ürün' && id) {
      // Ürün ID'sine göre doğrudan ürün sayfasına git
      this.router.navigate(['/products', id]);
      this.searchQuery = '';
      this.showSearchSuggestions = false;
      
      // Arama sayısını arttır
      this.productService.incrementSearchCount(text).subscribe();
      return;
    }
    
    // Eğer bu bir mağaza araması ise, mağaza sayfasına yönlendir
    if (type === 'Mağaza') {
      // Mağaza adını ve varsa ID'sini kullanarak mağaza sayfasına git
      this.findAndNavigateToStore(text, id);
      return;
    }
    
    // Eğer bu bir kategori ise, kategoriye yönlendir
    if (type === 'Kategori') {
      this.router.navigate(['/products'], { 
        queryParams: { 
          category: this.normalizeSlug(text)
        }
      });
      this.searchQuery = '';
      this.showSearchSuggestions = false;
      
      // Arama sayısını arttır
      this.productService.incrementSearchCount(text).subscribe();
      
      return;
    }
    
    // Eğer bu bir marka ise, markaya göre filtrele
    if (type === 'Marka') {
      this.router.navigate(['/products'], { 
        queryParams: { 
          brand: this.normalizeSlug(text)
        }
      });
      this.searchQuery = '';
      this.showSearchSuggestions = false;
      
      // Arama sayısını arttır
      this.productService.incrementSearchCount(text).subscribe();
      
      return;
    }
    
    // Arama sayısını arttır (sadece obje tipindeyse ve uygun tip ise)
    if (typeof suggestion !== 'string') {
      if (['Marka', 'Ürün', 'Kategori', 'Mağaza'].includes(suggestion.type)) {
        this.productService.incrementSearchCount(text).subscribe();
      }
    }
    
    // Normal arama işlemi
    this.searchQuery = text;
    this.onSearch();
  }

  // Mağaza adına göre mağaza bilgisini bulup o sayfaya yönlendir
  private findAndNavigateToStore(storeName: string, storeId?: number): void {
    if (storeId) {
      // If we already have the ID, navigate directly
      this.router.navigate(['/stores', storeId, 'products']);
      return;
    }

    // Otherwise search for the store by name (case insensitive)
    this.storeService.searchStores(storeName).subscribe({
      next: (stores) => {
        const store = stores.find(s => 
          s.name.toLowerCase() === storeName.toLowerCase() || 
          s.name.toLowerCase().includes(storeName.toLowerCase())
        );
        
        if (store) {
          this.router.navigate(['/stores', store.id, 'products']);
        } else {
          // If no exact match, navigate to stores list with search query
          this.router.navigate(['/stores'], { 
            queryParams: { search: storeName }
          });
        }
      },
      error: (error) => {
        console.error('Store search error:', error);
        // On error, navigate to stores list with search query
        this.router.navigate(['/stores'], { 
          queryParams: { search: storeName }
        });
      }
    });
  }

  getSuggestions(term: string): void {
    if (!term || term.length < 2) {
      this.searchSuggestions = [];
      this.suggestedMarkets = [];
      return;
    }

    
    // Get market suggestions
    this.storeService.searchStores(term).subscribe({
      next: (stores) => {
        console.log('Store search results:', stores);
        // Filter active stores only
        this.suggestedMarkets = stores.filter(store => store.status === 'approved');
        console.log('Filtered market suggestions:', this.suggestedMarkets);
        
        // Show search suggestions if we have results
        if (this.searchSuggestions.length > 0 || this.suggestedMarkets.length > 0) {
          this.showSearchSuggestions = true;
        }
      },
      error: (error) => {
        console.error('Error fetching store suggestions:', error);
        this.suggestedMarkets = [];
      }
    });

    // Get product suggestions by product name
    this.productService.searchProducts(term).subscribe({
      next: (products) => {
        // Add products to suggestions (limit to 5)
        const productSuggestions = (Array.isArray(products) ? products : products.items)
          .slice(0, 5)
          .map((product: ProductSearchResult) => ({
            text: product.name,
            type: 'Ürün',
            id: product.id
          }));
        
        // Add to existing suggestions, ensuring no duplicates
        const existingTexts = this.searchSuggestions.map(s => s.text.toLowerCase());
        const newProductSuggestions = productSuggestions.filter(
          (p: SearchSuggestion) => !existingTexts.includes(p.text.toLowerCase())
        );
        
        // Combine suggestions, limiting total to 10
        this.searchSuggestions = [...this.searchSuggestions, ...newProductSuggestions]
          .slice(0, 10);
          
        // Show search suggestions if we have results
        if (this.searchSuggestions.length > 0) {
          this.showSearchSuggestions = true;
        }
      },
      error: (error) => {
        console.error('Error fetching product suggestions:', error);
        // Already using basic suggestions as fallback
      }
    });
  }

  // 
  // Metni arama terimine göre highlight et
  highlightMatch(text: string, term: string): string {
    if (!term || !text) return text;
    
    // Regex escape characters için term'i düzenle
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    
    // Eşleşen kısmı <span class="highlight"> ile sar
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  // Son aramalar için metodlar
  loadRecentSearches(): void {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      this.recentSearches = JSON.parse(saved).slice(0, 5);
    }
  }

  addToRecentSearches(term: string): void {
    // Zaten varsa listeden çıkar (sonra başa eklenecek)
    this.recentSearches = this.recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
    
    // Başa ekle
    this.recentSearches.unshift(term);
    
    // Maksimum 5 tane tut
    if (this.recentSearches.length > 5) {
      this.recentSearches = this.recentSearches.slice(0, 5);
    }
    
    // Local storage'a kaydet
    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
  }

  removeRecentSearch(event: Event, term: string): void {
    event.stopPropagation();
    this.recentSearches = this.recentSearches.filter(s => s !== term);
    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
  }

  clearAllRecentSearches(event: Event): void {
    event.stopPropagation();
    this.recentSearches = [];
    localStorage.removeItem('recentSearches');
  }

  private startMessageRotation() {
    this.messageInterval = interval(5000).subscribe(() => {
      this.fadeAnimation = true;
      
      setTimeout(() => {
        this.messageIndex = (this.messageIndex + 1) % this.promoMessages.length;
        this.currentPromoMessage = this.promoMessages[this.messageIndex];
        this.fadeAnimation = false;
      }, 100);
    });
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu = () => {
    this.isUserMenuOpen = false;
    window.removeEventListener('click', this.closeUserMenu);
  }

  toggleCategoryMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
    
    if (!this.isCategoryMenuOpen) {
      this.isMouseOverMenu = false;
      this.activeCategory = null;
    } else if (this.categories.length > 0) {
      this.activeCategory = this.categories[0];
    }
  }

  onMenuMouseEnter() {
    this.isMouseOverMenu = true;
    if (this.closeMenuTimeout) {
      clearTimeout(this.closeMenuTimeout);
    }
  }

  onMenuMouseLeave() {
    this.isMouseOverMenu = false;
    this.closeMenuTimeout = setTimeout(() => {
      if (!this.isMouseOverMenu && this.isCategoryMenuOpen) {
        this.closeCategoryMenu();
      }
    }, 200);
  }

  private closeCategoryMenu() {
    this.isCategoryMenuOpen = false;
    this.isMouseOverMenu = false;
    this.activeCategory = null;
  }

  setActiveCategory(category: CategoryHierarchy): void {
    this.activeCategory = category;
    // Also set the first subcategory as active by default
    if (category.subcategories && category.subcategories.length > 0) {
      this.activeSubcategory = category.subcategories[0];
    } else {
      this.activeSubcategory = null;
    }
  }

  setActiveSubcategory(subcategory: CategoryHierarchy): void {
    this.activeSubcategory = subcategory;
  }

  // Helper method to chunk array into groups
  groupSubcategories(subcategories: CategoryHierarchy[], size: number): CategoryHierarchy[][] {
    const groups: CategoryHierarchy[][] = [];
    for (let i = 0; i < subcategories.length; i += size) {
      groups.push(subcategories.slice(i, i + size));
    }
    return groups;
  }

  navigateToCategory(category: CategoryHierarchy): void {
    this.router.navigate(['/category', category.id]);
    this.closeCategoryMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.categoryButton?.nativeElement?.contains(event.target) && 
        !this.megaMenu?.nativeElement?.contains(event.target) && 
        this.isCategoryMenuOpen) {
      this.closeCategoryMenu();
    }
  }

  // Popüler aramaları backend'den yükle
  loadPopularSearches(): void {
    // Daha fazla popüler arama göster (sıralanmış şekilde gelecek, limit 10)
    this.productService.getPopularSearches(10).subscribe(popularSearches => {
      this.popularSearches = popularSearches;
      // Not: Popüler aramalar zaten backend'den sıralanmış olarak geliyor
      // ve product.service.ts içerisinde de bir kez daha sıralanıyor
    });
  }

  // Popüler aramaya tıklandığında
  onPopularTagClick(popularSearch: { text: string, count: number }): void {
    // Aramanın sayısını arttır
    this.productService.incrementSearchCount(popularSearch.text).subscribe({
      next: (response) => {
        console.log('Arama sayısı arttırıldı:', response);
        
        // UI'da anında sayıyı arttır
        const index = this.popularSearches.findIndex(item => item.text === popularSearch.text);
        if (index !== -1) {
          this.popularSearches[index].count++;
        }
      },
      error: (err) => {
        console.error('Arama sayısını arttırma hatası:', err);
      }
    });

    // Arama yapılıyor
    this.searchQuery = popularSearch.text;
    this.onSearch();
  }

  groupMainCategories(): CategoryHierarchy[][] {
    // Split categories into 3 columns
    const columns: CategoryHierarchy[][] = [];
    const totalCategories = this.categories.length;
    
    // Calculate items per column (try to distribute evenly)
    const itemsPerColumn = Math.ceil(totalCategories / 3);
    
    // Create columns
    for (let i = 0; i < totalCategories; i += itemsPerColumn) {
      columns.push(this.categories.slice(i, i + itemsPerColumn));
    }
    
    return columns;
  }

  getSubcategories(categoryName: string): CategoryHierarchy[] {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.subcategories || [];
  }

  getSortedSubcategories(category: CategoryHierarchy): CategoryHierarchy[] {
    if (!category || !category.subcategories) {
      return [];
    }
    // Return a sorted copy of subcategories by name
    return [...category.subcategories].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Slug formatına dönüştür (kategori navigasyonu için)
  private normalizeSlug(text: string): string {
    return text.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '-').replace(/&/g, '-');
  }

  // Navigate to market page
  navigateToMarket(market: Store): void {
    console.log('Navigating to market:', market);
    if (market && market.id) {
      this.router.navigate(['/stores', market.id, 'products']);
      this.showSearchSuggestions = false;
    } else {
      console.error('Invalid market data:', market);
    }
  }
} 