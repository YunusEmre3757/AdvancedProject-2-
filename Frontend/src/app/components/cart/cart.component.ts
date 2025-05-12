import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { Product, ProductVariant } from '../../models/product.interface';
import { MatSnackBar } from '@angular/material/snack-bar';

interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
  standalone: false
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  displayedColumns: string[] = ['image', 'name', 'price', 'quantity', 'total', 'actions'];

  constructor(
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadCartItems();
  }

  loadCartItems(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });
  }

  calculateTotal(): void {
    this.cartService.getCartTotal().subscribe(total => {
      this.totalPrice = total;
    });
  }

  updateQuantity(productId: number, quantity: number, variantId?: number): void {
    if (quantity <= 0) {
      this.removeItem(productId, variantId);
      return;
    }
    
    this.cartService.updateQuantity(productId, quantity, variantId);
    this.snackBar.open('Sepet güncellendi', 'Tamam', {
      duration: 2000,
    });
  }

  removeItem(productId: number, variantId?: number): void {
    console.log(`Ürün siliniyor: ID=${productId}, Varyant ID=${variantId || 'Yok'}`);
    this.cartService.removeItem(productId, variantId);
    this.snackBar.open('Ürün sepetten çıkarıldı', 'Tamam', {
      duration: 2000,
    });
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.snackBar.open('Sepet temizlendi', 'Tamam', {
      duration: 2000,
    });
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }
  
  // Varyant bilgilerini göstermek için yardımcı metod
  getVariantInfo(item: CartItem): string {
    if (!item.variant) return '';
    
    // Gösterilmeyecek özellikler
    const excludedKeys = ['RenkKodu', 'ColorCode', 'imageUrls', 'sku'];
    
    const attributes = Object.entries(item.variant.attributes || {})
      .filter(([key]) => !excludedKeys.includes(key)) // Gösterilmeyecek özellikleri filtrele
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return attributes ? `(${attributes})` : '';
  }
} 