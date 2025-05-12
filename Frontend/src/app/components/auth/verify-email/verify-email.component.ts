import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { VerificationService, VerificationResponse } from '../../../services/verification.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

interface UserResponse {
  success: boolean;
  user: any;
  message: string;
}

@Component({
  selector: 'app-verify-email',
  standalone: false,
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  loading = false;
  success = false;
  error = false;
  message = '';
  countdown = 0;
  userEmail: string | null = null;
  showResendButton = false;
  isExpiredToken = false;
  private token: string | null = null;
  private destroy$ = new Subject<void>();
  private countdownSubscription: any;
  debugToken: string | null = null;

  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  verifyEmail(): void {
    if (!this.token) {
      console.error('VerifyEmailComponent: No token available for verification');
      this.error = true;
      this.message = 'Doğrulama kodu bulunamadı.';
      return;
    }

    this.loading = true;
    this.error = false;
    this.success = false;
    this.isExpiredToken = false;
    this.message = 'Email adresiniz doğrulanıyor...';

    console.log('VerifyEmailComponent: Starting email verification with token:', this.token);

    this.verificationService.verifyEmail(this.token).subscribe({
      next: (response: VerificationResponse) => {
        console.log('VerifyEmailComponent: Verification successful:', response);
        this.loading = false;
        this.success = true;
        this.message = response.message || 'Email adresiniz başarıyla doğrulandı!';
        this.startCountdown();
      },
      error: (error: HttpErrorResponse) => {
        console.error('VerifyEmailComponent: Verification error:', error);
        this.loading = false;
        this.error = true;
        
        if (error.status === 403) {
          this.isExpiredToken = true;
          this.message = 'Bu doğrulama kodunun süresi dolmuş. Yeni bir doğrulama kodu talep etmek için aşağıdaki butonu kullanabilirsiniz.';
          const email = this.route.snapshot.queryParamMap.get('email');
          if (email) {
            this.userEmail = email;
            this.showResendButton = true;
          }
        } else if (error.error?.message) {
          this.message = error.error.message;
        } else if (error.status === 404) {
          this.message = 'Doğrulama kodu bulunamadı veya süresi dolmuş.';
        } else if (error.status === 400) {
          this.message = 'Geçersiz doğrulama kodu.';
        } else if (error.status === 0) {
          this.message = 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
        } else {
          this.message = 'Email doğrulama işlemi sırasında bir hata oluştu.';
        }
      }
    });
  }

  ngOnInit(): void {
    console.log('VerifyEmailComponent: ngOnInit called');
    
    this.token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');
    
    console.log('VerifyEmailComponent: Full URL:', window.location.href);
    console.log('VerifyEmailComponent: Query params:', this.route.snapshot.queryParamMap);
    console.log('VerifyEmailComponent: Token from URL:', this.token);
    
    if (this.token) {
      this.debugToken = this.token;
      console.log('VerifyEmailComponent: Starting verification with token:', this.token);
      
      this.verifyEmail();
    } else if (email) {
      this.userEmail = email;
      this.checkEmailStatus();
    } else {
      this.error = true;
      this.message = 'Doğrulama bilgileri bulunamadı.';
      console.error('VerifyEmailComponent: No token or email found in URL');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  startCountdown(): void {
    this.countdown = 5;
    this.countdownSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.countdown--;
        if (this.countdown === 0) {
          this.navigateToHome();
          if (this.countdownSubscription) {
            this.countdownSubscription.unsubscribe();
          }
        }
      });
  }

  navigateToHome(): void {
    if (this.success) {
      this.router.navigate(['/home'])
        .then(() => console.log('Successfully navigated to home'))
        .catch(error => console.error('Navigation error:', error));
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login'])
      .then(() => {
        console.log('Giriş sayfasına yönlendirildi');
      })
      .catch(error => {
        console.error('Yönlendirme hatası:', error);
        this.message = 'Yönlendirme sırasında bir hata oluştu.';
      });
  }

  resendVerificationEmail(): void {
    if (!this.userEmail) {
      this.error = true;
      this.message = 'E-posta adresi bulunamadı. Lütfen tekrar kayıt olun.';
      return;
    }

    this.loading = true;
    this.error = false;
    this.message = 'Yeni doğrulama linki gönderiliyor...';
    this.showResendButton = false;

    console.log('Doğrulama emaili gönderme isteği:', this.userEmail);

    this.verificationService.resendVerificationEmail(this.userEmail).subscribe({
      next: (response: VerificationResponse) => {
        console.log('Doğrulama emaili gönderme başarılı:', response);
        this.loading = false;
        this.error = false;
        this.message = `Yeni doğrulama linki ${this.userEmail} adresine gönderildi.`;
        
        setTimeout(() => {
          this.showResendButton = true;
        }, 60000);
      },
      error: (error: HttpErrorResponse | Error) => {
        console.error('Doğrulama emaili gönderme hatası:', error);
        this.loading = false;
        this.error = true;
        this.showResendButton = true;

        if (error instanceof HttpErrorResponse) {
          if (error.status === 429) {
            this.message = 'Çok fazla deneme yaptınız. Lütfen bir süre bekleyin.';
            this.showResendButton = false;
            setTimeout(() => {
              this.showResendButton = true;
            }, 60000);
          } else if (error.status === 403) {
            this.message = 'Doğrulama bekleyen kullanıcı bulunamadı. Lütfen tekrar kayıt olun.';
            setTimeout(() => {
              this.router.navigate(['/register']);
            }, 3000);
          } else {
            this.message = error.error?.message || 'Doğrulama linki gönderilemedi.';
          }
        } else {
          this.message = error.message;
          
          if (error.message.includes('zaten doğrulanmış')) {
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          }
        }
      }
    });
  }

  checkEmailStatus(): void {
    if (!this.userEmail) {
      return;
    }

    this.loading = true;
    this.verificationService.checkVerificationStatus(this.userEmail).subscribe({
      next: (response: VerificationResponse) => {
        this.loading = false;
        if (response.emailVerified) {
          this.success = true;
          this.message = 'Email adresiniz doğrulandı!';
          this.showResendButton = false;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.message = `Lütfen ${this.userEmail} adresine gönderilen doğrulama linkine tıklayın.`;
          this.showResendButton = true;
        }
      },
      error: (error: HttpErrorResponse | Error) => {
        this.loading = false;
        this.error = true;
        this.message = error instanceof HttpErrorResponse ? (error.error?.message || 'Doğrulama durumu kontrol edilirken bir hata oluştu.') : error.message;
        this.showResendButton = true;
      }
    });
  }
}

