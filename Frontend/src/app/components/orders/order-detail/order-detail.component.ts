import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css'],
  standalone: false
})
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error = false;
  
  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const orderId = Number(params.get('id'));
      if (orderId) {
        this.loadOrderDetails(orderId);
      } else {
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadOrderDetails(orderId: number): void {
    this.loading = true;
    this.orderService.getOrderDetails(orderId).subscribe({
      next: (order) => {
        this.order = {
          ...order,
          status: this.translateStatusToEnglish(order.status)
        };
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error fetching order details:', error);
        this.error = true;
        this.loading = false;
        this.snackBar.open('Sipariş detayları yüklenirken bir hata oluştu.', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  translateStatusToEnglish(status: string): string {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'beklemede':
        return 'PENDING';
      case 'işleniyor':
      case 'hazırlanıyor':
        return 'PROCESSING';
      case 'kargoya verildi':
        return 'SHIPPING';
      case 'teslim edildi':
        return 'DELIVERED';
      case 'iptal edildi':
        return 'CANCELLED';
      default:
        return status.toUpperCase();
    }
  }

  formatDate(date: string | Date): string {
    const orderDate = new Date(date);
    return `${orderDate.toLocaleDateString('tr-TR')}`;
  }

  formatStatus(status: string): string {
    if (!status) return '';
    
    status = status.toLowerCase();
    
    switch (status) {
      case 'pending':
        return 'PENDING';
      case 'processing':
        return 'PROCESSING';
      case 'shipped':
      case 'shipping':
        return 'SHIPPING';
      case 'delivered':
        return 'DELIVERED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    
    status = status.toLowerCase();
    
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
      case 'shipping':
        return 'status-shipping';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'check_circle';
      case 'pending':
        return 'hourglass_empty';
      case 'shipped':
      case 'shipping':
        return 'local_shipping';
      case 'cancelled':
        return 'cancel';
      case 'processing':
        return 'settings';
      default:
        return 'info';
    }
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/products', productId]);
  }

  cancelOrder(orderId: number): void {
    if (confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) {
      this.orderService.cancelOrder(orderId).subscribe({
        next: (response) => {
          console.log('Sipariş iptal edildi', response);
          this.loadOrderDetails(orderId);
          this.snackBar.open('Sipariş başarıyla iptal edildi.', 'Tamam', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error cancelling order:', error);
          this.snackBar.open('Sipariş iptal edilirken bir hata oluştu.', 'Tamam', {
            duration: 3000
          });
        }
      });
    }
  }

  cancelOrderItem(orderId: number, itemId: number): void {
    if (confirm('Bu ürünü siparişten çıkarmak istediğinizden emin misiniz? İptal edilen ürün tutarı iade edilecektir.')) {
      this.orderService.cancelOrderItem(orderId, itemId).subscribe({
        next: (response) => {
          console.log('Sipariş öğesi iptal edildi', response);
          this.loadOrderDetails(orderId);
          this.snackBar.open('Ürün siparişten çıkarıldı ve iade işlemi başlatıldı.', 'Tamam', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error cancelling order item:', error);
          this.snackBar.open('Ürün iptal edilirken bir hata oluştu.', 'Tamam', {
            duration: 3000
          });
        }
      });
    }
  }

  getPaymentMethodText(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'stripe':
        return 'Kredi/Banka Kartı';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'debit_card':
        return 'Banka Kartı';
      case 'bank_transfer':
        return 'Havale/EFT';
      default:
        return paymentMethod;
    }
  }

  getRefundStatusText(status: string | undefined): string {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'İade Edildi';
      case 'pending':
        return 'İade İşleniyor';
      case 'failed':
        return 'İade Başarısız';
      default:
        return status;
    }
  }

  getRefundStatusClass(status: string | undefined): string {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'status-delivered';
      case 'pending':
        return 'status-processing';
      case 'failed':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getRefundStatusIcon(status: string | undefined): string {
    if (!status) return 'info';
    
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'check_circle';
      case 'pending':
        return 'hourglass_empty';
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }
  
  // Check if order has any items with tracking numbers
  hasTrackingNumbers(): boolean {
    if (!this.order || !this.order.items) return false;
    return this.order.items.some(item => item.trackingNumber && item.trackingNumber.trim() !== '');
  }
  
  // Get all order items that have tracking numbers
  getItemsWithTrackingNumber(): any[] {
    if (!this.order || !this.order.items) return [];
    return this.order.items.filter(item => item.trackingNumber && item.trackingNumber.trim() !== '');
  }
  
  // Check if order has any items with tracking numbers AND SHIPPING status
  hasTrackingNumbersForShipping(): boolean {
    if (!this.order || !this.order.items) return false;
    return this.order.items.some(item => 
      item.trackingNumber && 
      item.trackingNumber.trim() !== '' && 
      item.status && 
      item.status.toUpperCase() === 'SHIPPING'
    );
  }
  
  // Get all order items that have tracking numbers AND SHIPPING status
  getItemsWithTrackingNumberAndShipping(): any[] {
    if (!this.order || !this.order.items) return [];
    return this.order.items.filter(item => 
      item.trackingNumber && 
      item.trackingNumber.trim() !== '' && 
      item.status && 
      item.status.toUpperCase() === 'SHIPPING'
    );
  }
} 