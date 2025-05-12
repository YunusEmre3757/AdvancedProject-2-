import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { BrandService } from '../../services/brand.service';
import { Brand } from '../../models/brand.interface';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-brand-filter',
  templateUrl: './brand-filter.component.html',
  styleUrl: './brand-filter.component.css',
  standalone: false
})
export class BrandFilterComponent implements OnInit, OnChanges {
  @Input() selectedBrandIds: number[] = [];
  @Input() categoryId: number | string | null = null;
  @Input() availableBrands: Brand[] = []; // Arama sonuçlarında bulunan markaları alır
  @Output() brandsSelected = new EventEmitter<number[]>();
  
  brands: Brand[] = [];
  filteredBrands: Brand[] = []; // Görüntülenecek markalar (arama sonuçlarına göre filtrelenmiş)
  loading = false;
  error = '';
  private loadBrandsSubject = new Subject<number | string | null>();
  private lastLoadedCategoryId: number | string | null = null;

  constructor(private brandService: BrandService) { }

  ngOnInit(): void {
    console.log('BrandFilterComponent initialized with categoryId:', this.categoryId);
    
    // Debounce marka yükleme işlemlerini
    this.loadBrandsSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(categoryId => {
      this.performBrandsLoading(categoryId);
    });
    
    // İlk yükleme
    this.loadBrandsByCategoryIfNeeded();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('BrandFilterComponent ngOnChanges:', changes);
    
    // Sadece categoryId değiştiğinde markaları yeniden yükle
    if (changes['categoryId'] && !this.isEqual(changes['categoryId'].currentValue, changes['categoryId'].previousValue)) {
      console.log('Category ID changed, requesting brands reload');
      this.loadBrandsByCategoryIfNeeded();
    }
    
    // Arama sonuçlarında bulunan markalar değiştiğinde filtreleri güncelle
    if (changes['availableBrands']) {
      console.log('Available brands changed, updating brand filters');
      this.updateFilteredBrands();
    }
  }

  // Görüntülenecek markaları güncelle
  private updateFilteredBrands(): void {
    // Eğer arama için özel olarak filtrelenmiş marka listesi varsa
    if (this.availableBrands && this.availableBrands.length > 0) {
      console.log(`Filtering brands to show only ${this.availableBrands.length} available brands from search results`);
      
      // Arama sonuçlarında bulunan marka ID'lerini al
      const availableBrandIds = this.availableBrands.map(brand => brand.id);
      
      // Sadece arama sonuçlarında bulunan markaları göster
      this.filteredBrands = this.brands.filter(brand => 
        availableBrandIds.includes(brand.id)
      );
      
      console.log(`Filtered to ${this.filteredBrands.length} brands that match search results`);
      
      // Seçili markaları da güncelle (arama sonuçlarında olmayan markaları seçimden kaldır)
      this.updateSelectedBrandsBasedOnAvailability(availableBrandIds);
    } 
    // Hiç ürün sonucu yoksa ve bu bir arama sonucuysa (availableBrands listesi boş bir array olarak gönderilmiş)
    else if (this.availableBrands && this.availableBrands.length === 0) {
      // Arama sonucu bulunmadıysa hiçbir marka gösterme
      this.filteredBrands = [];
      console.log('No products found in search results, showing no brands');
      
      // Tüm seçili markaları temizle
      if (this.selectedBrandIds.length > 0) {
        console.log('Clearing all selected brands as no products were found');
        this.selectedBrandIds = [];
        this.brandsSelected.emit([]);
      }
    }
    // Hiç arama kriteri yoksa (availableBrands undefined veya null ise)
    else {
      // Arama yapılmadıysa tüm markaları göster
      this.filteredBrands = [...this.brands];
      console.log(`No search query, showing all ${this.brands.length} brands`);
    }
  }
  
  // Seçili markaları güncelle - arama sonuçlarında olmayanları kaldır
  private updateSelectedBrandsBasedOnAvailability(availableBrandIds: number[]): void {
    // Seçili markalardan arama sonuçlarında olmayanları tespit et
    const unavailableSelectedBrands = this.selectedBrandIds.filter(
      id => !availableBrandIds.includes(id)
    );
    
    // Eğer arama sonuçlarında olmayan seçili markalar varsa
    if (unavailableSelectedBrands.length > 0) {
      console.log(`Removing ${unavailableSelectedBrands.length} selected brands that are not in search results`);
      
      // Sadece arama sonuçlarında bulunan markaları seçili bırak
      const newSelectedBrands = this.selectedBrandIds.filter(
        id => availableBrandIds.includes(id)
      );
      
      // Değişiklikleri uygula
      this.selectedBrandIds = newSelectedBrands;
      this.brandsSelected.emit(newSelectedBrands);
    }
  }

  // Kategori ID'lerine göre karşılaştırma (string/number uyumsuzluğunu çözer)
  private isEqual(val1: any, val2: any): boolean {
    if (val1 === val2) return true;
    
    // Her iki değer de null veya undefined ise eşittir
    if (val1 == null && val2 == null) return true;
    
    // Bir değer null/undefined ise ve diğeri değilse eşit değildir
    if (val1 == null || val2 == null) return false;
    
    // String ve sayı durumunda sayıya çevirip karşılaştır
    if ((typeof val1 === 'string' || typeof val1 === 'number') && 
        (typeof val2 === 'string' || typeof val2 === 'number')) {
      return Number(val1) === Number(val2);
    }
    
    return false;
  }

  loadBrandsByCategoryIfNeeded(): void {
    // Zaten bu kategori için yükleme yapılmışsa ve aynı ise tekrar yükleme yapmayalım
    if (this.isEqual(this.categoryId, this.lastLoadedCategoryId) && this.brands.length > 0) {
      console.log('Brands already loaded for this category ID, skipping load');
      return;
    }
    
    // Yeni yükleme isteği oluştur
    this.loadBrandsSubject.next(this.categoryId);
  }

  // Asıl marka yükleme işlemini yapan metot
  private performBrandsLoading(categoryId: number | string | null): void {
    this.loading = true;
    this.error = '';
    
    console.log('Loading brands for category ID:', categoryId);
    
    if (categoryId) {
      let categoryIdNumber: number;
      
      // String kategori ID'sini sayıya çevir
      if (typeof categoryId === 'string') {
        if (!isNaN(parseInt(categoryId, 10))) {
          categoryIdNumber = parseInt(categoryId, 10);
        } else {
          console.log('Category ID is not a valid number:', categoryId);
          this.loadAllBrands();
          return;
        }
      } else {
        categoryIdNumber = categoryId;
      }
      
      console.log('Making API call to getBrandsByCategory with categoryId:', categoryIdNumber);
      this.brandService.getBrandsByCategory(categoryIdNumber).subscribe({
        next: (brands) => {
          console.log('Received brands by category:', brands);
          this.brands = brands;
          this.loading = false;
          this.lastLoadedCategoryId = categoryId;
          this.updateFilteredBrands(); // Markaları arama sonuçlarına göre filtrele
        },
        error: (err) => {
          console.error('Error loading brands by category:', err);
          this.error = 'Markalar yüklenirken bir hata oluştu';
          this.loading = false;
          // Hata durumunda tüm markaları yükle
          this.loadAllBrands();
        }
      });
    } else {
      this.loadAllBrands();
    }
  }

  // Tüm markaları yükle
  private loadAllBrands(): void {
    console.log('No category ID, loading all brands');
    this.loading = true;
    
    console.log('Making API call to getBrands');
    this.brandService.getBrands({ size: 50 }).subscribe({
      next: (response) => {
        console.log('Received all brands:', response);
        this.brands = response.items;
        this.loading = false;
        this.lastLoadedCategoryId = null;
        this.updateFilteredBrands(); // Markaları arama sonuçlarına göre filtrele
      },
      error: (err) => {
        console.error('Error loading all brands:', err);
        this.error = 'Markalar yüklenirken bir hata oluştu';
        this.loading = false;
      }
    });
  }

  // Marka seçme işlemi için checkbox değişikliğini takip eden metot
  onBrandCheckboxChange(brandId: number, isChecked: boolean): void {
    console.log(`Brand ${brandId} checkbox changed: ${isChecked}`);
    
    let updatedBrandIds = [...this.selectedBrandIds]; // Mevcut seçimlerin kopyasını al
    
    if (isChecked) {
      // Eğer zaten bu marka seçili değilse ekle
      if (!updatedBrandIds.includes(brandId)) {
        updatedBrandIds.push(brandId);
      }
    } else {
      // Eğer marka seçiliyse kaldır
      updatedBrandIds = updatedBrandIds.filter(id => id !== brandId);
    }
    
    // Değişiklikleri bildir
    this.selectedBrandIds = updatedBrandIds;
    this.brandsSelected.emit(updatedBrandIds);
  }

  // Marka ID'sinin seçili olup olmadığını kontrol eden yardımcı metot
  isBrandSelected(brandId: number): boolean {
    return this.selectedBrandIds.includes(brandId);
  }

  // Tüm marka filtrelerini temizle
  clearFilters(): void {
    console.log('All brand filters cleared');
    this.selectedBrandIds = [];
    this.brandsSelected.emit([]);
  }
} 