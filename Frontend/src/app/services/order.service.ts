import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order } from '../models/order.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private storeOrdersUrl = `${environment.apiUrl}/store-orders`;
  private adminOrdersUrl = `${environment.apiUrl}/admin/orders`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Kullanıcının tüm siparişlerini getir
  getUserOrders(): Observable<Order[]> {
    const userId = this.authService.getUserId();
    if (userId) {
      return this.http.get<Order[]>(`${this.apiUrl}/user/${userId}`)
        .pipe(
          catchError(error => {
            console.error('Siparişler alınırken hata oluştu', error);
            return of([]);
          })
        );
    }
    return of([]);
  }

  // Sipariş detaylarını getir
  getOrderDetails(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`)
      .pipe(
        catchError(error => {
          console.error('Sipariş detayları alınırken hata oluştu', error);
          throw error;
        })
      );
  }

  // Sipariş oluştur (test endpoint kullanarak)
  createOrder(orderData: any): Observable<Order> {
    // Test endpoint'i ile token kontrolünü bypass et
    return this.http.post<Order>(`${this.apiUrl}`, orderData)
      .pipe(
        catchError(error => {
          console.error('Sipariş oluşturulurken hata oluştu', error);
          throw error;
        })
      );
  }

  // Siparişi iptal et
  cancelOrder(orderId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${orderId}/cancel`, {})
      .pipe(
        catchError(error => {
          console.error('Sipariş iptal edilirken hata oluştu', error);
          throw error;
        })
      );
  }
  
  // Siparişin belirli bir öğesini iptal et
  cancelOrderItem(orderId: number, itemId: number): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}/items/${itemId}/cancel`, {})
      .pipe(
        catchError(error => {
          console.error('Sipariş öğesi iptal edilirken hata oluştu', error);
          throw error;
        })
      );
  }
  
  // --- Mağaza Siparişleri İşlemleri ---
  
  // Mağazaya ait siparişleri getir
  getStoreOrders(storeId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.storeOrdersUrl}/${storeId}`)
      .pipe(
        catchError(error => {
          console.error('Mağaza siparişleri alınırken hata oluştu', error);
          return of([]);
        })
      );
  }
  
  // Kullanıcının tüm mağazalarına ait siparişleri getir
  getAllStoreOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.storeOrdersUrl}/my-stores`)
      .pipe(
        catchError(error => {
          console.error('Tüm mağaza siparişleri alınırken hata oluştu', error);
          return of([]);
        })
      );
  }
  
  // Sipariş durumunu güncelle (mağaza sahibi için)
  updateStoreOrderStatus(storeId: number, orderId: number, status: string): Observable<Order> {
    return this.http.patch<Order>(
      `${this.storeOrdersUrl}/${storeId}/${orderId}/status`, 
      { status }
    ).pipe(
      catchError(error => {
        console.error('Sipariş durumu güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }
  
  // Takip numarasını güncelle (mağaza sahibi için)
  updateTrackingNumber(storeId: number, orderId: number, trackingNumber: string): Observable<any> {
    return this.http.patch(
      `${this.storeOrdersUrl}/${storeId}/${orderId}/tracking`, 
      { trackingNumber }
    ).pipe(
      catchError(error => {
        console.error('Takip numarası güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }

  // Sipariş öğesinin durumunu güncelle (mağaza sahibi için)
  updateOrderItemStatus(storeId: number, orderId: number, itemId: number, status: string): Observable<any> {
    return this.http.patch(
      `${this.storeOrdersUrl}/${storeId}/${orderId}/items/${itemId}/status`, 
      { status }
    ).pipe(
      catchError(error => {
        console.error('Sipariş öğesi durumu güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }

  // Sipariş öğesinin takip numarasını güncelle
  updateOrderItemTrackingNumber(orderId: number, itemId: number, trackingNumber: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${orderId}/items/${itemId}/tracking`, 
      { trackingNumber }
    ).pipe(
      catchError(error => {
        console.error('Sipariş öğesi takip numarası güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }
  

  // Admin için tüm siparişleri getir
  getAllOrders(status: string | null = null): Observable<Order[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Order[]>(this.adminOrdersUrl, { params })
      .pipe(
        catchError(error => {
          console.error('Tüm siparişler alınırken hata oluştu', error);
          return of([]);
        })
      );
  }

  // Admin için sipariş arama
  searchOrders(query: string, status: string | null = null): Observable<Order[]> {
    let params = new HttpParams().set('q', query);
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Order[]>(`${this.adminOrdersUrl}/search`, { params })
      .pipe(
        catchError(error => {
          console.error('Sipariş arama hatası', error);
          return of([]);
        })
      );
  }

  // Admin için sipariş durumu güncelleme
  updateOrderStatus(orderId: number, status: string): Observable<Order> {
    return this.http.patch<Order>(
      `${this.adminOrdersUrl}/${orderId}/status`, 
      { status }
    ).pipe(
      catchError(error => {
        console.error('Sipariş durumu güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }

  // Admin için takip numarası güncelleme
  updateAdminTrackingNumber(orderId: number, trackingNumber: string): Observable<Order> {
    return this.http.patch<Order>(
      `${environment.apiUrl}/orders/${orderId}/tracking`, 
      { trackingNumber }
    ).pipe(
      catchError(error => {
        console.error('Takip numarası güncellenirken hata oluştu', error);
        throw error;
      })
    );
  }

  // Admin için sipariş silme
  deleteOrder(orderId: number): Observable<any> {
    return this.http.delete<any>(
      `${this.adminOrdersUrl}/${orderId}`
    ).pipe(
      catchError(error => {
        console.error('Sipariş silinirken hata oluştu', error);
        throw error;
      })
    );
  }
} 