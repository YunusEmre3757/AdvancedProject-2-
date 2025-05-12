import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.interface';
import { OrderService } from './order.service';
import { Order } from '../models/order.model';
import { switchMap, tap } from 'rxjs/operators';
import { ProductVariant } from '../models/product.interface';

interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  private cartTotal = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private orderService: OrderService
  ) {
    this.loadCartFromLocalStorage();
  }

  private loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartItems = JSON.parse(savedCart) as CartItem[];
      this.cartItems.next(cartItems);
      this.calculateTotal();
    }
  }

  private saveCartToLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(this.cartItems.value));
    this.calculateTotal();
  }

  private calculateTotal() {
    const total = this.cartItems.value.reduce((acc, item) => {
      // Varyant fiyatı veya ürün fiyatı
      const price = (item.variant && item.variant.salePrice) ? 
        item.variant.salePrice : 
        (item.variant && item.variant.price) ? 
          item.variant.price : 
          (item.product.discountedPrice || item.product.price);
      
      return acc + price * item.quantity;
    }, 0);
    this.cartTotal.next(total);
  }

  getCartItems(): Observable<CartItem[]> {
    return this.cartItems.asObservable();
  }

  getCartTotal(): Observable<number> {
    return this.cartTotal.asObservable();
  }

  getCartItemCount(): Observable<number> {
    return this.cartItems.pipe(
      switchMap(items => {
        const count = items.reduce((acc, item) => acc + item.quantity, 0);
        return of(count);
      })
    );
  }

  addToCart(product: Product, quantity: number = 1, variant?: ProductVariant) {
    // Debug için eklenen loglar
    console.log('AddToCart çağrıldı:', product.name);
    console.log('Ürün ID:', product.id);
    console.log('Varyant:', variant ? `ID: ${variant.id}, Özellikleri: ${JSON.stringify(variant.attributes)}` : 'Yok');
    
    // Stok kontrolü - eğer varyant varsa varyant stoğunu, yoksa ürün stoğunu kontrol et
    const stockValue = variant ? variant.stock : product.stock;
    
    if (stockValue <= 0) {
      console.error('Bu ürün stokta yok:', product.name);
      return false;
    }

    const currentCart = this.cartItems.value;
    
    // Varyant varsa hem ürün hem varyant ID'sini kontrol et, yoksa sadece ürün ID'sini kontrol et
    const existingItemIndex = currentCart.findIndex(item => {
      if (variant) {
        return item.product.id === product.id && item.variant?.id === variant.id;
      } else {
        return item.product.id === product.id && !item.variant;
      }
    });

    if (existingItemIndex !== -1) {
      const newQuantity = currentCart[existingItemIndex].quantity + quantity;
      
      // Stok miktarından fazla eklenemiyor
      if (newQuantity > stockValue) {
        console.error(`Stok sınırına ulaşıldı. ${product.name} için maksimum ${stockValue} adet eklenebilir.`);
        currentCart[existingItemIndex].quantity = stockValue;
      } else {
        currentCart[existingItemIndex].quantity = newQuantity;
      }
    } else {
      // Stok miktarından fazla eklenemiyor
      if (quantity > stockValue) {
        console.error(`Stok sınırına ulaşıldı. ${product.name} için maksimum ${stockValue} adet eklenebilir.`);
        quantity = stockValue;
      }
      
      // Sepete eklenen öğeyi logla
      const newItem = { product, quantity, variant };
      console.log('Sepete ekleniyor:', {
        productId: product.id,
        productName: product.name,
        quantity,
        variant: variant ? { id: variant.id, attributes: variant.attributes } : 'Yok'
      });
      
      currentCart.push(newItem);
    }

    this.cartItems.next([...currentCart]);
    this.saveCartToLocalStorage();
    return true;
  }

  updateQuantity(productId: number, quantity: number, variantId?: number) {
    const currentCart = this.cartItems.value;
    
    // Hem ürün hem varyant ID'si ile eşleşen öğeyi bul
    const itemIndex = currentCart.findIndex(item => {
      if (variantId) {
        return item.product.id === productId && item.variant?.id === variantId;
      } else {
        return item.product.id === productId && !item.variant;
      }
    });

    if (itemIndex !== -1) {
      const item = currentCart[itemIndex];
      const stockValue = item.variant ? item.variant.stock : item.product.stock;
      
      // Stok miktarından fazla güncelleme yapılamıyor
      if (quantity > stockValue) {
        console.error(`Stok sınırına ulaşıldı. ${item.product.name} için maksimum ${stockValue} adet eklenebilir.`);
        quantity = stockValue;
      }
      
      currentCart[itemIndex].quantity = quantity;
      this.cartItems.next([...currentCart]);
      this.saveCartToLocalStorage();
    }
  }

  removeItem(productId: number, variantId?: number) {
    const currentCart = this.cartItems.value;
    const updatedCart = currentCart.filter(item => {
      if (variantId) {
        return !(item.product.id === productId && item.variant?.id === variantId);
      } else {
        return !(item.product.id === productId && !item.variant);
      }
    });
    
    this.cartItems.next(updatedCart);
    this.saveCartToLocalStorage();
  }

  clearCart() {
    this.cartItems.next([]);
    localStorage.removeItem('cart');
    this.cartTotal.next(0);
  }

  // API calls for syncing with backend when user is logged in
  getUserCart(): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(this.apiUrl);
  }

  syncCart(): Observable<CartItem[]> {
    return this.http.post<CartItem[]>(this.apiUrl, this.cartItems.value);
  }

  // Sepetten sipariş oluşturma
  checkout(shippingAddress: string, paymentIntentId?: string, paymentMethod?: string): Observable<Order> {
    const items = this.cartItems.value;
    
    if (items.length === 0) {
      return of(null as any);
    }
    
    console.log('Sipariş verilecek ürünler:', items);
    
    const orderData = {
      items: items.map(item => {
        const productId = item.product.id;
        const variantId = item.variant?.id;
        
        console.log(`Ürün: ${item.product.name}, ÜrünID: ${productId}, VaryantID: ${variantId || 'Yok'}`);
        
        return {
          productId: productId, // Her zaman ana ürün ID'sini gönder
          variantId: variantId, // Varsa varyant ID'sini gönder
          productName: item.product.name,
          // Varyant fiyatını veya ürün fiyatını kullan
          price: (item.variant && item.variant.salePrice) ? 
            item.variant.salePrice : 
            (item.variant && item.variant.price) ? 
              item.variant.price : 
              (item.product.discountedPrice || item.product.price),
          quantity: item.quantity,
          image: item.variant?.imageUrls && item.variant.imageUrls.length > 0 ? 
            item.variant.imageUrls[0] : 
            (item.product.image || item.product.imageUrl || '')
        };
      }),
      totalPrice: this.cartTotal.value,
      address: shippingAddress,
      status: 'PENDING',
      paymentIntentId: paymentIntentId,
      paymentMethod: paymentMethod
    };
    
    console.log('Backend\'e gönderilen sipariş verisi:', orderData);
    
    return this.orderService.createOrder(orderData).pipe(
      tap(() => {
        // Siparişi oluşturduktan sonra sepeti temizle
        this.clearCart();
      })
    );
  }
} 