import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { StoreService, StoreApplication } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { Category } from '../../../models/Category';

@Component({
  selector: 'app-store-application',
  templateUrl: './store-application.component.html',
  styleUrls: ['./store-application.component.css'],
  standalone: false
})
export class StoreApplicationComponent implements OnInit {
  storeApplicationForm: FormGroup;
  isSubmitting = false;
  isSuccessModalOpen = false;
  mainCategories: Category[] = [];
  errorMessage = '';
  isLoggedIn = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private categoryService: CategoryService,
    private storeService: StoreService,
    private authService: AuthService
  ) {
    this.storeApplicationForm = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(3)]],
      storeDescription: ['', [Validators.required, Validators.minLength(20)]],
      category: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^(\+90|0)?[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      taxNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)]],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    // Kullanıcı giriş durumunu kontrol et
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      
      // Eğer kullanıcı giriş yapmışsa, mevcut email'i doldur
      if (user && user.email) {
        this.storeApplicationForm.patchValue({
          email: user.email
        });
      }
    });
    
    // Ana kategorileri yükle
    this.loadCategories();
  }

  loadCategories(): void {
    // Sadece ana (kök) kategorileri getir
    this.categoryService.getRootCategories().subscribe({
      next: (categories: Category[]) => {
        this.mainCategories = categories;
        console.log('Ana kategoriler yüklendi:', this.mainCategories);
      },
      error: (err: any) => {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
      }
    });
  }

  submitStoreApplication(): void {
    if (this.storeApplicationForm.invalid) {
      // Form alanlarını dokunulmuş olarak işaretle, böylece hatalar görünür olur
      Object.keys(this.storeApplicationForm.controls).forEach(key => {
        this.storeApplicationForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Seçilen kategori mağazanın ana kategorisi olacak
    const selectedCategory = this.storeApplicationForm.value.category;
    console.log('Seçilen ana kategori ID:', selectedCategory);

    const applicationData: Omit<StoreApplication, 'id' | 'createdAt' | 'updatedAt'> = {
      name: this.storeApplicationForm.value.storeName,
      description: this.storeApplicationForm.value.storeDescription,
      categoryId: selectedCategory, // Ana kategori ID'si
      phone: this.storeApplicationForm.value.phone,
      email: this.storeApplicationForm.value.email,
      taxNumber: this.storeApplicationForm.value.taxNumber,
      status: 'pending'
    };

    console.log('Gönderilecek başvuru verisi:', applicationData);

    this.storeService.createStoreApplication(applicationData)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (response) => {
          console.log('Başvuru başarıyla gönderildi:', response);
          this.isSuccessModalOpen = true;
          this.storeApplicationForm.reset();
        },
        error: (err: any) => {
          console.error('Market başvurusu gönderilirken hata oluştu:', err);
          this.errorMessage = err.error?.message || 'Market başvurusu gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        }
      });
  }

  redirectToLogin(): void {
    this.router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: '/auth/store-application' } 
    });
  }

  closeSuccessModal(): void {
    this.isSuccessModalOpen = false;
    this.router.navigate(['/home']);
  }
} 