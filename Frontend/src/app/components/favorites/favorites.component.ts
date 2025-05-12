import { Component, OnInit } from '@angular/core';
import { Product } from '../../models/product.interface';
import { FavoriteService } from '../../services/favorite.service';
import { CartService } from '../../services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css',
  standalone: false
})
export class FavoritesComponent implements OnInit {
  favorites: Product[] = [];
  loading: boolean = true;

  constructor(
    private favoriteService: FavoriteService,
    private cartService: CartService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading = true;
    this.favoriteService.getFavorites().subscribe(
      favorites => {
        this.favorites = favorites;
        this.loading = false;
      }
    );
  }

  removeFromFavorites(product: Product): void {
    this.favoriteService.removeFromFavorites(product.id);
    this.snackBar.open('Ürün favorilerden çıkarıldı', 'Tamam', {
      duration: 2000,
    });
    // Sayfayı yenilemek yerine doğrudan listeden çıkar
    this.favorites = this.favorites.filter(item => item.id !== product.id);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
    this.snackBar.open('Ürün sepete eklendi', 'Tamam', {
      duration: 2000,
    });
  }

  navigateToProductDetail(product: Product): void {
    if (product.slug) {
      this.router.navigate(['/products', product.slug]);
    } else {
      this.router.navigate(['/products', product.id]);
    }
  }
} 