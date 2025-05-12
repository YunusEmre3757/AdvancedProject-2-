import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReviewResponse, ReviewRequest, ReviewSummary } from '../models/review.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) { }

  // Ürüne ait tüm yorumları getir
  getProductReviews(
    productId: number, 
    page: number = 0, 
    size: number = 10, 
    sortBy: string = 'createdAt', 
    sortDir: string = 'desc',
    rating: number = 0 // Yıldıza göre filtreleme parametresi eklendi
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);
    
    // Eğer rating 0 değilse (yani tümü seçili değilse), filtre parametresini ekle
    if (rating > 0) {
      params = params.set('rating', rating.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/products/${productId}`, { params });
  }

  // Ürün için yorum özeti getir
  getProductReviewSummary(productId: number): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`${this.apiUrl}/products/${productId}/summary`);
  }

  // Yeni yorum ekle
  addReview(review: ReviewRequest): Observable<ReviewResponse> {
    // Check if user has purchased the product
    return this.http.post<ReviewResponse>(`${this.apiUrl}`, review);
  }

  // Yorumu güncelle
  updateReview(reviewId: number, review: ReviewRequest): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`${this.apiUrl}/${reviewId}`, review);
  }

  // Yorumu sil
  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reviewId}`);
  }

  // Yorumu yararlı olarak işaretle
  markReviewAsHelpful(reviewId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${reviewId}/helpful`, {});
  }
  
  // Yorumun yararlı işaretini kaldır
  unmarkReviewAsHelpful(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${reviewId}/helpful`);
  }
  
  // Kullanıcının yorumu işaretleyip işaretlemediğini kontrol et
  isMarkedAsHelpful(reviewId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${reviewId}/is-marked-helpful`);
  }
  
  // Kullanıcının yararlı olarak işaretlediği tüm yorumların ID'lerini getir
  getHelpfulReviews(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/helpful`);
  }

  // Kullanıcının kendi yorumlarını getir
  getMyReviews(page: number = 0, size: number = 10): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<any>(`${this.apiUrl}/users/me`, { params });
  }

  // Yorum detaylarını getir
  getReviewById(reviewId: number): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.apiUrl}/${reviewId}`);
  }

  // Kullanıcının ürünü satın alıp almadığını kontrol et
  checkPurchaseVerification(productId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/products/${productId}/verify-purchase`);
  }
} 