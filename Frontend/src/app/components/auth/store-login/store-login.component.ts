import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { StoreService } from '../../../services/store.service';

@Component({
  selector: 'app-store-login',
  templateUrl: './store-login.component.html',
  styleUrls: ['./store-login.component.css'],
  standalone: false
})
export class StoreLoginComponent {
  storeLoginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl: string;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private storeService: StoreService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.storeLoginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Always redirect to seller dashboard, regardless of return URL
    this.returnUrl = '/seller/dashboard';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  navigateToStoreApplication(): void {
    this.router.navigate(['/auth/store-application']);
  }

  onSubmit(): void {
    if (this.storeLoginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = {
      email: this.storeLoginForm.get('email')?.value,
      password: this.storeLoginForm.get('password')?.value,
      type: 'store' // Mağaza girişi olduğunu belirt
    };

    console.log('Mağaza girişi deneniyor:', loginData.email);

    this.authService.storeLogin(loginData).subscribe({
      next: (response) => {
        console.log('Mağaza girişi başarılı');
        
        // Kısa bir gecikme ile yönlendirme yaparak her şeyin güncellenmesini sağla
        setTimeout(() => {
          this.router.navigate([this.returnUrl]);
        }, 100);
      },
      error: (error) => {
        console.error('Mağaza girişi hatası:', error);
        this.errorMessage = error.error?.message || 'Giriş başarısız. Lütfen mağaza bilgilerinizi kontrol edip tekrar deneyin.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
} 