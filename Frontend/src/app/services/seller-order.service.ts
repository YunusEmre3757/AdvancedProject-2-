import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, of, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  storeId: number;
  status?: string;
  image?: string;
  trackingNumber?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  date?: string | any[];  // string ya da array olabilir
  createdAt?: string | any[];  // string ya da array olabilir
  updatedAt?: string | any[];  // string ya da array olabilir
  total?: number;
  totalPrice?: number;  // API'den bazen total yerine totalPrice geliyorsa
  status: string;
  items: OrderItem[];
  paymentStatus?: string;
  paymentMethod?: string;
  userName?: string;  // Müşterinin adı direkt gelebilir
  userPhoneNumber?: string;  // Müşterinin telefonu direkt gelebilir
  userEmail?: string;  // Müşterinin e-postası direkt gelebilir
  userId?: number;  // Müşteri ID'si
  address?: string;  // Adres bilgisi ayrı alanda da gelebilir
  paymentIntentId?: string;  // Ödeme ile ilgili ekstra alanlar
  cancelledAt?: string | any[];
  refundAmount?: number;
  refundId?: string;
  refundStatus?: string;
  
  // UI için eklenen alanlar
  formattedDate?: string;
  formattedTotal?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SellerOrderService {
  private apiUrl = environment.apiUrl + "/store-orders";

  constructor(private http: HttpClient) { }

  // Satıcı olarak tüm mağazaların siparişlerini getir
  getAllMyStoresOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my-stores`);
  }

  // Belirli bir mağazanın siparişlerini getir
  getStoreOrders(storeId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/${storeId}`);
  }

  // Sipariş durumunu güncelle - ARTIK KULLANILMAMALI
  // Bu metod kaldırılmalı, çünkü satıcılar artık tüm sipariş durumunu değil
  // sadece kendi ürünlerinin durumunu güncelleyebilirler
  updateOrderStatus(storeId: number, orderId: number, newStatus: string): Observable<Order> {
    console.warn('This method is deprecated. Sellers should only update their own products statuses.');
    return this.http.patch<Order>(
      `${this.apiUrl}/${storeId}/${orderId}/status`,
      { status: newStatus }
    );
  }

  // Kargo takip numarasını güncelle - ARTIK KULLANILMAMALI
  // Bu metod kaldırılmalı, çünkü satıcılar artık tüm siparişin takip numarasını değil
  // sadece kendi ürünlerinin takip numarasını güncelleyebilirler
  updateTrackingNumber(storeId: number, orderId: number, trackingNumber: string): Observable<any> {
    console.warn('This method is deprecated. Sellers should only update tracking for their own products.');
    return this.http.patch(
      `${this.apiUrl}/${storeId}/${orderId}/tracking`,
      { trackingNumber: trackingNumber }
    );
  }

  // Sipariş öğesinin durumunu güncelle
  updateOrderItemStatus(storeId: number, orderId: number, itemId: number, status: string): Observable<Order> {
    // Durumu standardize edelim
    const standardizedStatus = this.standardizeStatus(status);
    
    // Hangi parametrelerle istek yaptığımızı görelim
    console.log('Sipariş durumu güncelleniyor:', {
      storeId, 
      orderId, 
      itemId, 
      originalStatus: status,
      standardizedStatus,
      requestBody: { status: standardizedStatus }
    });
    
    return this.http.patch<Order>(
      `${this.apiUrl}/${storeId}/${orderId}/items/${itemId}/status`,
      { status: standardizedStatus }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Backend'in kabul edeceği formatta durum değerlerini standardize etme
  private standardizeStatus(status: string): string {
    if (!status) return 'PENDING';
    
    // Durumu büyük harfe çevir ve boşlukları temizle
    status = status.toUpperCase().trim();
    
    switch (status) {
      case 'PENDING': 
      case 'PROCESSING': 
      case 'SHIPPING': 
      case 'DELIVERED': 
      case 'CANCELLED':
        return status;
      case 'CANCELED':
        return 'CANCELLED'; // CANCELED -> CANCELLED (Amerikan vs İngiliz İngilizcesi)
      default:
        console.warn(`Bilinmeyen durum değeri: ${status}, PENDING kullanılıyor`);
        return 'PENDING';
    }
  }

  // Sipariş öğesinin takip numarasını güncelle
  updateOrderItemTrackingNumber(storeId: number, orderId: number, itemId: number, trackingNumber: string): Observable<any> {
    // Body'de trackingNumber'ı gönder
    return this.http.patch(`${this.apiUrl}/${storeId}/${orderId}/items/${itemId}/tracking`, { trackingNumber })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Belirli bir siparişteki satıcıya ait ürünleri kontrol et
  checkSellerItems(storeId: number, order: Order): boolean {
    if (!order || !order.items || order.items.length === 0) {
      return false;
    }
    
    // En az bir ürün satıcıya ait mi?
    return order.items.some(item => item.storeId === storeId);
  }

  // Belirli bir ürünün satıcıya ait olup olmadığını kontrol et
  isItemBelongsToSeller(storeId: number, item: OrderItem): boolean {
    return item && item.storeId === storeId;
  }

  // Hata yönetimi
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Bir hata oluştu';
    
    if (error.error instanceof ErrorEvent) {
      // İstemci taraflı hata
      errorMessage = `Hata: ${error.error.message}`;
    } else {
      // Sunucu taraflı hata
      errorMessage = `Sunucu hata kodu: ${error.status}, Mesaj: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
} 