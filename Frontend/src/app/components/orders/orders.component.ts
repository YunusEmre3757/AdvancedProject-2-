import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  standalone: false
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;

  constructor(
    private orderService: OrderService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders.map(order => {
          return {
            ...order,
            status: this.translateStatusToEnglish(order.status)
          };
        });
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error fetching orders:', error);
        this.loading = false;
        this.snackBar.open('Siparişleriniz yüklenirken bir hata oluştu.', 'Tamam', {
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
    if (!date) return 'Tarih Yok';
    
    try {
      const orderDate = new Date(date);
      if (isNaN(orderDate.getTime())) return 'Geçersiz Tarih';
      
      return orderDate.toLocaleDateString('tr-TR');
    } catch (error) {
      return 'Geçersiz Tarih';
    }
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

  navigateToOrderDetail(orderId: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation(); // Prevent card click event when button is clicked
    }
    this.router.navigate(['/orders/detail', orderId]);
  }

  cancelOrder(orderId: number, event: MouseEvent): void {
    event.stopPropagation();
    
    if (confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) {
      this.orderService.cancelOrder(orderId).subscribe({
        next: (response) => {
          console.log('Sipariş iptal edildi', response);
          const orderIndex = this.orders.findIndex(o => o.id === orderId);
          if (orderIndex !== -1) {
            this.orders[orderIndex].status = 'CANCELLED';
          }
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

  getStatusCardClass(status: string): string {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    return `status-${statusLower}`;
  }
} 