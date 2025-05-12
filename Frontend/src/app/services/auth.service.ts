import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, map, of, firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UpdateProfileRequest } from '../models/user.interface';



export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  surname: string;
  phoneNumber?: string;
  roles?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  surname: string;
  gender?: string;
  birthDate?: string;
}

export interface EmailVerificationRequest {
  currentEmail: string;
  newEmail?: string;
  type: 'current' | 'new';
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';
  
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  public isAuthenticated$: Observable<boolean>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.isAuthenticated$ = this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isLoggedIn(): boolean {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    return !!token;
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, request)
      .pipe(
        tap(response => this.handleAuthResponse(response))
      );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, request)
      .pipe(
        tap(response => this.handleAuthResponse(response))
      );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.error('No refresh token available');
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh-token`, { refreshToken })
      .pipe(
        tap(response => {
          console.log('Refresh token response:', response);
          if (!response || !response.accessToken) {
            throw new Error('Invalid token response');
          }
          this.handleAuthResponse(response);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error refreshing token:', error);
          // For specific errors like invalid refresh token, clear the auth data
          if (error.status === 401 || error.status === 403) {
            this.clearAuthData();
          }
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<boolean> {
    // You could add a backend call here if needed
    // return this.http.post<void>(`${this.API_URL}/auth/logout`, {}).pipe(
    //   tap(() => this.clearAuthData())
    // );
    // For now, just clear local data and return an observable
    this.clearAuthData();
    return of(true);
  }

  updateProfile(updateData: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/users/profile`, updateData)
      .pipe(
        tap(updatedUser => {
          // Update user in local storage
          const storedUser = this.getUserFromStorage();
          if (storedUser) {
            const mergedUser = { ...storedUser, ...updatedUser };
            localStorage.setItem(this.USER_KEY, JSON.stringify(mergedUser));
            this.currentUserSubject.next(mergedUser);
          }
        })
      );
  }

  sendVerificationEmail(request: EmailVerificationRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/users/verify-email/send`, request);
  }

  async sendVerificationEmailAsync(request: EmailVerificationRequest): Promise<void> {
    return firstValueFrom(this.sendVerificationEmail(request));
  }

  updateEmailWithVerification(newEmail: string, verificationCode: string): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/users/verify-email/confirm`, {
      newEmail,
      verificationCode
    }).pipe(
      tap(updatedUser => {
        // Update user in local storage
        const storedUser = this.getUserFromStorage();
        if (storedUser) {
          const mergedUser = { ...storedUser, ...updatedUser };
          localStorage.setItem(this.USER_KEY, JSON.stringify(mergedUser));
          this.currentUserSubject.next(mergedUser);
        }
      })
    );
  }

  async updateEmailWithVerificationAsync(newEmail: string, verificationCode: string): Promise<User> {
    return firstValueFrom(this.updateEmailWithVerification(newEmail, verificationCode));
  }

  logoutFromAll(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/auth/logout-all`, {})
      .pipe(
        tap(() => this.clearAuthData())
      );
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/users/account`)
      .pipe(
        tap(() => this.clearAuthData())
      );
  }

  updatePassword(request: UpdatePasswordRequest): Observable<User> {
    // Bu endpoint artık kimlik doğrulama gerektiriyor
    // authInterceptor HTTP isteğine otomatik olarak Authorization header'ı ekleyecek
    return this.http.post<User>(`${this.API_URL}/auth/change-password`, request)
      .pipe(
        tap(updatedUser => {
          console.log('Password updated successfully:', updatedUser);
          // Update user in local storage if needed
          const storedUser = this.getUserFromStorage();
          if (storedUser) {
            const mergedUser = { ...storedUser, ...updatedUser };
            localStorage.setItem(this.USER_KEY, JSON.stringify(mergedUser));
            this.currentUserSubject.next(mergedUser);
          }
        }),
        catchError(error => {
          console.error('Error updating password:', error);
          return throwError(() => error);
        })
      );
  }

  async updatePasswordAsync(request: UpdatePasswordRequest): Promise<User> {
    return firstValueFrom(this.updatePassword(request));
  }

  // Şifre sıfırlama için e-posta gönder
  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/auth/forgot-password`, { email });
  }
  

  // Şifre sıfırlama işlemini tamamla
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/reset-password`, {
      token,
      newPassword
    });
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (response && response.accessToken) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, response.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
      
      const user: User = {
        id: response.userId,
        email: response.email,
        name: response.name,
        surname: response.surname,
        phoneNumber: response.phoneNumber,
        roles: response.roles
      };
      
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
    }
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getUserId(): number | null {
    const user = this.getUserFromStorage();
    return user ? user.id : null;
  }


  
  /**
   * Mağaza hesabı girişi
   */
  storeLogin(credentials: { email: string; password: string; type: string }): Observable<AuthResponse> {
    const url = `${this.API_URL}/auth/store-login`;
    
    return this.http.post<AuthResponse>(url, credentials)
      .pipe(
        tap(response => {
          this.handleAuthResponse(response);
          
          // Add SELLER role if not already present
          const user = this.getUserFromStorage();
          if (user && !user.roles?.includes('SELLER')) {
            user.roles = [...(user.roles || []), 'SELLER'];
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
        }),
        catchError(error => {
          console.error('Mağaza girişi hatası:', error);
          return throwError(() => error);
        })
      );
  }
} 