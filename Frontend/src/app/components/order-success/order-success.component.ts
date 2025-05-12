import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-success',
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.css'],
  standalone: false
})
export class OrderSuccessComponent implements OnInit {
  orderId: number | null = null;
  orderDetails: Order | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.orderId = +params['id'];
      if (this.orderId) {
        this.loadOrderDetails();
      } else {
        this.error = true;
        this.loading = false;
      }
    });
  }

  loadOrderDetails(): void {
    if (this.orderId) {
      this.orderService.getOrderDetails(this.orderId).subscribe({
        next: (order) => {
          this.orderDetails = order;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading order details:', error);
          this.error = true;
          this.loading = false;
        }
      });
    }
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  viewOrderDetails(): void {
    this.router.navigate(['/orders', this.orderId]);
  }

  viewAllOrders(): void {
    this.router.navigate(['/orders']);
  }
} 