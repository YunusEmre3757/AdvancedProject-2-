import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SellerOrderService, Order } from '../../../services/seller-order.service';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-seller-orders',
  templateUrl: './seller-orders.component.html',
  styleUrls: ['./seller-orders.component.css'],
  standalone: false,
  providers: [DatePipe]
})
export class SellerOrdersComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  currentFilter: string = 'all';
  selectedStoreId: number | null = null;
  storeTitle: string = 'Tüm Mağazalar';
  
  // Mağaza filtreleme için eklenen özellikler
  stores: {id: number, name: string}[] = [];
  filterByStore: boolean = false;

  statusTranslations: {[key: string]: string} = {
    'PENDING': 'Beklemede',
    'PROCESSING': 'Hazırlanıyor',
    'SHIPPING': 'Kargoda',
    'DELIVERED': 'Teslim Edildi',
    'CANCELLED': 'İptal Edildi'
  };

  constructor(
    private orderService: SellerOrderService,
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // URL parametrelerini kontrol et (store/:storeId şeklinde gelirse)
    this.route.params.subscribe(params => {
      if (params['storeId']) {
        this.selectedStoreId = Number(params['storeId']);
        this.loadStoreOrders(this.selectedStoreId);
      } else {
        this.loadAllOrders();
      }
    });
  }

  loadAllOrders(): void {
    this.isLoading = true;
    this.storeTitle = 'Tüm Mağazalar';
    
    this.orderService.getAllMyStoresOrders().subscribe({
      next: (data) => {
        console.log('Yüklenen ham sipariş verileri (tüm mağazalar):', data);
        this.orders = this.processOrders(data);
        
        // Debug: İşlenmiş siparişleri incele
        console.log('İşlenmiş sipariş verileri:', this.orders);
        console.log('Müşteri adları:', this.orders.map(o => ({
          id: o.id,
          name: o.customerName,
          original: (o as any).customer ? (o as any).customer.name : 'yok',
          userName: o.userName || 'yok'
        })));
        
        // Siparişlerden mağaza bilgilerini çıkar
        this.extractStoresFromOrders();
        
        this.applyFilter(this.currentFilter);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Siparişler yüklenirken hata oluştu:', error);
        this.errorMessage = 'Siparişler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }

  loadStoreOrders(storeId: number): void {
    this.isLoading = true;
    
    this.orderService.getStoreOrders(storeId).subscribe({
      next: (data) => {
        console.log(`Yüklenen ham sipariş verileri (Mağaza ID: ${storeId}):`, data);
        
        // Mağaza adını ayarla - API'den alamıyorsak ID ile göster
        this.storeTitle = `Mağaza #${storeId}`;
        
        this.orders = this.processOrders(data);
        this.applyFilter(this.currentFilter);
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`Mağaza (ID: ${storeId}) siparişleri yüklenirken hata oluştu:`, error);
        this.errorMessage = 'Siparişler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }

  // Siparişlerden mağaza bilgilerini çıkar ve tekrar etmeyecek şekilde listele
  extractStoresFromOrders(): void {
    this.stores = [];
    const uniqueStores = new Map<number, string>();
    
    this.orders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          if (item.storeId && !uniqueStores.has(item.storeId)) {
            // Mağaza adı yerine sadece ID'sini kullan
            const storeName = `Mağaza #${item.storeId}`;
            uniqueStores.set(item.storeId, storeName);
          }
        });
      }
    });
    
    // Map'ten array'e dönüştür
    uniqueStores.forEach((name, id) => {
      this.stores.push({id, name});
    });
    
    // Alfabetik sırala
    this.stores.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Belirli bir mağazaya ait siparişleri filtrele
  filterOrdersByStore(storeId: number | null): void {
    this.selectedStoreId = storeId;
    this.filterByStore = storeId !== null;
    
    if (!storeId) {
      // Tüm siparişleri göster
      this.applyFilter(this.currentFilter);
      return;
    }
    
    // Önce durum filtresini uygula
    this.applyFilter(this.currentFilter);
    
    // Sonra mağaza filtresini uygula
    this.filteredOrders = this.filteredOrders.filter(order => {
      // Order'ın items array'inde belirtilen storeId'ye sahip öğe var mı kontrol et
      return order.items && order.items.some(item => item.storeId === storeId);
    });
    
    // Seçilen mağazanın adını başlıkta göster
    const selectedStore = this.stores.find(store => store.id === storeId);
    if (selectedStore) {
      this.storeTitle = selectedStore.name;
    } else {
      this.storeTitle = `Mağaza #${storeId}`;
    }
  }

  // Eski fonksiyon - uyumluluk için tutuluyor
  loadOrders(): void {
    if (this.selectedStoreId) {
      this.loadStoreOrders(this.selectedStoreId);
    } else {
      this.loadAllOrders();
    }
  }

  // Dashboard'daki filtreleme mantığını takip ederek, mağazaya özel sipariş durumunu belirle
  getOrderStatusForStore(order: Order, storeId: number | null = null): string {
    if (!order.items || order.items.length === 0) {
      return order.status;
    }
    
    // Mağazaya ait ürünleri filtrele
    let storeItems = [];
    if (storeId) {
      // Belirli bir mağaza seçiliyse, sadece o mağazanın ürünlerini filtrele
      storeItems = order.items.filter(item => item.storeId === storeId);
    } else if (this.selectedStoreId) {
      // Seçili mağaza varsa onu kullan
      storeItems = order.items.filter(item => item.storeId === this.selectedStoreId);
    } else {
      // Tüm mağazaların ürünlerini kullan
      const userStoreIds = this.stores.map(store => store.id);
      storeItems = order.items.filter(item => userStoreIds.includes(item.storeId));
    }
    
    if (storeItems.length === 0) {
      return order.status;
    }
    
    // Ürün durumlarını kontrol et
    const pendingItems = storeItems.filter(item => !item.status || item.status === 'PENDING');
    const processingItems = storeItems.filter(item => item.status === 'PROCESSING');
    const shippingItems = storeItems.filter(item => item.status === 'SHIPPING');
    
    // Öncelik sırası: PENDING > PROCESSING > SHIPPING
    if (pendingItems.length > 0) {
      return 'PENDING'; // En az bir ürün PENDING ise, sipariş PENDING
    } else if (processingItems.length > 0) {
      return 'PROCESSING'; // PENDING ürün yoksa ve en az bir ürün PROCESSING ise, sipariş PROCESSING
    } else if (shippingItems.length === storeItems.length) {
      return 'SHIPPING'; // Tüm ürünler SHIPPING ise, sipariş SHIPPING
    }
    
    // Diğer durumlar için orijinal sipariş durumunu kullan
    return order.status;
  }

  // Siparişleri işleyerek müşteri, tarih ve tutar bilgilerinin düzgün gösterilmesini sağlar
  processOrders(orders: Order[]): Order[] {
    return orders.map(order => {
      // Tarihlerin formatını düzenle
      let formattedDate = 'Belirtilmemiş';
      try {
        // Tarih bir array olarak geliyor ([yıl, ay, gün, saat, dakika, saniye, milisaniye])
        if (order.createdAt && Array.isArray(order.createdAt) && order.createdAt.length >= 6) {
          // Diziden Date objesi oluştur (ay değeri 0'dan başlar, backend 1'den başlıyor olabilir)
          const dateArray = order.createdAt;
          const year = dateArray[0];
          const month = dateArray[1] - 1; // JavaScript'te aylar 0'dan başlar
          const day = dateArray[2];
          const hour = dateArray[3] || 0;
          const minute = dateArray[4] || 0;
          const second = dateArray[5] || 0;
          
          const dateObj = new Date(year, month, day, hour, minute, second);
          formattedDate = this.datePipe.transform(dateObj, 'dd.MM.yyyy HH:mm') || 'Belirtilmemiş';
        } else if (order.createdAt && typeof order.createdAt === 'string') {
          // String olarak geldiyse direkt kullan
          formattedDate = this.datePipe.transform(order.createdAt, 'dd.MM.yyyy HH:mm') || 'Belirtilmemiş';
        } else if (order.date) {
          // createdAt yoksa date alanını kontrol et
          if (Array.isArray(order.date) && order.date.length >= 6) {
            const dateArray = order.date;
            const dateObj = new Date(
              dateArray[0], 
              dateArray[1] - 1, 
              dateArray[2],
              dateArray[3] || 0,
              dateArray[4] || 0,
              dateArray[5] || 0
            );
            formattedDate = this.datePipe.transform(dateObj, 'dd.MM.yyyy HH:mm') || 'Belirtilmemiş';
          } else if (typeof order.date === 'string') {
            formattedDate = this.datePipe.transform(order.date, 'dd.MM.yyyy HH:mm') || 'Belirtilmemiş';
          }
        }
      } catch (error) {
        console.error('Tarih formatlanırken hata:', error);
        formattedDate = 'Geçersiz Tarih';
      }
      
      // Toplam fiyatı formatla
      let formattedTotal = 'Belirtilmemiş';
      try {
        // Toplam fiyat hesapla
        const total = order.totalPrice || order.total || this.calculateTotalFromItems(order);
        formattedTotal = total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
      } catch (error) {
        console.error('Toplam fiyat formatlanırken hata:', error);
        formattedTotal = 'Geçersiz Tutar';
      }
      
      // Müşteri adını direkt name ve username alanlarından al
      const customerName = (order as any).name || (order as any).username || order.userName || 'Belirtilmemiş';
      const customerPhone = (order as any).phone || order.userPhoneNumber || 'Belirtilmemiş';
      const customerEmail = (order as any).email || order.userEmail || '';
      
      // Sipariş durumunu mağazaya özel olarak belirle
      const storeStatus = this.getOrderStatusForStore(order);
      
      return {
        ...order,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        formattedDate: formattedDate,
        formattedTotal: formattedTotal,
        storeStatus: storeStatus // Mağazaya özel durumu ekle
      };
    });
  }

  translateOrderStatuses(): void {
    // Durumları çevirme - sadece UI için
    // Orijinal değerleri koruyoruz, sadece Türkçe gösterilmesini sağlıyoruz
    // Bu sayede filtreleme doğru çalışacak
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;

    if (filter === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(order => {
        // Dashboard'daki gibi durum değil, storeStatus alanını kontrol et
        const orderStatus = (order as any).storeStatus?.toUpperCase() || '';
        
        switch(filter) {
          case 'pending': return orderStatus === 'PENDING';
          case 'processing': return orderStatus === 'PROCESSING';
          case 'shipping': return orderStatus === 'SHIPPING';
          case 'delivered': return orderStatus === 'DELIVERED';
          case 'cancelled': return orderStatus === 'CANCELLED';
          default: return false;
        }
      });
    }
    
    // Eğer mağaza filtresi aktifse, o filtreyi de uygula
    if (this.filterByStore && this.selectedStoreId) {
      this.filteredOrders = this.filteredOrders.filter(order => {
        return order.items && order.items.some(item => item.storeId === this.selectedStoreId);
      });
    }
  }

  getStatusClass(status: string): string {
    // Durum adını büyük harfe çevirerek kontrolü daha güvenli hale getir
    const statusUpper = status?.toUpperCase() || '';
    
    switch (statusUpper) {
      case 'PENDING': return 'status-pending';
      case 'PROCESSING': return 'status-processing';
      case 'SHIPPING': return 'status-shipped';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-unknown';
    }
  }
  
  getStatusText(status: string): string {
    // Durum adını büyük harfe çevirerek kontrolü daha güvenli hale getir
    const statusUpper = status?.toUpperCase() || '';
    
    switch (statusUpper) {
      case 'PENDING': return 'Beklemede';
      case 'PROCESSING': return 'Hazırlanıyor';
      case 'SHIPPING': return 'Kargoda';
      case 'DELIVERED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  }
  
  // Sipariş detay sayfasına yönlendirme
  navigateToOrderDetail(order: Order): void {
    // Sipariş nesnesinden store ID'sini al
    const storeId = this.selectedStoreId || order.items.find(item => item.storeId)?.storeId;
    
    if (!storeId) {
      console.error('Mağaza ID bulunamadı!');
      return;
    }
    
    // Sipariş detay sayfasına yönlendir
    this.router.navigate(['/seller/orders/store', storeId, 'detail', order.id]);
  }
  
  // Siparişte takip numarası var mı kontrol et
  hasTrackingNumber(order: Order): boolean {
    return order.items && order.items.some(item => item.trackingNumber && item.trackingNumber.trim() !== '');
  }
  
  // Siparişin ilk takip numarasını getir
  getFirstTrackingNumber(order: Order): string {
    if (!order.items) return '';
    const itemWithTracking = order.items.find(item => item.trackingNumber && item.trackingNumber.trim() !== '');
    return itemWithTracking ? itemWithTracking.trackingNumber! : '';
  }

  // Siparişin toplam tutarını öğelerinden hesapla
  calculateTotalFromItems(order: Order): number {
    if (!order.items || order.items.length === 0) return 0;
    
    return order.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  // Seçili mağazaya ait ürünlerin toplam tutarını hesapla
  calculateStoreTotal(order: Order): number {
    if (!order.items || order.items.length === 0) return 0;
    
    // Eğer bir mağaza seçilmişse, sadece o mağazaya ait ürünleri topla
    if (this.selectedStoreId) {
      return order.items
        .filter(item => item.storeId === this.selectedStoreId)
        .reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    // Hiçbir mağaza seçilmemişse tüm tutarı göster
    return this.calculateTotalFromItems(order);
  }

  // Template'te kullanılmak üzere, sipariş için mağaza durumunu döndür
  getOrderStoreStatus(order: Order): string {
    return this.getOrderStatusForStore(order, this.selectedStoreId);
  }

  // Yeni eklenen logout metodu
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Kullanıcı çıkış yaptıktan sonra login sayfasına yönlendir
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Çıkış yaparken hata oluştu:', err);
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/seller/dashboard']);
  }
}

