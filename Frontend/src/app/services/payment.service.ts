import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Payment request ve response modellerini ekleyelim
export interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: number;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PaymentConfirmRequest {
  paymentIntentId: string;
  paymentMethodId: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Ödeme niyeti (payment intent) oluşturma
  createPaymentIntent(request: PaymentIntentRequest): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/payments/create-payment-intent`, request);
  }

  // Ödeme işlemini tamamlama
  confirmPayment(request: PaymentConfirmRequest): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/payments/confirm-payment`, request);
  }

  // Ödeme işlemini iptal etme
  cancelPayment(paymentIntentId: string): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/payments/cancel-payment/${paymentIntentId}`, {});
  }

  // Sipariş oluşturma
  createOrder(orderData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders`, orderData);
  }
} 