import { Component, Input, OnInit, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReviewResponse, ReviewRequest, ReviewSummary } from '../../../models/review.interface';
import { ReviewService } from '../../../services/review.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { MatRippleModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
@Component({
  selector: 'app-product-reviews',
  templateUrl: './product-reviews.component.html',
  styleUrls: ['./product-reviews.component.css'],
  standalone: false,
  
})
export class ProductReviewsComponent implements OnInit {
  @Input() productId!: number;
  
  reviewSummary?: ReviewSummary;
  reviews: ReviewResponse[] = [];
  
  reviewForm: FormGroup;
  isSubmitting = false;
  isLoggedIn = false;
  showReviewForm = false; // Değerlendirme formunun görünürlüğünü kontrol etmek için
  hasPurchasedProduct = false; // Kullanıcının ürünü satın alıp almadığını kontrol etmek için
  
  // Sayfalama için
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25];
  
  // Yükleme durumları
  isSummaryLoading = false;
  isReviewsLoading = false;
  
  // Filtre ve sıralama
  selectedRating = 0; // 0 = tümü
  sortOption = 'newest'; // newest, oldest, helpful

  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    @Optional() public dialogRef: MatDialogRef<ProductReviewsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: {productId: number}
  ) {
    this.reviewForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]]
    });
  }

  ngOnInit(): void {
    // Dialog olarak açıldığında data'dan productId alınır
    if (this.data && this.data.productId) {
      this.productId = this.data.productId;
    }

    if (!this.productId) {
      console.error('ProductReviewsComponent: productId is required');
      return;
    }

    this.isLoggedIn = this.authService.isLoggedIn;
    
    // Varsayılan sıralama seçeneğini ayarla
    this.sortOption = 'newest'; // En yeni yorumları varsayılan olarak göster
    console.log('Varsayılan sıralama: en yeni');
    
    this.loadReviewSummary();
    this.loadReviews();
    
    // Kullanıcı giriş yapmışsa, ürünü satın alıp almadığını kontrol et
    if (this.isLoggedIn) {
      this.checkPurchaseVerification();
    }
  }
  
  // Kullanıcının ürünü satın alıp almadığını kontrol et
  checkPurchaseVerification(): void {
    // Kullanıcı giriş yapmamışsa, ürünü satın almamış olarak işaretle ve işlemi sonlandır
    if (!this.isLoggedIn) {
      this.hasPurchasedProduct = false;
      return;
    }

    // Kimlik doğrulama kodunu kontrol et
    const token = this.authService.getAccessToken();
    if (!token) {
      console.warn('Token bulunamadı, kullanıcı satın alma kontrolü yapılamaz.');
      this.hasPurchasedProduct = false;
      return;
    }

    this.reviewService.checkPurchaseVerification(this.productId).subscribe({
      next: (hasPurchased) => {
        console.log(`Kullanıcı ürünü satın almış mı? ${hasPurchased}`);
        this.hasPurchasedProduct = hasPurchased;
      },
      error: (error) => {
        console.error('Satın alma kontrolü yapılırken hata:', error);
        // Kimlik doğrulama hatası (401) veya diğer hatalar için varsayılan olarak false
        this.hasPurchasedProduct = false;
        
        // 401 hatası alıyorsak, bu kullanıcının giriş yapmadığını veya token'ının geçersiz olduğunu gösterir
        if (error.status === 401) {
          console.log('Kimlik doğrulama hatası: Kullanıcı giriş yapmamış veya oturumu sona ermiş.');
          // Oturum süresi dolmuşsa kullanıcıyı otomatik olarak çıkış yap
          this.authService.logout().subscribe(() => {
            // İsteğe bağlı: Kullanıcıyı giriş sayfasına yönlendir veya uyarı göster
            this.snackBar.open('Oturumunuz sona erdi, lütfen tekrar giriş yapın.', 'Tamam', {
              duration: 5000
            });
          });
        }
      }
    });
  }

  // Değerlendirme formunu açıp kapatmak için metod
  toggleReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    if (this.showReviewForm) {
      // Form açıldığında varsayılan değerleri ayarla
      this.resetForm();
    }
  }

  loadReviewSummary(): void {
    this.isSummaryLoading = true;
    this.reviewService.getProductReviewSummary(this.productId).subscribe({
      next: (summary) => {
        this.reviewSummary = summary;
        this.isSummaryLoading = false;
      },
      error: (error) => {
        console.error('Değerlendirme özeti yüklenirken hata:', error);
        this.isSummaryLoading = false;
        // Hata durumunda varsayılan değerler atayalım
        this.reviewSummary = {
          productId: this.productId,
          averageRating: 0,
          totalReviewCount: 0,
          ratingDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
          featuredReviews: []
        };
      }
    });
  }

  loadReviews(): void {
    this.isReviewsLoading = true;
    let sortBy = 'createdAt';
    let sortDir = 'desc';
    
    // Sıralama seçeneğine göre parametreleri ayarla
    if (this.sortOption === 'newest') {
      sortBy = 'createdAt';
      sortDir = 'desc'; // En yeni önce
    } else if (this.sortOption === 'oldest') {
      sortBy = 'createdAt'; 
      sortDir = 'asc';  // En eski önce
    } else if (this.sortOption === 'helpful') {
      sortBy = 'helpfulCount';
      sortDir = 'desc'; // En yardımcı önce
    }

    console.log(`Değerlendirmeler yükleniyor: sortOption=${this.sortOption}, sortBy=${sortBy}, sortDir=${sortDir}`);

    this.reviewService.getProductReviews(
      this.productId, 
      this.pageIndex, 
      this.pageSize, 
      sortBy, 
      sortDir,
      this.selectedRating
    ).subscribe({
      next: (page) => {
        this.reviews = page.content;
        this.totalElements = page.totalElements;
        this.isReviewsLoading = false;
        console.log(`${this.reviews.length} değerlendirme yüklendi, sıralama: ${sortBy} ${sortDir}`);
      },
      error: (error) => {
        console.error('Değerlendirmeler yüklenirken hata:', error);
        this.isReviewsLoading = false;
        // Hata durumunda boş liste gösterelim
        this.reviews = [];
        this.totalElements = 0;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadReviews();
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    
    const reviewRequest: ReviewRequest = {
      productId: this.productId,
      title: this.reviewForm.value.title,
      comment: this.reviewForm.value.comment,
      rating: this.reviewForm.value.rating
    };

    this.reviewService.addReview(reviewRequest).subscribe({
      next: () => {
        this.snackBar.open('Değerlendirmeniz başarıyla eklendi', 'Tamam', {
          duration: 3000
        });
        
        this.resetForm();
        this.loadReviewSummary();
        this.loadReviews();
        this.isSubmitting = false;
        this.showReviewForm = false; // Başarılı gönderimden sonra formu kapat
      },
      error: (error) => {
        console.error('Değerlendirme gönderilirken hata:', error);
        
        let errorMessage = 'Değerlendirme gönderilirken bir hata oluştu';
        
        if (error.status === 400) {
          errorMessage = 'Geçersiz form verileri. Lütfen tüm alanları kontrol edin.';
        } else if (error.status === 401) {
          errorMessage = 'Değerlendirme yapmak için giriş yapmalısınız';
        } else if (error.status === 403) {
          errorMessage = 'Bu ürünü değerlendirmek için satın almanız gerekiyor';
        } else if (error.status === 409) {
          errorMessage = 'Bu ürün için zaten bir değerlendirme yapmışsınız';
        }
        
        this.snackBar.open(errorMessage, 'Tamam', {
          duration: 5000
        });
        
        this.isSubmitting = false;
      }
    });
  }

  markAsHelpful(reviewId: number): void {
    if (!this.isLoggedIn) {
      this.snackBar.open('Bu işlem için giriş yapmanız gerekiyor', 'Tamam', {
        duration: 3000
      });
      return;
    }

    // Önce UI'da yorum sayacını artır (iyimser güncelleme)
    const reviewIndex = this.reviews.findIndex(r => r.id === reviewId);
    if (reviewIndex !== -1) {
      const review = this.reviews[reviewIndex];
      
      // Eğer zaten işaretlenmişse, işareti kaldır
      if (review.isMarkedHelpful) {
        // UI'da işareti kaldır ve sayacı azalt
        review.isMarkedHelpful = false;
        review.helpfulCount = Math.max(0, review.helpfulCount - 1);
        
        // Backend'e işlemin kaldırıldığını bildir
        this.reviewService.unmarkReviewAsHelpful(reviewId).subscribe({
          next: () => {
            console.log(`Yorum (${reviewId}) işareti kaldırıldı.`);
            this.snackBar.open('Teşekkür kaldırıldı', 'Tamam', {
              duration: 2000
            });
          },
          error: (error) => {
            console.error('Teşekkür kaldırma işleminde hata:', error);
            // Hata durumunda UI'ı eski haline getir
            review.isMarkedHelpful = true;
            review.helpfulCount += 1;
            
            this.snackBar.open('Teşekkür kaldırılamadı', 'Tamam', {
              duration: 3000
            });
          }
        });
      } 
      // Eğer işaretlenmemişse, işaretle
      else {
        // UI'da işaretle ve sayacı artır
        review.isMarkedHelpful = true;
        review.helpfulCount += 1;
        
        // Backend'e işlemi bildir
        this.reviewService.markReviewAsHelpful(reviewId).subscribe({
          next: () => {
            console.log(`Yorum (${reviewId}) yararlı olarak işaretlendi.`);
            this.snackBar.open('Değerlendirmeye teşekkür edildi', 'Tamam', {
              duration: 2000
            });
          },
          error: (error) => {
            console.error('Teşekkür işleminde hata:', error);
            
            // Hata durumunda UI'ı eski haline getir
            review.isMarkedHelpful = false;
            review.helpfulCount = Math.max(0, review.helpfulCount - 1);
            
            let errorMessage = 'Bir hata oluştu';
            
            // Farklı hata durumlarına göre mesajlar
            if (error.status === 409) {
              errorMessage = 'Bu değerlendirmeye zaten teşekkür ettiniz';
            } else if (error.status === 403) {
              errorMessage = 'Kendi değerlendirmenize teşekkür edemezsiniz';
            } else if (error.status === 401) {
              errorMessage = 'Teşekkür etmek için giriş yapmalısınız';
            }
            
            this.snackBar.open(errorMessage, 'Tamam', {
              duration: 3000
            });
          }
        });
      }
    }
  }

  filterByRating(rating: number): void {
    if (this.selectedRating === rating) {
      console.log(`Zaten ${rating === 0 ? 'tüm değerlendirmeler' : rating + ' yıldız değerlendirmeler'} filtreleniyor.`);
      return; // Aynı filtreyi tekrar seçtiyse işlem yapma
    }
    
    console.log(`Filtreleme değiştiriliyor: ${this.selectedRating} -> ${rating}`);
    this.selectedRating = rating;
    this.pageIndex = 0; // İlk sayfaya dön
    
    // Filtrelemenin değiştiğini kullanıcıya bildir
    this.snackBar.open(`${
      rating === 0 ? 'Tüm değerlendirmeler' : 
      rating + ' yıldız değerlendirmeler'
    } gösteriliyor`, 'Tamam', {
      duration: 2000,
    });
    
    // Değerlendirmeleri yeniden yükle
    this.loadReviews();
  }

  sortReviews(sortType: string): void {
    if (this.sortOption === sortType) {
      console.log(`Zaten '${sortType}' sıralaması kullanılıyor.`);
      return; // Aynı sıralamayı tekrar seçtiyse işlem yapma
    }
    
    console.log(`Sıralama değiştiriliyor: ${this.sortOption} -> ${sortType}`);
    this.sortOption = sortType;
    this.pageIndex = 0; // İlk sayfaya dön
    
    // Sıralamanın değiştiğini kullanıcıya bildir
    this.snackBar.open(`Değerlendirmeler "${
      sortType === 'newest' ? 'en yeni' : 
      sortType === 'oldest' ? 'en eski' : 
      'en yararlı'
    }" sıralamasına göre listeleniyor`, 'Tamam', {
      duration: 2000,
    });
    
    // Değerlendirmeleri yeniden yükle
    this.loadReviews();
  }

  resetForm(): void {
    this.reviewForm.reset({
      title: '',
      comment: '',
      rating: 5
    });
  }

  getStarArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i + 1);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  shouldDisableSubmit(): boolean {
    return this.reviewForm.invalid || this.isSubmitting || !this.isLoggedIn;
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
} 