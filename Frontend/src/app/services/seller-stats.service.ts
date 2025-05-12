import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SellerStats {
  totalProducts: number;
  todaySales: number;
  monthlyRevenue: number;
  pendingOrders: number;
  totalOrders?: number;
  productTrend?: number;
  saleTrend?: number;
  revenueTrend?: number;
  storeId?: number;
  storeName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SellerStatsService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  // Satıcının tüm istatistiklerini getir
  getSellerStats(): Observable<SellerStats> {
    return this.http.get<any>(`${this.apiUrl}/store-orders/stats`).pipe(
      map(response => this.mapResponseToSellerStats(response)),
      catchError(error => {
        console.error('Satıcı istatistikleri getirilemedi', error);
        return of(this.getMockStats());
      })
    );
  }

  // Belirli bir mağazanın istatistiklerini getir
  getStoreStats(storeId: number | string): Observable<SellerStats> {
    return this.http.get<any>(`${this.apiUrl}/store-orders/store/${storeId}/stats`).pipe(
      map(response => this.mapResponseToSellerStats(response)),
      catchError(error => {
        console.error(`Mağaza (ID: ${storeId}) istatistikleri getirilemedi`, error);
        return of(this.getMockStats(storeId));
      })
    );
  }

  // Satıcının tüm mağazalarının istatistiklerini getir
  getAllStoresStats(): Observable<SellerStats[]> {
    return this.http.get<any[]>(`${this.apiUrl}/store-orders/stores/stats`).pipe(
      map(response => response.map(store => this.mapResponseToSellerStats(store))),
      catchError(error => {
        console.error('Tüm mağazaların istatistikleri getirilemedi', error);
        // Mock veri: 3 farklı mağaza için istatistikler oluştur
        return of([
          this.getMockStats(1, 'Mağaza 1'),
          this.getMockStats(2, 'Mağaza 2'),
          this.getMockStats(3, 'Mağaza 3')
        ]);
      })
    );
  }

  // API yanıtını SellerStats'a dönüştür
  private mapResponseToSellerStats(response: any): SellerStats {
    return {
      totalProducts: response.totalProducts || 0,
      todaySales: response.todaySales || 0,
      monthlyRevenue: response.monthlyRevenue || 0,
      pendingOrders: response.pendingOrders || 0,
      productTrend: response.productTrend || 0,
      saleTrend: response.saleTrend || 0,
      revenueTrend: response.revenueTrend || 0,
      storeId: response.storeId,
      storeName: response.storeName
    };
  }

  // Satıcı istatistiklerini getir (eski yöntem)
  getSellerStatsOld(): Observable<SellerStats> {
    console.log('SellerStatsService: API istekleri yapılıyor...');
    
    return forkJoin({
      products: this.http.get<any>(`${this.apiUrl}/seller-products/count`).pipe(
        catchError(error => {
          console.error('SellerStatsService: Ürün sayısı alınırken hata oluştu', error);
          return of(0);
        })
      ),
      orders: this.http.get<any>(`${this.apiUrl}/store-orders/stats`).pipe(
        catchError(error => {
          console.error('SellerStatsService: Sipariş istatistikleri alınırken hata oluştu', error);
          return of({});
        })
      ),
      revenue: this.http.get<any>(`${this.apiUrl}/store-orders/revenue`).pipe(
        catchError(error => {
          console.error('SellerStatsService: Gelir bilgisi alınırken hata oluştu', error);
          return of({});
        })
      )
     
    }).pipe(
      map(results => {
        console.log('SellerStatsService: Ham API sonuçları:', results);
        
        // Her bir API yanıtını detaylı logla
        console.log('SellerStatsService: Ürün API yanıtı:', results.products);
        console.log('SellerStatsService: Sipariş API yanıtı:', results.orders);
        console.log('SellerStatsService: Gelir API yanıtı:', results.revenue);
        
        // API yanıtlarının yapıları
        console.log('SellerStatsService: Ürün sayısı değeri tipi:', typeof results.products);
        
        // SellerStats nesnesini oluştur
        const stats: SellerStats = {
          // Ürün sayısı doğrudan bir sayı olarak geliyor, bu nedenle direkt olarak kullanıyoruz
          totalProducts: typeof results.products === 'number' ? results.products : 0,
          todaySales: results.orders?.todaySales || 0,
          monthlyRevenue: results.orders?.monthlyRevenue || results.revenue?.yearlyTotal || 0,
          pendingOrders: results.orders?.pendingOrders || 0,
          productTrend: results.orders?.productTrend || 0,
          saleTrend: results.orders?.saleTrend || 0,
          revenueTrend: results.orders?.revenueTrend || results.revenue?.revenueTrend || 0
        };
        
        console.log('SellerStatsService: Oluşturulan stats nesnesi:', stats);
        
        return stats;
      }),
      catchError(error => {
        console.error('SellerStatsService: Tüm istatistikler alınırken genel hata oluştu', error);
        return of(this.getMockStats());
      })
    );
  }

  // Mock veri oluştur (API çalışmadığında)
  getMockStats(storeId?: number | string, storeName?: string): SellerStats {
    return {
      totalProducts: Math.floor(Math.random() * 50) + 10,
      todaySales: Math.floor(Math.random() * 5),
      monthlyRevenue: Math.floor(Math.random() * 10000) + 1000,
      pendingOrders: Math.floor(Math.random() * 8),
      productTrend: Math.floor(Math.random() * 20) - 10,
      saleTrend: Math.floor(Math.random() * 30) - 5,
      revenueTrend: Math.floor(Math.random() * 25) - 5,
      storeId: storeId ? Number(storeId) : undefined,
      storeName: storeName
    };
  }

  // Son siparişleri getir
  getRecentOrders(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/store-orders/recent?limit=${limit}`);
  }

  // Stok durumu düşük ürünleri getir
  getLowStockProducts(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/seller-products/low-stock?limit=${limit}`);
  }

  // Ürün sayısını getir (satıcıya ait toplam ürün)
  getProductCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/seller-products/count`).pipe(
      catchError(error => {
        console.error('Ürün sayısı getirilemedi', error);
        return of(0);
      })
    );
  }

  // Toplam gelir bilgisini getir (tüm mağazalar için)
  getRevenue(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/store-orders/revenue`).pipe(
      catchError(error => {
        console.error('Gelir bilgisi getirilemedi', error);
        return of({ yearlyTotal: 0 });
      })
    );
  }
} 