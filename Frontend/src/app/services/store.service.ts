import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Store } from '../models/store.interface';
import { Product } from '../models/product.interface';
import { environment } from '../../environments/environment';

// Store Application için interface
export interface StoreApplication {
  id?: string;
  name: string;
  description: string;
  categoryId: string | number;
  phone: string;
  email: string;
  taxNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned' | 'inactive';
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private apiUrl = `${environment.apiUrl}/stores`;
  
  constructor(private http: HttpClient) { }



  //KULLANILIYOR
  // Tüm mağazaları getir
  getStores(): Observable<Store[]> {
    console.log('StoreService: Tüm mağazalar getiriliyor');
    return this.http.get<Store[]>(this.apiUrl).pipe(
      map(stores => {
        console.log('StoreService: Mağazalar geldi:', stores);
        
        // Status değerleri kontrolü
        if (stores.length > 0) {
          const statusCounts = stores.reduce((acc, store) => {
            const status = store.status || 'undefined';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log('StoreService: Mağaza status dağılımı:', statusCounts);
          
          // Eksik status değerlerini kontrol et
          stores.forEach(store => {
            if (!store.status) {
              console.warn(`StoreService: ID=${store.id} olan mağazanın status değeri yok`);
            }
          });
        }
        
        return stores;
      }),
      catchError(this.handleError)
    );
  }

  // Satıcının kendi mağazalarını getir
  getMyStores(): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.apiUrl}/my-stores`).pipe(
      map(stores => {
        console.log('StoreService: Satıcının mağazaları geldi:', stores);
        return stores;
      }),
      catchError(this.handleError)
    );
  }

  // Satıcının kendi mağazalarını getir (kategori detayları ile)
  getMyStoresWithCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-stores?includeCategories=true`).pipe(
      map(stores => {
        console.log('StoreService: Satıcının kategorileri ile mağazaları geldi:', stores);
        return stores;
      }),
      catchError(this.handleError)
    );
  }

  // ID'ye göre mağaza getir
  getStoreById(id: string): Observable<Store> {
    console.log(`Fetching store details for ID: ${id}`);
    return this.http.get<Store>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        console.log(`Store details received for ID ${id}:`, response);
        return response;
      }),
      catchError(error => {
        console.error(`Error fetching store with ID ${id}:`, error);
        return throwError(() => new Error(`Mağaza bilgileri alınamadı: ${error.message}`));
      })
    );
  }

  // Satıcı olarak mağaza detaylarını getir (inactive mağazalar dahil)
  getStoreDetailsForSeller(id: string): Observable<Store> {
    return this.http.get<Store>(`${this.apiUrl}/seller/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Mağazaya ait ürünleri getir
  getStoreProducts(storeId: string): Observable<Product[]> {
    console.log(`Fetching products for store ID: ${storeId}`);
    return this.http.get<Product[]>(`${this.apiUrl}/${storeId}/products`).pipe(
      map(products => {
        console.log(`Received ${products.length} products for store ID ${storeId}`);
        return products;
      }),
      catchError(error => {
        console.error(`Error fetching products for store ID ${storeId}:`, error);
        return throwError(() => new Error(`Mağaza ürünleri alınamadı: ${error.message}`));
      })
    );
  }

  // Yeni mağaza ekle
  createStore(store: Omit<Store, 'id' | 'createdAt'>): Observable<Store> {
    return this.http.post<Store>(this.apiUrl, store).pipe(
      catchError(this.handleError)
    );
  }

  // Mağaza güncelle
  updateStore(id: string, store: Partial<Store>): Observable<Store> {
    console.log(`Mağaza güncelleniyor: ID=${id}`);
    return this.http.put<Store>(`${this.apiUrl}/${id}`, store).pipe(
      map(response => {
        console.log('Mağaza başarıyla güncellendi:', response);
        return response;
      }),
      catchError(error => {
        console.error('Mağaza güncellenirken hata oluştu:', error);
        if (error.status === 401) {
          console.warn('Yetkilendirme hatası - Token yenilenecek');
        }
        return throwError(() => new Error(`Mağaza güncellenirken hata: ${error.status} ${error.statusText}`));
      })
    );
  }

  // Mağaza sil
  deleteStore(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Mağazanın öne çıkan ürünlerini getir
  getFeaturedStoreProducts(storeId: string, limit: number = 8): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${storeId}/products/featured`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // Mağaza arama
  searchStores(query: string): Observable<Store[]> {
    return this.http.get<any>(`${this.apiUrl}/search`, {
      params: { q: query }
    }).pipe(
      map(response => {
        // Check if response has content property (Page<Store> response)
        if (response && response.content) {
          console.log('StoreService: Mağaza arama sonuçları (Page):', response.content);
          return response.content;
        } else if (Array.isArray(response)) {
          console.log('StoreService: Mağaza arama sonuçları (Array):', response);
          return response;
        } else {
          console.warn('StoreService: Beklenmeyen yanıt formatı:', response);
          return [];
        }
      }),
      catchError(error => {
        console.error('StoreService: Mağaza arama hatası:', error);
        return throwError(() => new Error(`Mağaza arama hatası: ${error.message}`));
      })
    );
  }
  
  // Popüler mağazaları getir
  getPopularStores(limit: number = 6): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.apiUrl}/popular`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // Kategoriye göre mağazaları getir
  getStoresByCategory(category: string): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.apiUrl}/category/${category}`).pipe(
      catchError(this.handleError)
    );
  }

  // Mağaza başvurusu
  createStoreApplication(application: Omit<StoreApplication, 'id' | 'createdAt' | 'updatedAt'>): Observable<StoreApplication> {
    return this.http.post<StoreApplication>(`${this.apiUrl}/applications`, application).pipe(
      catchError(this.handleError)
    );
  }
  
  // Mağaza başvurularını getir (Admin için)
  getStoreApplications(status?: string): Observable<StoreApplication[]> {
    let url = `${this.apiUrl}/applications`;
    if (status) {
      url += `?status=${status}`;
    }
    return this.http.get<StoreApplication[]>(url).pipe(
      catchError(this.handleError)
    );
  }
  
  // Mağaza başvuru detayını getir
  getStoreApplication(id: string): Observable<StoreApplication> {
    return this.http.get<StoreApplication>(`${this.apiUrl}/applications/${id}`).pipe(
      catchError(this.handleError)
    );
  }
  
  // Mağaza başvurusunu güncelle (Admin için)
  updateStoreApplication(id: string, updates: Partial<StoreApplication>): Observable<StoreApplication> {
    return this.http.put<StoreApplication>(`${this.apiUrl}/applications/${id}`, updates).pipe(
      catchError(this.handleError)
    );
  }
  
  // Kullanıcının kendi başvurularını getir
  getCurrentUserApplications(): Observable<StoreApplication[]> {
    return this.http.get<StoreApplication[]>(`${this.apiUrl}/applications/me`).pipe(
      catchError(error => {
        // Yetki hatası veya kimlik doğrulama hatası durumunda boş liste döndür
        if (error.status === 401 || error.status === 403) {
          console.warn('Mağaza başvuruları için yetki hatası:', error.status, error.statusText);
          return of([]);
        }
        
        // Diğer hatalar için normal hata işleme
        console.error('Mağaza başvuruları alınırken hata:', error);
        return throwError(() => new Error(`Mağaza başvuruları alınamadı: ${error.message || 'Sunucu hatası'}`));
      })
    );
  }

  // Kullanıcının başvurusunu geri çek
  withdrawStoreApplication(applicationId: string): Observable<StoreApplication> {
    return this.http.post<StoreApplication>(`${this.apiUrl}/applications/${applicationId}/withdraw`, {}).pipe(
      map(response => {
        console.log('Mağaza başvurusu geri çekildi:', response);
        return response;
      }),
      catchError(error => {
        console.error('Mağaza başvurusu geri çekilirken hata oluştu:', error);
        return throwError(() => new Error(`Başvuru geri çekilirken hata: ${error.message || 'Sunucu hatası'}`));
      })
    );
  }

  // Logo yükleme metodu
  uploadLogo(storeId: string, logoFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    return this.http.post<any>(`${this.apiUrl}/${storeId}/logo`, formData);
  }
  
  // Banner görsel yükleme metodu
  uploadBanner(storeId: string, bannerFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('banner', bannerFile);
    
    return this.http.post<any>(`${this.apiUrl}/${storeId}/banner`, formData);
  }

  // Mağaza durumunu güncelle (satıcılar için özel endpoint)
  updateStoreStatus(storeId: string, status: string): Observable<Store> {
    return this.http.patch<Store>(`${this.apiUrl}/${storeId}/update-status`, { status }).pipe(
      map(response => {
        console.log('Mağaza durumu başarıyla güncellendi:', response);
        return response;
      }),
      catchError(error => {
        console.error('Mağaza durumu güncellenirken hata oluştu:', error);
        return throwError(() => new Error(`Mağaza durumu güncellenirken hata: ${error.status} ${error.statusText}`));
      })
    );
  }

  // Admin için tüm mağazaları getir
  getAllStores(): Observable<Store[]> {
    console.log('StoreService: Admin için tüm mağazaları getirme isteği yapılıyor');
    
    return this.http.get<Store[]>(`${environment.apiUrl}/admin/stores/all`).pipe(
      map(stores => {
        console.log('StoreService: Admin için tüm mağazalar yüklendi:', stores.length);
        return stores;
      }),
      catchError(error => {
        if (error.status === 401) {
          console.error('StoreService: Yetki hatası, admin yetkileriniz gerekli:', error);
          return throwError(() => new Error('Bu işlem için admin yetkilerine sahip olmanız gerekmektedir'));
        }
        console.error('StoreService: Tüm mağazaları getirirken hata:', error);
        return throwError(() => new Error('Mağazalar yüklenirken bir hata oluştu'));
      })
    );
  }

  // Hata işleme
  private handleError(error: any) {
    console.error('API hatası:', error);
    return throwError(() => new Error(error.message || 'Sunucu hatası'));
  }
} 