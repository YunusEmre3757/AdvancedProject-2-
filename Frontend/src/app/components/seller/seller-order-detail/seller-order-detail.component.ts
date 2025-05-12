import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SellerOrderService, Order } from '../../../services/seller-order.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-seller-order-detail',
  templateUrl: './seller-order-detail.component.html',
  styleUrls: ['./seller-order-detail.component.css'],
  standalone: false
})
export class SellerOrderDetailComponent implements OnInit {
  orderId!: number;
  storeId!: number;
  order: Order | null = null;
  loading = true;
  error = '';
  statusOptions = [
    { value: 'PENDING', label: 'Beklemede' },
    { value: 'PROCESSING', label: 'Hazırlanıyor' },
    { value: 'SHIPPING', label: 'Kargoya Verildi' },
    { value: 'DELIVERED', label: 'Teslim Edildi' },
    { value: 'CANCELLED', label: 'İptal Edildi' }
  ];
  
  itemTrackingNumbers: {[key: number]: string} = {}; // Sipariş öğelerinin takip numaraları için

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: SellerOrderService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['storeId'];
      this.orderId = +params['orderId'];
      this.loadOrderDetails();
    });
  }

  loadOrderDetails(): void {
    this.loading = true;
    this.error = '';
    
    this.orderService.getStoreOrders(this.storeId).subscribe({
      next: (orders) => {
        const foundOrder = orders.find(o => o.id === this.orderId);
        if (foundOrder) {
          this.order = foundOrder;
          
          // İtem takip numaraları için nesneyi başlat
          this.itemTrackingNumbers = {};
          foundOrder.items.forEach(item => {
            if (item.storeId === this.storeId) {
              this.itemTrackingNumbers[item.id] = item.trackingNumber || '';
            }
          });
        } else {
          this.error = 'Sipariş bulunamadı';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Sipariş detayları yüklenirken hata:', err);
        this.error = 'Sipariş detayları yüklenirken bir hata oluştu';
        this.loading = false;
      }
    });
  }

  updateItemStatus(itemId: number, newStatus: string): void {
    if (!this.order || !this.storeId) return;
    
    // İlgili ürünü bul
    const item = this.order.items.find(i => i.id === itemId);
    if (!item) {
      this.snackBar.open('Ürün bulunamadı', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Sadece satıcının kendi ürünleri için işlem yapmasını sağla
    if (item.storeId !== this.storeId) {
      this.snackBar.open('Bu ürün mağazanıza ait değil', 'Tamam', { duration: 3000 });
      return;
    }
    
    const currentStatus = item.status || this.order.status;
    
    // Satıcılar sipariş öğesini DELIVERED olarak işaretleyemez
    if (newStatus === 'DELIVERED') {
      this.snackBar.open('Teslim durumu yalnızca müşteri veya sistem tarafından güncellenebilir', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Geçerli durum geçişlerini kontrol et
    if (!this.isValidStatusTransition(currentStatus, newStatus)) {
      this.snackBar.open(`Ürün durumu ${currentStatus} durumundan ${newStatus} durumuna güncellenemez`, 'Tamam', { duration: 3000 });
      return;
    }
    
    // Eğer durumu "SHIPPING" yapıyorsa, takip numarası zorunlu
    if (newStatus === 'SHIPPING') {
      // Takip numarası yoksa veya boşsa, kullanıcıdan takip numarası girmeyi isteyelim
      if (!this.itemTrackingNumbers[itemId] || this.itemTrackingNumbers[itemId].trim() === '') {
        // Düzenlenmiş snackbar mesajı kullanarak takip numarası iste
        this.snackBar.open('Kargoya vermek için takip numarası girmelisiniz', 'Tamam', { duration: 3000 });
        return;
      }
      
      // Takip numarası girilmiş, kargoya verme işlemine devam et
      this.updateItemTrackingNumber(itemId);
      return;
    }
    
    // Diğer durum değişiklikleri için normal işleme devam et
    this.loading = true;
    this.orderService.updateOrderItemStatus(this.storeId, this.orderId, itemId, newStatus).subscribe({
      next: (updatedOrder) => {
        this.snackBar.open('Ürün durumu güncellendi', 'Tamam', { duration: 3000 });
        // Siparişi yeniden yükle
        this.loadOrderDetails();
      },
      error: (err) => {
        console.error('Ürün durumu güncellenirken hata:', err);
        this.snackBar.open('Ürün durumu güncellenirken hata oluştu', 'Tamam', { duration: 3000 });
        this.loading = false;
      }
    });
  }
  
  // Geçerli durum geçişlerini kontrol eden yardımcı metot
  isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    // İptal durumu - PENDING ve PROCESSING durumundaki ürünler iptal edilebilir
    if (newStatus === 'CANCELLED') {
      return currentStatus === 'PENDING' || currentStatus === 'PROCESSING';
    }
    
    // Normal akış: PENDING -> PROCESSING -> SHIPPING -> DELIVERED
    switch (currentStatus) {
      case 'PENDING':
        return newStatus === 'PROCESSING';
      case 'PROCESSING':
        return newStatus === 'SHIPPING';
      case 'SHIPPING':
        return newStatus === 'DELIVERED'; // Bu satıcı tarafından yapılamaz zaten
      default:
        return false;
    }
  }
  
  // Sipariş öğesinin takip numarasını güncelle
  updateItemTrackingNumber(itemId: number): void {
    if (!this.order || !this.storeId || !this.itemTrackingNumbers[itemId]) return;
    
    // İlgili ürünü bul
    const item = this.order.items.find(i => i.id === itemId);
    if (!item) {
      this.snackBar.open('Ürün bulunamadı', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Sadece satıcının kendi ürünleri için işlem yapmasını sağla
    if (item.storeId !== this.storeId) {
      this.snackBar.open('Bu ürün mağazanıza ait değil', 'Tamam', { duration: 3000 });
      return;
    }
    
    this.loading = true;
    const trackingNumber = this.itemTrackingNumbers[itemId];
    
    this.orderService.updateOrderItemTrackingNumber(this.storeId, this.orderId, itemId, trackingNumber).subscribe({
      next: (updatedOrder) => {
        this.snackBar.open('Ürün takip numarası güncellendi ve durumu Kargoya Verildi olarak değiştirildi', 'Tamam', { duration: 3000 });
        // Siparişi yeniden yükle
        this.loadOrderDetails();
      },
      error: (err) => {
        console.error('Ürün takip numarası güncellenirken hata:', err);
        this.snackBar.open('Ürün takip numarası güncellenirken hata oluştu', 'Tamam', { duration: 3000 });
        this.loading = false;
      }
    });
  }
  
  // Ürünü takip numarası ile birlikte kargolandı olarak işaretle
  updateItemWithTracking(itemId: number): void {
    if (!this.order) return;
    
    // İlgili ürünü bul
    const item = this.order.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Sadece satıcının kendi ürünleri için işlem yapmasını sağla
    if (item.storeId !== this.storeId) {
      this.snackBar.open('Bu ürün mağazanıza ait değil', 'Tamam', { duration: 3000 });
      return;
    }
    
    // Takip numarasını kontrol et, eğer yoksa popupla sor
    if (!this.itemTrackingNumbers[itemId] || this.itemTrackingNumbers[itemId].trim() === '') {
      // Takip numarası girme diyaloğunu göster
      const trackingNumber = prompt('Lütfen kargo takip numarasını girin:');
      
      // Kullanıcı iptal ederse veya boş değer girerse işlemi durdur
      if (!trackingNumber || trackingNumber.trim() === '') {
        this.snackBar.open('Kargoya vermek için takip numarası girmelisiniz', 'Tamam', { duration: 3000 });
        return;
      }
      
      // Takip numarasını ayarla
      this.itemTrackingNumbers[itemId] = trackingNumber.trim();
    }
    
    // Takip numarası ile birlikte ürünü kargoya ver
    this.updateItemTrackingNumber(itemId);
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
        this.snackBar.open('Çıkış yaparken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/seller/orders/store', this.storeId]);
  }

  formatDate(date: string | any[] | undefined): string {
    if (!date) return 'Invalid Date';
    const d = new Date(date as any);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('tr-TR');
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'status-pending';
      case 'PROCESSING': return 'status-processing';
      case 'SHIPPING': return 'status-shipped';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  getStatusText(status: string): string {
    switch(status?.toUpperCase()) {
      case 'PENDING': return 'Beklemede';
      case 'PROCESSING': return 'Hazırlanıyor';
      case 'SHIPPING': return 'Kargoda';
      case 'DELIVERED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  }

  getAvailableStatusOptions(item: any): any[] {
    // Sadece satıcının kendi ürünleri için uygun durumları döndür
    if (item.storeId !== this.storeId) {
      return [];
    }
    
    const currentStatus = item.status || (this.order ? this.order.status : 'UNKNOWN');
    
    switch(currentStatus) {
      case 'PENDING':
        return [
          { value: 'PROCESSING', label: 'Hazırlanıyor' },
          { value: 'CANCELLED', label: 'İptal Et' }
        ];
      case 'PROCESSING':
        return [
          { value: 'SHIPPING', label: 'Kargoya Ver' },
          { value: 'CANCELLED', label: 'İptal Et' }
        ];
      case 'SHIPPING':
        return []; // Satıcı kargoya verilen ürünler için başka bir işlem yapamaz
      case 'DELIVERED':
        return []; // Satıcı teslim edilen ürünler için başka bir işlem yapamaz
      case 'CANCELLED':
        return []; // İptal edilen ürünler için başka bir işlem yapamaz
      default:
        return [];
    }
  }
} 