import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Brand } from '../models/brand.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private apiUrl = `${environment.apiUrl}/brands`;

  constructor(private http: HttpClient) { }

  
  //KULLANILIYOR
  // Tüm markaları getir
  getBrands(params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<{ items: Brand[], total: number }> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
    }

    return this.http.get<{ items: Brand[], total: number }>(this.apiUrl, { params: httpParams })
     
  }

  // Popüler markaları getir
  getPopularBrands(limit: number = 10): Observable<Brand[]> {
    return this.http.get<Brand[]>(`${this.apiUrl}/popular?limit=${limit}`)
    
  }

  // ID ile marka getir
  getBrand(id: number): Observable<Brand> {
    return this.http.get<Brand>(`${this.apiUrl}/${id}`)
  }

  // Slug ile marka getir
  getBrandBySlug(slug: string): Observable<Brand> {
    return this.http.get<Brand>(`${this.apiUrl}/slug/${slug}`)
  }

  // Markaya ait ürünleri getir
  getProductsByBrand(brandId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${brandId}/products`);
  }

  // Marka ara
  searchBrands(query: string): Observable<Brand[]> {
    return this.http.get<{ items: Brand[], total: number }>(`${this.apiUrl}/search?q=${query}`)
      .pipe(
        map(response => response.items),
        catchError(() => {
          // Fallback arama sonuçları
          return of([]);
        })
      );
  }

  // Marka ekle (Admin için)
  addBrand(brand: Omit<Brand, 'id'>): Observable<Brand> {
    return this.http.post<Brand>(this.apiUrl, brand);
  }

  // Marka güncelle (Admin için)
  updateBrand(id: number, brand: Partial<Brand>): Observable<Brand> {
    return this.http.put<Brand>(`${this.apiUrl}/${id}`, brand);
  }

  // Marka sil (Admin için)
  deleteBrand(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Kategoriye göre markaları getir
  getBrandsByCategory(categoryId: number): Observable<Brand[]> {
    console.log(`BrandService: Fetching brands for category ${categoryId}`);
    console.log(`API URL: ${environment.apiUrl}/categories/${categoryId}/brands`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }),
      withCredentials: false
    };
    
    return this.http.get<{ items: Brand[], total: number }>(
      `${environment.apiUrl}/categories/${categoryId}/brands`,
      httpOptions
    ).pipe(
      map(response => {
        console.log('BrandService: Received response for brands by category:', response);
        return response.items || [];
      }),
      catchError(error => {
        console.error('BrandService: Error fetching brands by category:', error);
        return of([]);
      })
    );
  }
} 