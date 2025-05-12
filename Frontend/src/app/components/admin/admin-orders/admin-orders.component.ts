import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, PAYMENT_STATUS } from '../../../models/order.model';
import { OrderService } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';

// Tracking number dialog component
@Component({
  selector: 'app-tracking-dialog',
  template: `
    <h2 mat-dialog-title>Enter Tracking Number</h2>
    <div mat-dialog-content>
      <p>Please enter the tracking number for this order:</p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Tracking Number</mat-label>
        <input matInput [(ngModel)]="data.trackingNumber" required>
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!data.trackingNumber" (click)="onSubmit()">Submit</button>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule]
})
export class TrackingDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TrackingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { trackingNumber: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close(this.data.trackingNumber);
  }
}

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css'],
  standalone: false,
})
export class AdminOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  error: string | null = null;
  statusFilter: string = 'ALL';
  searchQuery: string = '';
  statusUpdateSuccess = false;
  statusUpdateMessage: string | null = null;
  
  // Sipariş durumları
  statusOptions = [
    { value: 'ALL', label: 'Tümü' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'PROCESSING', label: 'PROCESSING' },
    { value: 'SHIPPING', label: 'SHIPPING' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' }
  ];
  
  // Ödeme durumları
  paymentStatusOptions = {
    PAID: 'PAID',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED'
  };

  constructor(
    private orderService: OrderService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getAllOrders(this.statusFilter !== 'ALL' ? this.statusFilter : null).subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.error = 'Siparişler yüklenirken bir hata oluştu.';
        this.loading = false;
        this.showErrorMessage('Siparişler yüklenirken bir hata oluştu.');
      }
    });
  }

  searchOrders(): void {
    if (!this.searchQuery.trim()) {
      this.loadOrders();
      return;
    }

    this.loading = true;
    this.orderService.searchOrders(this.searchQuery, this.statusFilter !== 'ALL' ? this.statusFilter : null).subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
        if (data.length === 0) {
          this.showInfoMessage('Aramanıza uygun sipariş bulunamadı.');
        }
      },
      error: (err) => {
        console.error('Error searching orders:', err);
        this.error = 'Sipariş araması yapılırken bir hata oluştu.';
        this.loading = false;
        this.showErrorMessage('Sipariş araması yapılırken bir hata oluştu.');
      }
    });
  }

  updateOrderStatus(orderId: number, status: string): void {
    // Status değişikliğini doğrulama
    const confirmMessage = this.getStatusConfirmationMessage(status);
    if (!confirm(confirmMessage)) {
      return;
    }

    // If changing to SHIPPING status, show tracking number dialog
    if (status === 'SHIPPING') {
      this.openTrackingDialog(orderId);
      return;
    }

    this.processStatusUpdate(orderId, status);
  }

  // Open dialog to enter tracking number
  openTrackingDialog(orderId: number): void {
    const dialogRef = this.dialog.open(TrackingDialogComponent, {
      width: '400px',
      data: { trackingNumber: '' }
    });

    dialogRef.afterClosed().subscribe(trackingNumber => {
      if (trackingNumber) {
        // First update the tracking number
        this.orderService.updateAdminTrackingNumber(orderId, trackingNumber).subscribe({
          next: () => {
            // Then update the status to SHIPPING
            this.processStatusUpdate(orderId, 'SHIPPING');
          },
          error: (err) => {
            console.error('Error updating tracking number:', err);
            this.showErrorMessage('Failed to update tracking number.');
          }
        });
      }
    });
  }

  // Process the actual status update
  processStatusUpdate(orderId: number, status: string): void {
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: (updatedOrder) => {
        const index = this.orders.findIndex(order => order.id === orderId);
        if (index !== -1) {
          this.orders[index] = updatedOrder;
        }
        this.statusUpdateSuccess = true;
        
        // İptal durumunda özel mesaj göster
        if (status === 'CANCELLED') {
          this.statusUpdateMessage = `Sipariş iptal edildi ve ödeme iadesi başlatıldı.`;
          this.showSuccessMessage(`Sipariş iptal edildi ve ödeme iadesi başlatıldı.`);
        } else {
          this.statusUpdateMessage = `Sipariş durumu "${this.getStatusLabel(status)}" olarak güncellendi.`;
          this.showSuccessMessage(`Sipariş durumu başarıyla güncellendi.`);
        }
        
        // 3 saniye sonra mesajı temizle
        setTimeout(() => {
          this.statusUpdateMessage = null;
        }, 3000);
      },
      error: (err) => {
        console.error('Error updating order status:', err);
        this.error = 'Sipariş durumu güncellenirken bir hata oluştu.';
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Sipariş durumu güncellenirken bir hata oluştu.';
        this.showErrorMessage('Sipariş durumu güncellenirken bir hata oluştu.');
        
        // 3 saniye sonra mesajı temizle
        setTimeout(() => {
          this.statusUpdateMessage = null;
        }, 3000);
      }
    });
  }

  onStatusFilterChange(): void {
    this.loadOrders();
  }

  // Ödeme durumu metnini al
  getPaymentStatusText(order: Order): string {
    // Refund durumu varsa ve başarılıysa, REFUNDED gösterilsin
    if (order.refundStatus === 'SUCCEEDED' || order.paymentStatus === 'REFUNDED') {
      return 'REFUNDED';
    }
    
    // Payment status kontrolü
    if (!order.paymentStatus) {
      return '';
    }
    
    switch (order.paymentStatus) {
      case PAYMENT_STATUS.PAID:
        return 'PAID';
      case PAYMENT_STATUS.FAILED:
        return 'FAILED';
      default:
        return order.paymentStatus || '';
    }
  }
  
  // Comprehensive date parsing method from admin-users.component.ts
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    try {
      console.log('Tarih dönüştürülüyor, gelen veri tipi:', typeof dateValue, 'değer:', dateValue);
      
      // Date nesnesi ise doğrudan döndür
      if (dateValue instanceof Date) {
        return dateValue;
      }
      
      // Handle array format [year, month, day, hour, minute]
      if (Array.isArray(dateValue)) {
        const year = dateValue[0];
        const month = dateValue[1] - 1; // JavaScript months are 0-11
        const day = dateValue[2];
        
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
        if (dateValue.length > 3) hours = dateValue[3];
        if (dateValue.length > 4) minutes = dateValue[4];
        if (dateValue.length > 5) seconds = dateValue[5];
        if (dateValue.length > 6) {
          // Milisaniye değerini daha düzgün yönetmek için
          milliseconds = Math.min(999, parseInt(String(dateValue[6]).substring(0, 3)));
        }
        
        const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
        console.log('Diziden oluşturulan tarih:', date);
        
        if (!isNaN(date.getTime())) {
          return date;
        } else {
          // Alternatif yaklaşım, UTC tarih oluşturma
          const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
          console.log('UTC olarak oluşturulan tarih:', utcDate);
          return utcDate;
        }
      }
      
      // Handle string format with comma-separated values [year,month,day]
      if (typeof dateValue === 'string') {
        // Check for comma-separated values
        if (dateValue.includes(',')) {
          const dateValues = dateValue.replace(/[\[\]]/g, '').split(',').map(Number);
          if (dateValues.length >= 3) {
            const year = dateValues[0];
            const month = dateValues[1] - 1;
            const day = dateValues[2];
            
            let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
            if (dateValues.length > 3) hours = dateValues[3];
            if (dateValues.length > 4) minutes = dateValues[4];
            if (dateValues.length > 5) seconds = dateValues[5];
            if (dateValues.length > 6) {
              // Milisaniye değerini daha düzgün yönetmek için
              milliseconds = Math.min(999, parseInt(String(dateValues[6]).substring(0, 3)));
            }
            
            const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
            console.log('Virgülle ayrılmış tarihten oluşturulan:', date);
            
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        
        // Handle database format: '2025-04-30 20:48:15.000000'
        if (dateValue.includes('-') && dateValue.includes(':')) {
          // Remove the microseconds part if exists
          const cleanDateStr = dateValue.replace(/\.\d+$/, '');
          const date = new Date(cleanDateStr);
          console.log('DB formatından oluşturulan tarih:', date);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Try ISO format
        if (dateValue.includes('T') || dateValue.includes('-')) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            console.log('ISO formatından oluşturulan tarih:', date);
            return date;
          }
        }
        
        // Try parsing as a timestamp
        if (!isNaN(Number(dateValue))) {
          const timestamp = Number(dateValue);
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            console.log('String timestamp\'ten oluşturulan tarih:', date);
            return date;
          }
        }
      }
      
      // Try parsing as a timestamp for number type
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          console.log('Timestamp\'ten oluşturulan tarih:', date);
          return date;
        }
      }
      
      // Fallback for object type that might have toISOString or similar methods
      if (typeof dateValue === 'object' && dateValue !== null) {
        try {
          // Try to use toISOString if available
          if (typeof dateValue.toISOString === 'function') {
            const isoString = dateValue.toISOString();
            const date = new Date(isoString);
            if (!isNaN(date.getTime())) {
              console.log('toISOString metodu ile oluşturulan tarih:', date);
              return date;
            }
          }
          
          // Try to stringify and parse
          const dateStr = JSON.stringify(dateValue);
          const parsedDate = new Date(JSON.parse(dateStr));
          if (!isNaN(parsedDate.getTime())) {
            console.log('JSON stringify/parse ile oluşturulan tarih:', parsedDate);
            return parsedDate;
          }
        } catch (e) {
          console.warn('Nesne türü tarih dönüştürme hatası:', e);
        }
      }
      
      // Return current date if all methods fail
      console.warn('Tarih değeri tanımlanamadı. Geçerli tarih kullanılıyor.');
      return new Date();
      
    } catch (error) {
      console.error('Tarih dönüştürme hatası:', error);
      return new Date(); // Hata durumunda geçerli tarihi kullan
    }
  }

  // Updated formatDate method to use the comprehensive parseDate method
  formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    
    try {
      // Parse the date using our improved utility function
      const dateObj = this.parseDate(date);
      
      if (!dateObj || isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
      
      // Format the date
      return dateObj.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Invalid Date';
    }
  }

  // Sipariş toplam tutarını hesapla
  calculateOrderTotal(order: Order): number {
    if (!order.items || order.items.length === 0) return 0;
    return order.totalPrice || order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Status label'ını bul
  getStatusLabel(statusValue: string): string {
    const option = this.statusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
  }

  // Status değişikliği için onay mesajı
  getStatusConfirmationMessage(status: string): string {
    switch (status) {
      case 'PROCESSING':
        return 'Bu siparişi işleme almak istediğinizden emin misiniz?';
      case 'SHIPPING':
        return 'Bu siparişi kargoya vermek istediğinizden emin misiniz?';
      case 'DELIVERED':
        return 'Bu siparişi teslim edildi olarak işaretlemek istediğinizden emin misiniz?';
      case 'COMPLETED':
        return 'Bu siparişi tamamlandı olarak işaretlemek istediğinizden emin misiniz?';
      case 'CANCELLED':
        return 'Bu siparişi iptal etmek istediğinizden emin misiniz? Bu işlem ödeme iadesini başlatacaktır.';
      default:
        return 'Bu siparişin durumunu değiştirmek istediğinizden emin misiniz?';
    }
  }

  // Bildirim gösterme fonksiyonları
  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  showInfoMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000
    });
  }

  // Check if an order has been refunded successfully
  hasSuccessfulRefund(order: Order): boolean {
    return order.refundStatus === 'SUCCEEDED' && order.status === 'CANCELLED';
  }
  
  // Get refund status icon
  getRefundStatusIcon(status: string | undefined): string {
    if (!status) return 'help';
    
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'check_circle';
      case 'pending':
        return 'pending';
      case 'failed':
        return 'error';
      default:
        return 'help';
    }
  }

  // Siparişi tamamen sil
  deleteOrder(orderId: number): void {
    if (!confirm('Bu siparişi tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve veritabanından kalıcı olarak silinir.')) {
      return;
    }

    this.orderService.deleteOrder(orderId).subscribe({
      next: () => {
        this.showSuccessMessage('Sipariş başarıyla silindi.');
        // Siparişi UI'dan kaldır
        this.orders = this.orders.filter(order => order.id !== orderId);
      },
      error: (err) => {
        console.error('Error deleting order:', err);
        this.showErrorMessage('Sipariş silinirken bir hata oluştu: ' + (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
