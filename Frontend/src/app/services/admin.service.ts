import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.interface';
import { map, catchError } from 'rxjs/operators';

export interface DashboardStats {
  totalUsers: number;
  newUsers: number;
  orders: number;
  ordersPercentage: number;
  stores: number;
  newStores: number;
  products: number;
  newProducts: number;
}

export interface StoreApplication {
  id: string;
  name: string;
  logo?: string;
  owner: string;
  date: Date | string | number[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'banned' | 'inactive';
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // Kullanıcı listesini getir
  getUsers(page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`, {
      params: { page: page.toString(), size: size.toString() }
    }).pipe(
      map(response => {
        // Kullanıcı tarih verilerini işle
        if (response && response.content && Array.isArray(response.content)) {
          response.content = this.processUserDates(response.content);
        }
        return response;
      })
    );
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${userId}`);
  }

  // Kullanıcı arama
  searchUsers(query: string, page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/search`, {
      params: { query, page: page.toString(), size: size.toString() }
    }).pipe(
      map(response => {
        // Kullanıcı tarih verilerini işle
        if (response && response.content && Array.isArray(response.content)) {
          response.content = this.processUserDates(response.content);
        }
        return response;
      })
    );
  }

  // Kullanıcı tarih verilerini işle
  private processUserDates(users: any[]): any[] {
    return users.map(user => {
      console.log('İşlenmeden önceki kullanıcı:', JSON.stringify(user));
      
      // createdAt ve updatedAt tarihlerini işle
      ['createdAt', 'updatedAt', 'birthDate'].forEach(dateField => {
        if (user[dateField]) {
          try {
            console.log(`${dateField} tarihini işleme, tipi:`, typeof user[dateField], 'değeri:', user[dateField]);
            
            // Eğer tarih verisi bir dizi ise, Date nesnesine dönüştürelim
            if (Array.isArray(user[dateField])) {
              const dateParts = user[dateField];
              console.log(`${dateField}: Dizi formatında tarih:`, dateParts);
              
              if (dateParts.length >= 3) {
                const year = dateParts[0];
                const month = dateParts[1] - 1; // JavaScript'te aylar 0-11 arası
                const day = dateParts[2];
                
                let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
                if (dateParts.length > 3) hours = dateParts[3];
                if (dateParts.length > 4) minutes = dateParts[4];
                if (dateParts.length > 5) seconds = dateParts[5];
                if (dateParts.length > 6) {
                  // Milisaniye değerini daha düzgün yönetmek için
                  milliseconds = Math.min(999, parseInt(String(dateParts[6]).substring(0, 3)));
                }
                
                const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
                
                // Geçerli bir tarih oluştu mu kontrol et
                if (!isNaN(date.getTime())) {
                  user[dateField] = date;
                  console.log(`${dateField}: Oluşturulan tarih:`, user[dateField]);
                } else {
                  // UTC formatında dene
                  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
                  user[dateField] = utcDate;
                  console.log(`${dateField}: UTC olarak oluşturulan tarih:`, user[dateField]);
                }
              } else {
                console.warn(`${dateField}: Yetersiz tarih bileşenleri:`, dateParts);
                user[dateField] = null; // Geçerli bir tarih oluşturulamadı
              }
            } 
            // String formatında tarih ve virgülle ayrılmış [yıl,ay,gün] formatı
            else if (typeof user[dateField] === 'string') {
              const dateStr = user[dateField] as string;
              
              // Virgülle ayrılmış tarih değerleri [2023,5,15,...]
              if (dateStr.includes(',')) {
                const dateParts = dateStr.replace(/[\[\]]/g, '').split(',').map(part => parseInt(part.trim(), 10));
                console.log(`${dateField}: Virgülle ayrılmış tarih parçaları:`, dateParts);
                
                if (dateParts.length >= 3) {
                  const year = dateParts[0];
                  const month = dateParts[1] - 1;
                  const day = dateParts[2];
                  
                  let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
                  if (dateParts.length > 3) hours = dateParts[3];
                  if (dateParts.length > 4) minutes = dateParts[4];
                  if (dateParts.length > 5) seconds = dateParts[5];
                  if (dateParts.length > 6) {
                    // Milisaniye değerini daha düzgün yönetmek için
                    milliseconds = Math.min(999, parseInt(String(dateParts[6]).substring(0, 3)));
                  }
                  
                  const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
                  if (!isNaN(date.getTime())) {
                    user[dateField] = date;
                    console.log(`${dateField}: Virgülle ayrılmış tarihten oluşturulan:`, user[dateField]);
                  } else {
                    // UTC olarak dene
                    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
                    user[dateField] = utcDate;
                    console.log(`${dateField}: UTC olarak oluşturulan tarih:`, user[dateField]);
                  }
                } else {
                  console.warn(`${dateField}: Yetersiz tarih bileşenleri:`, dateParts);
                  user[dateField] = null;
                }
              }
              // ISO string format 2023-05-15T10:30:45...
              else if (dateStr.includes('T') || dateStr.includes('-')) {
                user[dateField] = new Date(dateStr);
                console.log(`${dateField}: ISO formatından oluşturulan tarih:`, user[dateField]);
              }
              // Basit sayısal değer (timestamp)
              else if (!isNaN(Number(dateStr))) {
                user[dateField] = new Date(Number(dateStr));
                console.log(`${dateField}: Timestamp değerinden oluşturulan tarih:`, user[dateField]);
              }
              // Diğer string formatları için genel dönüşüm
              else {
                const tempDate = new Date(dateStr);
                if (!isNaN(tempDate.getTime())) {
                  user[dateField] = tempDate;
                  console.log(`${dateField}: Genel dönüşümle oluşturulan tarih:`, user[dateField]);
                } else {
                  console.warn(`${dateField}: Geçersiz tarih formatı:`, dateStr);
                  user[dateField] = null;
                }
              }
            }
            // Timestamp sayı değeri
            else if (typeof user[dateField] === 'number') {
              user[dateField] = new Date(user[dateField]);
              console.log(`${dateField}: Sayıdan oluşturulan tarih:`, user[dateField]);
            }
            
            // Geçerli bir tarih mi kontrol et
            if (user[dateField] instanceof Date && isNaN(user[dateField].getTime())) {
              console.warn(`${dateField}: Geçersiz tarih oluştu:`, user[dateField]);
              user[dateField] = null;
            }
          } catch (error) {
            console.error(`${dateField} tarihini işlerken hata:`, error);
            user[dateField] = null;
          }
        } else {
          console.log(`${dateField} alanı bulunamadı veya null/undefined`);
        }
      });
      
      console.log('İşlenmiş kullanıcı:', JSON.stringify(user));
      return user;
    });
  }

  // Kullanıcıya admin rolü ver
  addAdminRole(email: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/role/admin`, { email });
  }

  // Kullanıcıdan admin rolünü kaldır
  removeAdminRole(email: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/users/role/admin`, {
      body: { email }
    });
  }
  
  // Kullanıcıya satıcı rolü ver
  addSellerRole(email: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/role/seller`, { email });
  }

  // Kullanıcıdan satıcı rolünü kaldır
  removeSellerRole(email: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/users/role/seller`, {
      body: { email }
    });
  }
  
  // Dashboard istatistiklerini getir
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }
  
  // Mağaza başvurularını getir
  getStoreApplications(): Observable<StoreApplication[]> {
    return this.http.get<StoreApplication[]>(`${this.apiUrl}/store-applications`)
      .pipe(
        map(applications => {
          console.log('Backendden gelen tüm mağaza başvuruları:', JSON.stringify(applications));
          
          return applications.map(app => {
            console.log('İşlenmeden önce tarihin tipi:', typeof app.date);
            console.log('İşlenmeden önce tarihin değeri:', app.date);
            
            // Status kontrolü yaparak eksik status değerlerini düzelt
            if (!app.status) {
              console.warn(`"${app.name}" mağazası için status bilgisi yok, 'pending' olarak ayarlanıyor`);
              app.status = 'pending';
            }
            
            // Tarih null veya undefined ise
            if (!app.date) {
              console.warn('Tarih verisi yok! (null/undefined)');
              app.date = null;
              return app;
            }
            
            try {
              // Eğer date bir dizi ise (doğrudan JSON olarak geliyor)
              if (Array.isArray(app.date)) {
                const dateParts = app.date as number[];
                console.log('Tarih bir dizi olarak geldi, dönüştürülüyor:', dateParts);
                
                if (dateParts.length >= 3) {
                  // Format: yıl, ay-1 (JS'de aylar 0'dan başlar), gün, saat, dakika, saniye, milisaniye
                  const year = dateParts[0];
                  const month = dateParts[1] - 1; // JavaScript'te aylar 0-11 arasında
                  const day = dateParts[2];
                  
                  let hour = 0, minute = 0, second = 0, millisecond = 0;
                  if (dateParts.length > 3) hour = dateParts[3];
                  if (dateParts.length > 4) minute = dateParts[4];
                  if (dateParts.length > 5) second = dateParts[5];
                  if (dateParts.length > 6) millisecond = dateParts[6];
                  
                  app.date = new Date(year, month, day, hour, minute, second, millisecond);
                  console.log('Diziden oluşturulan tarih:', app.date);
                } else {
                  console.error('Tarih dizisinde yeterli eleman yok:', dateParts);
                  app.date = null;
                }
                return app;
              }
            
              // Ensure the date is properly parsed as a Date object
              if (!(app.date instanceof Date)) {
                const originalDateValue = app.date; // Orijinal değeri saklayalım, hata durumunda raporlamak için
                const dateStr = app.date as string;
                
                // Handle LocalDateTime serialized to array format "[2025,4,30,13,11,2,340289000]"
                if (dateStr.includes(',')) {
                  const dateParts = dateStr.split(',').map((part: string) => parseInt(part.trim(), 10));
                  console.log('Parçalara ayrılmış tarih:', dateParts);
                  
                  if (dateParts.length >= 3) {
                    // Format: yıl, ay-1 (JS'de aylar 0'dan başlar), gün, saat, dakika, saniye, milisaniye
                    const year = dateParts[0];
                    const month = dateParts[1] - 1; // JavaScript'te aylar 0-11 arasında
                    const day = dateParts[2];
                    
                    let hour = 0, minute = 0, second = 0, millisecond = 0;
                    if (dateParts.length > 3) hour = dateParts[3];
                    if (dateParts.length > 4) minute = dateParts[4];
                    if (dateParts.length > 5) second = dateParts[5];
                    if (dateParts.length > 6) millisecond = dateParts[6];
                    
                    app.date = new Date(year, month, day, hour, minute, second, millisecond);
                    console.log('Diziden oluşturulan tarih:', app.date);
                  }
                }
                // Handle ISO format "2025-04-30T13:11:02.340289"
                else if (dateStr.includes('T') && dateStr.includes('-')) {
                  app.date = new Date(dateStr);
                  console.log('ISO formatından oluşturulan tarih:', app.date);
                }
                // Handle standard date format "2025-04-30 13:11:02.340289"
                else if (dateStr.includes('-') && dateStr.includes(':')) {
                  // Replace space with T to make it ISO compatible
                  const isoStr = dateStr.replace(' ', 'T');
                  app.date = new Date(isoStr);
                  console.log('Standart formatından oluşturulan tarih:', app.date);
                }
                // Any other format, try direct parsing
                else {
                  app.date = new Date(dateStr);
                  console.log('Doğrudan ayrıştırma ile oluşturulan tarih:', app.date);
                }
                
                // Tarihin geçerli olup olmadığını kontrol et
                if (isNaN((app.date as Date).getTime())) {
                  console.error('Geçersiz tarih oluşturuldu. Orijinal değer:', originalDateValue);
                  // Tarih geçersizse, null atayalım, şu anki tarihi değil
                  app.date = null;
                } else {
                  console.log('Başarılı tarih dönüşümü:', app.date);
                }
              }
            } catch (error) {
              console.error('Tarih ayrıştırma hatası:', error, 'Orijinal değer:', app.date);
              // Hata durumunda null atayalım, şu anki tarihi değil
              app.date = null;
            }
            return app;
          });
        })
      );
  }
  
  // Sadece bekleyen (pending) mağaza başvurularını getir
  getPendingStoreApplications(): Observable<StoreApplication[]> {
    // Artık store-applications endpointinden status=pending parametresiyle sorgu yapabiliriz
    return this.http.get<StoreApplication[]>(`${this.apiUrl}/store-applications?status=pending`)
      .pipe(
        map(applications => {
          console.log('Backendden gelen bekleyen başvurular:', applications);
          
          // Date alanını düzelt
          return applications.map(app => {
            // Date işleme kodu mevcut getStoreApplications metodundaki gibi
            // Tarih null veya undefined ise
            if (!app.date) {
              app.date = null;
              return app;
            }
            
            try {
              // Eğer date bir dizi ise dönüştür
              if (Array.isArray(app.date)) {
                const dateParts = app.date as number[];
                if (dateParts.length >= 3) {
                  const year = dateParts[0];
                  const month = dateParts[1] - 1;
                  const day = dateParts[2];
                  
                  let hour = 0, minute = 0, second = 0, millisecond = 0;
                  if (dateParts.length > 3) hour = dateParts[3];
                  if (dateParts.length > 4) minute = dateParts[4];
                  if (dateParts.length > 5) second = dateParts[5];
                  if (dateParts.length > 6) millisecond = dateParts[6];
                  
                  app.date = new Date(year, month, day, hour, minute, second, millisecond);
                } else {
                  app.date = null;
                }
              }
              // String ise gerekli kontroller getStoreApplications metodundaki gibi
              // Burada zaten status kontrolü yapmıyoruz çünkü backend'den sadece pending olanlar geliyor
            } catch (error) {
              app.date = null;
            }
            return app;
          });
        })
      );
  }
  
  // Mağaza başvurusunu güncelle (onaylama veya reddetme)
  updateStoreApplication(id: string, status: 'approved' | 'rejected'): Observable<StoreApplication> {
    console.log(`Mağaza başvurusu güncelleniyor: ID=${id}, status=${status}`);
    
    // Backend'e başvuru durumunu güncelle
    return this.http.patch<StoreApplication>(
      `${this.apiUrl}/store-applications/${id}`, 
      { status }
    ).pipe(
      map(response => {
        console.log('Başvuru güncelleme yanıtı:', response);
        
        // Eğer response içinde status yoksa veya beklenmeyen bir değerse düzelt
        if (!response.status || (response.status !== 'approved' && response.status !== 'rejected')) {
          console.warn(`Başvuru ${id} için backend'den dönen status uygun değil:`, response.status);
          response.status = status; // Manuel olarak istenen status'u set et
        }
        
        return response;
      })
    );
  }

  /**
   * Mağazayı yasaklar (ban)
   */
  banStore(storeId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/stores/${storeId}/ban`, {});
  }
  
  /**
   * Mağaza yasağını kaldırır (unban)
   */
  unbanStore(storeId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/stores/${storeId}/unban`, {});
  }

  /**
   * Mağazayı ve ilişkili tüm verileri siler
   */
  deleteStore(storeId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/stores/${storeId}`);
  }

  /**
   * Mağaza durumunu günceller (approved/rejected/inactive)
   */
  updateStoreStatus(storeId: number, status: 'approved' | 'rejected' | 'inactive'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/stores/${storeId}/status`, { status })
      .pipe(
        catchError(err => {
          console.error(`Mağaza durumu "${status}" olarak güncellenirken hata:`, err);
          return throwError(() => new Error(`Mağaza durumu "${status}" olarak güncellenemedi: ` + (err.error?.message || err.message || 'Bilinmeyen hata')));
        })
      );
  }

  /**
   * Admin için tüm mağazaları (her statüden) getir
   */
  getAllStores(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stores/all`);
  }

  // Kullanıcı detaylarını getir
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      map(user => {
        // Kullanıcı tarih verilerini işle
        const processedUser = this.processUserDates([user])[0];
        return processedUser;
      })
    );
  }

  // Kullanıcı durumunu değiştir (aktif/pasif)
  toggleUserStatus(email: string, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/status`, { email, isActive }).pipe(
      map(user => {
        // Kullanıcı tarih verilerini işle
        const processedUser = this.processUserDates([user])[0];
        return processedUser;
      })
    );
  }

  
  // Bekleyen kullanıcıları getir (sayfalama ile)
  getPendingUsers(page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get(`${this.apiUrl}/verification/pending-users`, { params })
      .pipe(
        catchError(err => {
          console.error('Bekleyen kullanıcılar getirilemedi:', err);
          return throwError(() => new Error('Bekleyen kullanıcılar getirilemedi.'));
        })
      );
  }
  
  // Bekleyen kullanıcıları ara (sayfalama ile)
  searchPendingUsers(query: string, page: number, size: number): Observable<any> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get(`${this.apiUrl}/verification/search-pending-users`, { params })
      .pipe(
        catchError(err => {
          console.error('Bekleyen kullanıcılar aranırken hata:', err);
          return throwError(() => new Error('Bekleyen kullanıcılar aranamadı.'));
        })
      );
  }
  
  // Bekleyen kullanıcıyı onayla
  approvePendingUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/verification/approve/${userId}`, {})
      .pipe(
        catchError(err => {
          console.error('Kullanıcı onaylanamadı:', err);
          return throwError(() => new Error('Kullanıcı onaylanamadı.'));
        })
      );
  }
  
  // Bekleyen kullanıcıyı sil
  deletePendingUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/verification/reject/${userId}`)
      .pipe(
        catchError(err => {
          console.error('Bekleyen kullanıcı silinemedi:', err);
          return throwError(() => new Error('Bekleyen kullanıcı silinemedi.'));
        })
      );
  }
  
  // Doğrulama e-postasını yeniden gönder
  resendVerificationEmail(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/verification/${userId}/resend-verification`, {})
      .pipe(
        catchError(err => {
          console.error('Doğrulama e-postası gönderilemedi:', err);
          return throwError(() => new Error('Doğrulama e-postası gönderilemedi.'));
        })
      );
  }

  // Mağazayı pasif yap (inactive)
  setStoreInactive(storeId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/stores/${storeId}/set-inactive`, {})
      .pipe(
        catchError(err => {
          console.error('Mağaza pasif yapılırken hata:', err);
          return throwError(() => new Error('Mağaza pasif yapılamadı: ' + (err.error?.message || err.message || 'Bilinmeyen hata')));
        })
      );
  }
}
