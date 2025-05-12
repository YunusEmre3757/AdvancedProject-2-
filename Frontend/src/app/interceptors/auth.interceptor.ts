import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, switchMap, throwError, timer, from, of, finalize, BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private lastRefreshTime = 0;
  private readonly REFRESH_COOLDOWN_MS = 10000; // 10 seconds between refresh attempts
  
  // This subject will emit the new token to all pending requests
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Açık (token gerektirmeyen) endpointler
    const publicEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/store-login',
      '/api/auth/refresh-token',
      '/api/verification/login',
      '/api/verification/register',
      '/api/verification/verify-email',
      '/api/verification/verify-email-change',
      '/api/verification/verify-current-email',
      '/api/verification/resend-registration',
      '/api/verification/check-status',
      '/api/categories',
      '/api/brands',
      '/api/products',
      '/api/products/list',
      '/api/products/featured',
      '/api/products/bestsellers',
      '/api/products/new',
      '/api/products/search',
      '/api/products/category/',
      '/api/products/brand/',
      '/api/files/products', // Ürün resimlerini public olarak işaretle
      '/api/files/common',   // Ortak resim dosyaları
      '/api/files', // Dosya servis endpointi
      // Mağaza public endpoint'leri
      '/api/stores',
      '/api/stores/popular',
      '/api/stores/search',
      '/api/stores/search/products/featured',
      '/api/stores/category/',
      '/api/stores/product-category/',
      '/api/auth/store-login'              // Mağaza giriş endpoint'i
   ];
    
    // Açıkça korumalı admin endpointler - her zaman token ekleyelim
    const adminEndpoints = [
      '/api/admin/',
      '/api/admin/users',
      '/api/admin/users/search',
      '/api/admin/users/role',
      '/api/admin/users/status', // Kullanıcı durumu değiştirme endpointi
      '/api/admin/users/', // Kullanıcı detayları için ID parametreli endpoint
      '/api/admin/stats',
      '/api/admin/orders',
      '/api/admin/orders/search',
      '/api/admin/products',
      '/api/admin/store-applications',
      '/api/admin/pending-users',
      '/api/admin/pending-users/search',
      '/api/admin/pending-users/',
      '/api/admin/pending-users/approve',
      '/api/admin/pending-users/delete',
      '/api/admin/pending-users/resend-verification',
      '/api/admin/users/delete',
      '/api/admin/verification/approve',
      '/api/admin/verification/reject',
      '/api/admin/verification/',
      '/api/admin/orders/search',
      '/api/admin/orders/',
      '/api/admin/orders/status',
      '/api/admin/orders/tracking',
      '/api/admin/orders/cancel',
      '/api/admin/stores',
      '/api/admin/stores/search',
      '/api/admin/stores/all',
      '/api/admin/stores/search/products/featured',
      '/api/admin/stores/category/',
      '/api/admin/stores/product-category/',
      '/api/admin/stores/applications',
      '/api/admin/stores/applications/search',
      '/api/admin/stores/applications/',
      '/api/admin/stores/applications/status',
      '/api/admin/stores/applications/approve',
      '/api/admin/stores/applications/reject',
      '/api/admin/stores/applications/delete',
      '/api/admin/stores/applications/resend-verification',
      '/api/admin/stores/',  // Mağaza ID'li tüm endpointleri kapsar (ban, unban dahil)
      
      

      // '/api/stores/applications' artık admin endpoint'i değil, normal endpoint
    ];

    const sellerEndpoints = [
        // Mağaza sahibine özel korumalı endpointler
        '/api/stores/my-stores',              // Kullanıcının mağazalarını getirme
        '/api/store-orders/',                 // Mağaza siparişleri endpoint'i
        '/api/store-orders/my-stores',        // Tüm mağazaların siparişleri
        '/api/store-orders/stats',            // Mağaza sipariş istatistikleri
        '/api/store-orders/revenue',          // Mağaza gelir bilgisi
        '/api/stores/user/',                  // Kullanıcının mağazaları
        '/api/stores/visitors/stats',         // Mağaza ziyaretçi istatistikleri
        '/api/stores/seller/',                // Satıcılar için özel mağaza görüntüleme endpoint'i
        // Satıcı ürün yönetimi
        '/api/seller-products/count',         // Satıcı ürün sayısı
        '/api/seller-products/',              // Satıcı ürünleri
        // Yeni eklenen seller endpointleri
        '/api/seller/products/',              // Satıcı ürünleri yönetim
        '/api/seller/products/variants/',     // Satıcı ürün varyantları
        '/api/seller/products/variants/status/', // Satıcı ürün varyant durumu
        '/api/seller/products/status/',       // Satıcı ürün durumu güncelleme
        // Mağaza ürünleri yönetimi
        '/api/products/store/',               // Mağaza ürünleri
        '/api/products/create',               // Yeni ürün oluşturma
        '/api/products/update',               // Ürün güncelleme
        '/api/products/delete',               // Ürün silme
        // NOT: Varyant resim endpointleri artık public olarak ayrıca işleniyor
        '/api/products//variants/'            // Diğer varyant işlemleri için kalıp
    ];
    
    // Özel korumalı endpointler - bu URL'leri içeren her istek için token ekleyeceğiz
    const protectedPaths = [
      '/api/stores/applications/me',        // Kullanıcının mağaza başvurularını getirme
      '/api/stores/applications',           // Mağaza başvurusu yaratma
      '/verify-purchase',
      '/helpful',
      '/wishlist',
      '/users/me',
      '/profile',
      '/orders',
      '/cart',
      '/address',
      '/store-orders',
      '/stores/applications', // Mağaza başvuruları için normal auth gerektiren endpoint
      '/stores/my-stores',    // Kullanıcının mağazalarını getirme
      '/stores/user',         // Kullanıcı ID'ye göre mağaza getirme
      '/seller-products',     // Satıcı ürünleri
      '/api/products/create', // Ürün ekleme
      '/api/products/update', // Ürün güncelleme
      '/api/products/delete'
    ];

    const url = request.url;
    
    // Admin endpoint'leri için öncelikli kontrol yap
    const isAdminEndpoint = adminEndpoints.some(endpoint => url.includes(endpoint));
    if (isAdminEndpoint) {
      console.log(`🔒 Admin endpoint - Token ekleniyor: ${url}`);
      const token = this.authService.getAccessToken();
      if (token) {
        request = this.addTokenToRequest(request, token);
      }
      return next.handle(request).pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return this.handle401Error(request, next);
          }
          return throwError(() => error);
        })
      );
    }
    
    // Fixed variant image upload handling - these should be PUBLIC
    const isVariantImageOperation = /\/api\/products\/\d+\/variants\/\d+\/images/.test(url);
    
    if (isVariantImageOperation) {
      console.log(`🔓 Public variant image endpoint: ${url}`);
      return next.handle(request);
    }
    
    // Other seller endpoints still need token
    const isSellerEndpoint = sellerEndpoints.some(endpoint => url.includes(endpoint));
    
    if (isSellerEndpoint) {
      console.log(`🔒 Seller endpoint - Token ekleniyor: ${url}`);
      const token = this.authService.getAccessToken();
      if (token) {
        request = this.addTokenToRequest(request, token);
      }
      return next.handle(request).pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return this.handle401Error(request, next);
          }
          return throwError(() => error);
        })
      );
    }
    
    // Store endpoint'leri için özel kontrol
    // Ürün listeleme ve mağaza detayları herkese açık, sipariş işlemleri korumalı
    if (url.includes('/api/stores/')) {
      // Mağaza durum güncelleme işlemi için özel kontrol
      const isStoreStatusUpdate = /\/api\/stores\/\d+\/update-status/.test(url);
      
      if (isStoreStatusUpdate) {
        console.log(`🔒 Protected store status update - Token required: ${url}`);
        const token = this.authService.getAccessToken();
        if (token) {
          request = this.addTokenToRequest(request, token);
        }
        return next.handle(request).pipe(
          catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
              return this.handle401Error(request, next);
            }
            return throwError(() => error);
          })
        );
      }
      
      // Bir mağaza için store PUT/DELETE işlemi ise kesinlikle token gerektir
      const isStoreUpdateOrDelete = /\/api\/stores\/\d+$/.test(url) && 
                                   (request.method === 'PUT' || request.method === 'DELETE');
      
      if (isStoreUpdateOrDelete) {
        console.log(`🔒 Protected store operation - Token required: ${request.method} ${url}`);
        const token = this.authService.getAccessToken();
        if (token) {
          request = this.addTokenToRequest(request, token);
        }
        return next.handle(request).pipe(
          catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
              return this.handle401Error(request, next);
            }
            return throwError(() => error);
          })
        );
      }
      
      // ID ile başlayan bir mağaza detay GET endpoint'i - public
      const isStoreDetailEndpoint = /\/api\/stores\/\d+$/.test(url) && request.method === 'GET';
      // Mağaza ürünlerini listeleme endpoint'i - public
      const isStoreProductsEndpoint = /\/api\/stores\/\d+\/products/.test(url);
      // Mağaza öne çıkan ürünlerini listeleme endpoint'i - public
      const isStoreFeaturedProductsEndpoint = /\/api\/stores\/\d+\/products\/featured/.test(url);
      
      if (isStoreDetailEndpoint || isStoreProductsEndpoint || isStoreFeaturedProductsEndpoint) {
        console.log(`🔓 Public store endpoint: ${url}`);
        return next.handle(request);
      }
    }
    
    // 1. İstek URL'si korumalı bir endpoint'i içeriyor mu?
    const needsToken = protectedPaths.some(path => url.includes(path));
    
    // 2. İstek URL'si public bir endpoint'e tam olarak eşleşiyor mu?
    const isPublicEndpoint = publicEndpoints.some(endpoint => {
      // Tam yol eşleşmesi yerine path başlangıcını kontrol et
      // URL'nin endpoint ile başlayıp başlamadığını kontrol et
      const urlPath = new URL(url).pathname;
      return urlPath.startsWith(endpoint) && !needsToken;
    });
    
    // Eğer endpoint public değilse veya özel koruma gerektiriyorsa token ekle
    if (!isPublicEndpoint || needsToken) {
      const token = this.authService.getAccessToken();
      if (token) {
        console.log(`🔒 Token ekleniyor: ${url}`);
        request = this.addTokenToRequest(request, token);
      } else {
        console.log(`⚠️ Token bulunamadı: ${url}`);
      }
    } else {
      console.log(`🔓 Public endpoint: ${url}`);
    }

    return next.handle(request).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Only try to refresh if the request isn't already a refresh token request
          if (!request.url.includes('/api/auth/refresh-token')) {
            return this.handle401Error(request, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Check cooldown period to prevent too many refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshTime < this.REFRESH_COOLDOWN_MS) {
      console.log(`⏱️ Token refresh in cooldown period. Please wait ${Math.ceil((this.lastRefreshTime + this.REFRESH_COOLDOWN_MS - now) / 1000)} seconds.`);
      return throwError(() => new HttpErrorResponse({
        error: 'Token refresh in cooldown period',
        status: 429,
        statusText: 'Too Many Requests'
      }));
    }

    if (!this.isRefreshing) {
      // Start refreshing process
      this.isRefreshing = true;
      this.lastRefreshTime = now;
      // Reset the subject to notify other requests that they need to wait
      this.refreshTokenSubject.next(null);

      console.log('🔄 Token expired, attempting to refresh...');

      return this.authService.refreshToken().pipe(
        switchMap((response) => {
          console.log('✅ Token refreshed successfully!');
          
          // Log token info for debugging
          const oldToken = request.headers.get('Authorization') || '';
          console.log('Old token (last 10 chars):', this.getLastChars(oldToken));
          console.log('New token (last 10 chars):', this.getLastChars(`Bearer ${response.accessToken}`));
          
          // Notify all waiting requests that they can proceed with the new token
          this.refreshTokenSubject.next(response.accessToken);
          
          // Create a new request with the new token
          const newRequest = this.addTokenToRequest(request, response.accessToken);
          
          // Complete the refresh process
          this.isRefreshing = false;
          
          return next.handle(newRequest);
        }),
        catchError((refreshError) => {
          console.error('❌ Token refresh failed:', refreshError);
          
          // Notify all waiting requests that the refresh has failed
          this.refreshTokenSubject.next(null);
          this.isRefreshing = false;
          
          // Only logout on specific error conditions, not rate limiting
          if (refreshError.status !== 429) {
            // Force a logout as the refresh token is likely invalid
            this.authService.logout();
          }
          
          return throwError(() => refreshError);
        }),
        finalize(() => {
          this.isRefreshing = false;
        })
      );
    } else {
      // If already refreshing, wait for the new token
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          // Once we get the new token, use it for the retry
          console.log('Using new token from refresh for request:', request.url);
          const newRequest = this.addTokenToRequest(request, token);
          return next.handle(newRequest);
        }),
        catchError(err => {
          console.error('Error waiting for token refresh:', err);
          return throwError(() => new Error('Token refresh failed'));
        })
      );
    }
  }

  // Helper method to get the last N characters of a string (for token debugging)
  private getLastChars(str: string, n: number = 10): string {
    if (!str) return 'empty';
    return str.length <= n ? str : '...' + str.slice(-n);
  }
} 