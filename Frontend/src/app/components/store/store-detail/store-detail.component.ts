import { Component } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Store } from '../../../models/store.interface';
import { Product } from '../../../models/product.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreService } from '../../../services/store.service';

@Component({
  selector: 'app-store-detail',
  templateUrl: './store-detail.component.html',
  styleUrl: './store-detail.component.css',
  standalone: false
})
export class StoreDetailComponent {
  storeId: string = '';
  store: Store | null = null;
  products: Product[] = [];
  loading = true;
  storeLoading = true;
  error = false;
  
  // Pagination
  totalProducts = 0;
  pageSize = 12;
  pageIndex = 0;
  pageSizeOptions = [12, 24, 36, 48];
  
  // Sorting
  sortOptions = [
    { value: 'price,asc', viewValue: 'Fiyat: Düşükten Yükseğe' },
    { value: 'price,desc', viewValue: 'Fiyat: Yüksekten Düşüğe' },
    { value: 'name,asc', viewValue: 'İsim: A-Z' },
    { value: 'name,desc', viewValue: 'İsim: Z-A' },
    { value: 'rating,desc', viewValue: 'En Yüksek Puanlı' },
    { value: 'createdAt,desc', viewValue: 'En Yeni' }
  ];
  selectedSort = 'createdAt,desc';
  
  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private storeService: StoreService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.storeId = id;
        this.loadStoreDetails();
        this.loadProducts();
      } else {
        this.router.navigate(['/stores']);
      }
    });
  }

  loadStoreDetails(): void {
    this.storeLoading = true;
    
    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        this.store = store;
        this.storeLoading = false;
      },
      error: (err) => {
        console.error('Mağaza detayları yüklenirken hata oluştu:', err);
        this.storeLoading = false;
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.error = false;
    
    // Backend'e sayfalama ve sıralama parametrelerini ekleyebilirsiniz
    // Şimdilik tüm ürünleri alıp istemci tarafında sıralama ve sayfalama yapıyoruz
    this.storeService.getStoreProducts(this.storeId).subscribe({
      next: (products: Product[]) => {
        // Sıralama
        this.sortProducts(products, this.selectedSort);
        // Sayfalama için toplam sayı
        this.totalProducts = products.length;
        // Mevcut sayfa için ürünleri al
        const start = this.pageIndex * this.pageSize;
        const end = start + this.pageSize;
        this.products = products.slice(start, end);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Mağaza ürünleri yüklenirken hata oluştu:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  sortProducts(products: Product[], sortOption: string): void {
    const [field, direction] = sortOption.split(',');
    const isAsc = direction === 'asc';
    
    products.sort((a, b) => {
      let valueA = a[field as keyof Product];
      let valueB = b[field as keyof Product];
      
      // String karşılaştırma
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return isAsc 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // Sayı karşılaştırma
      if (valueA !== undefined && valueB !== undefined) {
        return isAsc 
          ? Number(valueA) - Number(valueB)
          : Number(valueB) - Number(valueA);
      }
      
      return 0;
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  onSortChange(): void {
    this.pageIndex = 0; // Sayfalamayı sıfırla
    this.loadProducts();
  }
}
