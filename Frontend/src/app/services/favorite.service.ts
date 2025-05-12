import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.interface';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private favorites = new BehaviorSubject<Product[]>([]);
  private favoriteCount = new BehaviorSubject<number>(0);

  constructor() { 
    this.loadFavoritesFromLocalStorage();
  }

  private loadFavoritesFromLocalStorage(): void {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      const favoriteItems = JSON.parse(savedFavorites) as Product[];
      this.favorites.next(favoriteItems);
      this.favoriteCount.next(favoriteItems.length);
    }
  }

  private saveFavoritesToLocalStorage(): void {
    localStorage.setItem('favorites', JSON.stringify(this.favorites.value));
    this.favoriteCount.next(this.favorites.value.length);
  }

  getFavorites(): Observable<Product[]> {
    return this.favorites.asObservable();
  }

  getFavoriteCount(): Observable<number> {
    return this.favoriteCount.asObservable();
  }

  addToFavorites(product: Product): void {
    const currentFavorites = this.favorites.value;
    if (!this.isInFavorites(product.id)) {
      this.favorites.next([...currentFavorites, product]);
      this.saveFavoritesToLocalStorage();
    }
  }

  removeFromFavorites(productId: number): void {
    const currentFavorites = this.favorites.value;
    const updatedFavorites = currentFavorites.filter(item => item.id !== productId);
    this.favorites.next(updatedFavorites);
    this.saveFavoritesToLocalStorage();
  }

  isInFavorites(productId: number): boolean {
    return this.favorites.value.some(item => item.id === productId);
  }

  clearFavorites(): void {
    this.favorites.next([]);
    localStorage.removeItem('favorites');
    this.favoriteCount.next(0);
  }
}
