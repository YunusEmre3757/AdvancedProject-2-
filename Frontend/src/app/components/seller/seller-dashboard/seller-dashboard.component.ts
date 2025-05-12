import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SellerStatsService, SellerStats } from '../../../services/seller-stats.service';
import { SellerOrderService } from '../../../services/seller-order.service';
import { StoreService } from '../../../services/store.service';
import { Store } from '../../../models/store.interface';
import { forkJoin, catchError, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../services/product.service';

interface DashboardStat {
  title: string;
  value: number;
  icon: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'flat';
  color: string;
  colorRgb?: string;
}

@Component({
  selector: 'app-seller-dashboard',
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.css'],
  standalone: false
})
export class SellerDashboardComponent implements OnInit {
  currentUser: any;
  isLoading: boolean = true;
  errorMessage: string = '';
  
  // Satıcının mağazaları
  stores: Store[] = [];
  selectedStore: Store | null = null;
  loadingStores: boolean = true;
  
  // Anlık istatistikler
  stats: DashboardStat[] = [
    {
      title: 'Toplam Ürün',
      value: 0,
      icon: 'fas fa-box',
      trend: 0,
      trendDirection: 'flat',
      color: '#10b981',
      colorRgb: '16, 185, 129'
    },
    {
      title: 'Bugün Satış',
      value: 0,
      icon: 'fas fa-shopping-cart',
      trend: 0,
      trendDirection: 'flat',
      color: '#6366f1',
      colorRgb: '99, 102, 241'
    },
    {
      title: 'Bu Ay Ciro',
      value: 0,
      icon: 'fas fa-lira-sign',
      trend: 0,
      trendDirection: 'flat',
      color: '#f59e0b',
      colorRgb: '245, 158, 11'
    },
    {
      title: 'Bekleyen Sipariş',
      value: 0,
      icon: 'fas fa-hourglass-half',
      color: '#8b5cf6',
      colorRgb: '139, 92, 246'
    }
  ];

  // Toplam sayılar
  productCount: number = 0;
  orderCount: number = 0;
  totalRevenue: number = 0;
  visitorCount: number = 0;

  // Son siparişler
  recentOrders: any[] = [];
  
  // Stok durumu
  lowStockProducts: any[] = [];

  // API yanıtlarını saklamak için
  apiResponses: any = {};

  constructor(
    private router: Router,
    private authService: AuthService,
    private statsService: SellerStatsService,
    private orderService: SellerOrderService,
    private storeService: StoreService,
    private datePipe: DatePipe,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    console.log('Mevcut kullanıcı:', this.currentUser);
    
    // Satıcının mağazalarını yükle
    this.loadStores();
    
    // Direkt API çağrıları ile veri kontrolü
    this.logDirectApiCalls();
    
    // Gerçek verileri yükle
    this.loadDashboardData();
  }
  
  // Satıcının mağazalarını yükle
  loadStores(): void {
    this.loadingStores = true;
    
    this.storeService.getMyStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.loadingStores = false;
        
        if (stores.length > 0) {
          this.selectedStore = stores[0]; // İlk mağazayı seç
        }
        
        console.log('Satıcının mağazaları yüklendi:', this.stores);
      },
      error: (error) => {
        console.error('Mağazalar yüklenirken hata:', error);
        this.loadingStores = false;
      }
    });
  }
  
  // Seçili mağazayı değiştir
  selectStore(store: Store | null): void {
    this.selectedStore = store;
    console.log('Seçilen mağaza:', this.selectedStore);
    
    if (store) {
      // Seçilen mağazanın verilerini yükle
      this.loadStoreData(store.id);
    } else {
      // Genel istatistikleri yükle
      this.loadDashboardData();
    }
  }
  
  // Mağazaya ait verileri yükle
  loadStoreData(storeId: string | number): void {
    this.isLoading = true;
    
    // Seçilen mağazanın istatistiklerini getir
    this.statsService.getStoreStats(storeId).subscribe({
      next: (stats) => {
        console.log('Mağaza istatistikleri geldi:', stats);
        this.updateStats(stats);
        
        // Bu mağazaya ait siparişleri getir
        this.orderService.getStoreOrders(Number(storeId)).subscribe({
          next: (orders) => {
            this.updateOrderCounts(orders);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Mağaza siparişleri yüklenirken hata:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Mağaza istatistikleri yüklenirken hata:', error);
        this.isLoading = false;
        
        // Hata durumunda mock veri kullan
        const mockStats = this.statsService.getMockStats(storeId);
        this.updateStats(mockStats);
      }
    });
  }

  // Her bir API'yi direkt çağırarak logla
  logDirectApiCalls(): void {
    // Ürün sayısı kontrolü
    this.statsService.getProductCount().subscribe({
      next: (count) => {
        console.log('Ürün sayısı (service):', count);
        this.apiResponses['products'] = count;
      },
      error: (err) => console.error('Ürün sayısı alınamadı:', err)
    });

    // Sipariş istatistikleri kontrolü (genel seller stats)
    this.statsService.getSellerStats().subscribe({
      next: (stats) => {
        console.log('Satıcı istatistikleri (service):', stats);
        this.apiResponses['orders'] = stats;
      },
      error: (err) => console.error('Satıcı istatistikleri alınamadı:', err)
    });

    // Gelir bilgisi kontrolü
    this.statsService.getRevenue().subscribe({
      next: (revenue) => {
        console.log('Gelir bilgisi (service):', revenue);
        this.apiResponses['revenue'] = revenue;
      },
      error: (err) => console.error('Gelir bilgisi alınamadı:', err)
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    console.log('Dashboard verileri yükleniyor...');
    
    // Tüm mağazaların ve genel istatistikleri yükle
    forkJoin({
      sellerStats: this.statsService.getSellerStats().pipe(
        catchError(error => {
          console.error('Genel satış istatistikleri yüklenirken hata:', error);
          return of(this.statsService.getMockStats());
        })
      ),
      storesStats: this.statsService.getAllStoresStats().pipe(
        catchError(error => {
          console.error('Mağaza istatistikleri yüklenirken hata:', error);
          return of([]);
        })
      ),
      orders: this.orderService.getAllMyStoresOrders().pipe(
        catchError(error => {
          console.error('Siparişler yüklenirken hata:', error);
          return of([]);
        })
      )
    }).subscribe({
      next: (results) => {
        console.log('API yanıtları:', results);
        
        // Seçili mağaza varsa onun istatistiklerini kullan, yoksa genel istatistikleri kullan
        if (this.selectedStore) {
          const selectedStoreStats = results.storesStats.find(
            stats => stats.storeId === this.selectedStore?.id
          );
          
          if (selectedStoreStats) {
            // Seçili mağazanın istatistiklerini güncelle
            this.updateStats(selectedStoreStats);
            
            // Seçili mağazanın siparişlerini filtrele
            const storeId = this.selectedStore.id;
            const storeOrders = results.orders.filter(order => 
              order.items.some(item => item.storeId === storeId)
            );
            this.updateOrderCounts(storeOrders);
          } else {
            // Eğer seçili mağazanın istatistikleri bulunamazsa API'den bu mağazaya ait verileri al
            this.loadSelectedStoreStats();
          }
        } else {
          // Hiçbir mağaza seçili değilse genel istatistikleri göster
          this.updateStats(results.sellerStats);
          
          // Tüm siparişleri göster
          this.updateOrderCounts(results.orders);
        }
        
        // Yükleme tamamlandı
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Dashboard verileri yüklenirken hata:', error);
        this.errorMessage = 'Veriler yüklenirken bir sorun oluştu.';
        this.isLoading = false;
        
        // Hata durumunda mock veri kullan
        const mockStats = this.statsService.getMockStats();
        this.updateStats(mockStats);
      }
    });
  }
  
  // Seçili mağazanın istatistiklerini yükle
  loadSelectedStoreStats(): void {
    if (!this.selectedStore) return;
    
    const storeId = this.selectedStore.id;
    const storeName = this.selectedStore.name;
    
    this.statsService.getStoreStats(storeId).subscribe({
      next: (stats) => {
        console.log('Seçili mağaza istatistikleri:', stats);
        this.updateStats(stats);
      },
      error: (error) => {
        console.error(`Mağaza (ID: ${storeId}) istatistikleri yüklenirken hata:`, error);
        // Hata durumunda mock veri kullan
        const mockStats = this.statsService.getMockStats(storeId, storeName);
        this.updateStats(mockStats);
      }
    });
  }

  // API'den gelen istatistikleri UI'daki stats dizisine aktar
  updateStats(stats: SellerStats): void {
    console.log('Güncellenecek istatistikler:', stats);
    
    this.stats[0].value = stats.totalProducts;
    this.stats[0].trend = stats.productTrend || 0;
    this.stats[0].trendDirection = (stats.productTrend || 0) > 0 ? 'up' : (stats.productTrend || 0) < 0 ? 'down' : 'flat';
    
    this.stats[1].value = stats.todaySales;
    this.stats[1].trend = stats.saleTrend || 0;
    this.stats[1].trendDirection = (stats.saleTrend || 0) > 0 ? 'up' : (stats.saleTrend || 0) < 0 ? 'down' : 'flat';
    
    this.stats[2].value = stats.monthlyRevenue;
    this.stats[2].trend = stats.revenueTrend || 0;
    this.stats[2].trendDirection = (stats.revenueTrend || 0) > 0 ? 'up' : (stats.revenueTrend || 0) < 0 ? 'down' : 'flat';
    
    this.stats[3].value = stats.pendingOrders;
    
    // UI özet alanları için değerleri ata
    this.productCount = stats.totalProducts;
    
    console.log('Güncellenen stat değerleri:', this.stats);
    console.log('Ürün sayısı:', this.productCount);
  }

  // Sipariş sayılarını güncelle
  updateOrderCounts(orders: any[]): void {
    console.log('Güncellenecek siparişler:', orders);
    
    // Son 5 siparişi al
    this.recentOrders = orders
      .sort((a, b) => {
        // Tarih alanlarına göre sırala (createdAt ya da date)
        const dateA = a.createdAt ? 
          (Array.isArray(a.createdAt) ? new Date(a.createdAt[0], a.createdAt[1]-1, a.createdAt[2]) : new Date(a.createdAt)) : 
          (a.date ? new Date(a.date) : new Date());
        
        const dateB = b.createdAt ? 
          (Array.isArray(b.createdAt) ? new Date(b.createdAt[0], b.createdAt[1]-1, b.createdAt[2]) : new Date(b.createdAt)) : 
          (b.date ? new Date(b.date) : new Date());
        
        return dateB.getTime() - dateA.getTime(); // Azalan sırada
      })
      .filter(order => {
        // Siparişte seçili mağazaya ait en az bir ürün içeriyorsa göster
        if (!this.selectedStore || !order.items || order.items.length === 0) {
          return true; // Mağaza seçili değilse veya items yoksa tüm siparişleri göster
        }
        
        return order.items.some((item: any) => 
          item.storeId === this.selectedStore?.id
        );
      })
      .slice(0, 5)
      .map(order => {
        // Tarih formatını düzenle
        const orderDate = order.createdAt ? 
          (Array.isArray(order.createdAt) ? new Date(order.createdAt[0], order.createdAt[1]-1, order.createdAt[2]) : new Date(order.createdAt)) : 
          (order.date ? new Date(order.date) : new Date());
        
        let storeAmount = 0;
        let storeStatus = order.status;
        
        // Seçili mağazaya ait veya kullanıcının tüm mağazalarına ait tutarı hesapla
        if (order.items && order.items.length > 0) {
          if (this.selectedStore) {
            // Belirli bir mağaza seçildiyse, sadece o mağazanın ürünlerini filtrele
            const storeItems = order.items.filter((item: any) => 
              item.storeId === this.selectedStore?.id
            );
            
            // Seçili mağazanın bu siparişten toplam tutarını hesapla
            storeAmount = storeItems.reduce((total: number, item: any) => 
              total + (item.price * item.quantity), 0
            );
            
            // Mağazanın ürünlerinin durumunu belirle
            // Öncelik sırası: PENDING > PROCESSING > SHIPPED
            if (storeItems.length > 0) {
              const pendingItems = storeItems.filter((item: any) => item.status === 'PENDING' || !item.status);
              const processingItems = storeItems.filter((item: any) => item.status === 'PROCESSING');
              const shippedItems = storeItems.filter((item: any) => item.status === 'SHIPPED');
              
              if (pendingItems.length > 0) {
                storeStatus = 'PENDING'; // En az bir ürün PENDING ise, sipariş PENDING
              } else if (processingItems.length > 0) {
                storeStatus = 'PROCESSING'; // PENDING ürün yoksa ve en az bir ürün PROCESSING ise, sipariş PROCESSING
              } else if (shippedItems.length === storeItems.length) {
                storeStatus = 'SHIPPED'; // Tüm ürünler SHIPPED ise, sipariş SHIPPED
              }
            }
          } else {
            // Mağaza seçili değilse, kullanıcının tüm mağazalarına ait ürünlerin tutarını hesapla
            const userStoreIds = this.stores.map(store => store.id);
            // Kullanıcının sahip olduğu mağazalara ait olan ürünleri filtrele
            const userItems = order.items.filter((item: any) => 
              userStoreIds.includes(item.storeId)
            );
            
            // Kullanıcının tüm mağazalarının bu siparişten toplam tutarını hesapla
            storeAmount = userItems.reduce((total: number, item: any) => 
              total + (item.price * item.quantity), 0
            );
            
            // Kullanıcının tüm mağazalarının ürünlerinin ortak durumunu belirle
            if (userItems.length > 0) {
              const pendingItems = userItems.filter((item: any) => item.status === 'PENDING' || !item.status);
              const processingItems = userItems.filter((item: any) => item.status === 'PROCESSING');
              const shippedItems = userItems.filter((item: any) => item.status === 'SHIPPED');
              
              if (pendingItems.length > 0) {
                storeStatus = 'PENDING';
              } else if (processingItems.length > 0) {
                storeStatus = 'PROCESSING';
              } else if (shippedItems.length === userItems.length) {
                storeStatus = 'SHIPPED';
              }
            }
          }
        } else {
          // Eğer items yoksa tüm siparişin tutarını göster
          storeAmount = order.total || order.totalPrice || 0;
        }
        
        return {
          id: order.orderNumber || `#${order.id}`,
          date: orderDate,
          customer: order.userName || order.customerName || 'Misafir',
          amount: storeAmount,
          status: storeStatus
        };
      });
    
    console.log('Güncellenmiş son siparişler:', this.recentOrders);
    
    // Bekleyen sipariş sayısını güncelle - mağaza seçiliyse onun bekleyen siparişleri
    let pendingOrdersCount = 0;
    let activeOrdersCount = 0;
    let totalRevenue = 0;
    
    orders.forEach(order => {
      if (!order.items || order.items.length === 0) return;
      
      // Mağazaya ait ürünleri filtrele
      let storeItems = [];
      if (this.selectedStore) {
        // Belirli bir mağaza seçiliyse, sadece o mağazanın ürünlerini filtrele
        storeItems = order.items.filter((item: any) => item.storeId === this.selectedStore?.id);
      } else {
        // Mağaza seçili değilse, kullanıcının tüm mağazalarına ait ürünleri filtrele
        const userStoreIds = this.stores.map(store => store.id);
        storeItems = order.items.filter((item: any) => userStoreIds.includes(item.storeId));
      }
      
      if (storeItems.length === 0) return; // Kullanıcının mağazasına ait ürün yoksa atla
      
      // Mağazaya özel durum belirle
      const pendingItems = storeItems.filter((item: any) => item.status === 'PENDING' || !item.status);
      const processingItems = storeItems.filter((item: any) => item.status === 'PROCESSING');
      const shippedItems = storeItems.filter((item: any) => item.status === 'SHIPPED');
      
      // Mağazanın bu siparişten tutarı
      const storeAmount = storeItems.reduce((total: number, item: any) => 
        total + (item.price * item.quantity), 0
      );
      
      // Toplam gelire ekle
      totalRevenue += storeAmount;
      
      // Mağazanın bu siparişi bekliyor mu?
      if (pendingItems.length > 0) {
        pendingOrdersCount++; // En az bir ürün PENDING ise, bekleyen sipariş
      }
      
      // Siparişte aktif işlemde olan ürünlerimiz var mı?
      if (pendingItems.length > 0 || processingItems.length > 0) {
        activeOrdersCount++; // PENDING veya PROCESSING ürün varsa aktif sipariş
      }
    });
    
    // İstatistikleri güncelle
    this.stats[3].value = pendingOrdersCount;
    console.log('Bekleyen sipariş sayısı:', pendingOrdersCount);
    
    this.orderCount = activeOrdersCount;
    console.log('Aktif sipariş sayısı:', activeOrdersCount);
    
    // Toplam geliri güncelle
    this.totalRevenue = totalRevenue;
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'status-pending';
      case 'PROCESSING': return 'status-processing';
      case 'SHIPPED': return 'status-shipped';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  getStatusText(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'Beklemede';
      case 'PROCESSING': return 'Hazırlanıyor';
      case 'SHIPPED': return 'Kargoda';
      case 'DELIVERED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  }

  formatDate(date: Date): string {
    if (!date) return '';
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  // Para birimi formatı
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  navigateToProducts(storeId?: string | number): void {
    console.log('Navigating to products for store ID:', storeId);
    if (storeId) {
      this.router.navigate(['/seller/products/store', storeId]);
    } else {
      this.router.navigate(['/seller/products']);
    }
  }

  navigateToOrders(storeId?: string | number): void {
    if (storeId) {
      this.router.navigate(['/seller/orders', 'store', storeId]);
    } else {
      this.router.navigate(['/seller/orders']);
    }
  }
  
  // Mağaza detaylarına git
  navigateToStoreDetails(storeId: string): void {
    this.router.navigate(['/seller/store', storeId]);
  }

  // Logout method
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Redirect to login page
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Çıkış yaparken hata oluştu:', err);
      }
    });
  }
} 