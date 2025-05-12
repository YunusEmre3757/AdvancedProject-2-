import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, CategoryHierarchy } from '../models/Category';



@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}


  //KULLANILIYOR
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  getMainCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/main`);
  }

  getRootCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/root`);
  }


  //KULLANILIYOR
  getSubcategories(categoryId: number): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/${categoryId}/subcategories`);
  }

  getCategoryHierarchy(): Observable<CategoryHierarchy[]> {
    return this.http.get<CategoryHierarchy[]>(`${this.apiUrl}/hierarchy`);
  }

  getCategoryById(categoryId: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${categoryId}`);
  }

  searchCategories(name: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/search`, {
      params: { name }
    });
  }

  getCategoryBySlug(slug: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/slug/${slug}`);
  }

  getBrandsByCategory(
    categoryId: number, 
    page: number = 0, 
    size: number = 50, 
    sortField: string = 'name', 
    sortDirection: string = 'asc'
  ): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', `${sortField},${sortDirection}`);
    
    return this.http.get<any>(`${this.apiUrl}/${categoryId}/brands`, { params });
  }

  debugCategoryBySlug(slug: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/debug/by-slug/${slug}`);
  }
} 