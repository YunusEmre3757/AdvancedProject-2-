import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { VerificationService } from '../../../services/verification.service';
import { passwordStrengthValidator } from '../../../validators/password.validator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  success = false;
  successMessage = '';
  showPassword = false;
  error: any;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private verificationService: VerificationService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
      name: ['', Validators.required],
      surname: ['', Validators.required],
      gender: [''],
      birthDate: ['']
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.success = false;

    // Doğrulama gerektiren kayıt için VerificationService'i kullan
    this.verificationService.registerWithVerification({
      name: this.registerForm.get('name')?.value,
      surname: this.registerForm.get('surname')?.value,
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value,
      gender: this.registerForm.get('gender')?.value,
      birthDate: this.registerForm.get('birthDate')?.value
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = true;
        this.successMessage = response.message || 'Kayıt başarılı! Lütfen email adresinizi kontrol edin ve hesabınızı doğrulayın.';
        this.registerForm.reset();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Kayıt başarısız. Lütfen farklı bilgilerle tekrar deneyin.';
        this.isLoading = false;
      }
    });
  }
} 