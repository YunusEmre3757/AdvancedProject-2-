import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VerificationResponse {
  success?: boolean;
  isVerified?: boolean;
  message: string;
  emailVerified?: boolean;
}

export interface RegisterWithVerificationRequest {
  name: string;
  surname: string;
  email: string;
  password: string;
  gender?: string;
  birthDate?: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
}

export interface VerifyCodeRequest {
  code: string;
}

export interface VerifyCurrentEmailRequest {
  email: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  registerWithVerification(request: RegisterWithVerificationRequest): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/register`, request);
  }

  verifyEmail(token: string): Observable<VerificationResponse> {
    return this.http.get<VerificationResponse>(`${this.API_URL}/verification/verify-email?token=${token}`);
  }

  changeEmail(request: ChangeEmailRequest): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/change-email`, request);
  }

  verifyEmailChange(request: VerifyCodeRequest): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/verify-email-change`, request);
  }

  sendVerification(): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/send-verification`, {});
  }

  verifyCurrentEmail(request: VerifyCurrentEmailRequest): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/verify-current-email`, request);
  }
  
  resendVerificationEmail(email: string): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(`${this.API_URL}/verification/resend-registration`, { email });
  }
  
  checkVerificationStatus(email: string): Observable<VerificationResponse> {
    return this.http.get<VerificationResponse>(`${this.API_URL}/verification/check-status?email=${email}`);
  }
} 