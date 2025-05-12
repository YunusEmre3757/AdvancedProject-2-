import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl: string;
  showPassword = false;
  error: any;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Get return url from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  // Add method to navigate to forgot password page
  navigateToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loginData = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };

    console.log('Attempting login for:', loginData.email);

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('Login successful');
        
        // Check user roles
        const user = this.authService.currentUserValue;
        
        // Determine redirect URL based on roles
        let targetUrl = '/home'; // Default for regular users
        
        if (user?.roles?.includes('SELLER')) {
          // Seller role takes precedence over regular user
          targetUrl = '/seller/dashboard';
        } else if (user?.roles?.includes('ADMIN')) {
          // Admin role
          targetUrl = '/admin/dashboard';
        }
        
        console.log('Redirecting to:', targetUrl);
        
        // Short delay to ensure everything is updated before navigation
        setTimeout(() => {
          this.router.navigate([targetUrl]);
        }, 100);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = error.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
} 