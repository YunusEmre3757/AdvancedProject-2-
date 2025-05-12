import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';
import { Store } from '../../../models/store.interface';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-seller-profile',
  templateUrl: './seller-profile.component.html',
  styleUrls: ['./seller-profile.component.css'],
  standalone: false
})
export class SellerProfileComponent implements OnInit {
  store: any = {
    // Başlangıç değerleri boş olarak tanımla
  };
  storeId: string = '';
  isLoading: boolean = true;
  isEditing: boolean = false;
  error: string = '';
  success: string = '';
  phoneError: string = '';
  statusOptions = [
    { value: 'inactive', label: 'Pasif' },
    { value: 'approved', label: 'Aktif' }
  ];
  showBannerPreview: boolean = false;
  @ViewChild('logoFileInput') logoFileInput!: ElementRef;
  @ViewChild('bannerFileInput') bannerFileInput!: ElementRef;
  
  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private storeService: StoreService,
    private authService: AuthService,
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Sayfa yüklendiğinde mağaza bilgilerini yükle
    this.isLoading = true;
    this.error = '';

    // URL'den mağaza ID'sini al
    this.route.paramMap.subscribe(params => {
      const storeId = params.get('storeId');
      if (storeId) {
        this.storeId = storeId;
        this.loadStoreDetails(storeId);
      } else {
        // Eğer storeId yoksa, kullanıcının ilk mağazasını getir
        this.loadUserStores();
      }
    });
  }

  // Kullanıcının mağazalarını getir
  loadUserStores(): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';
    
    console.log('Kullanıcının mağazaları yükleniyor...');
    
    this.storeService.getMyStores().subscribe({
      next: (stores) => {
        console.log('Kullanıcının mağazaları başarıyla yüklendi:', stores);
        
        if (stores && stores.length > 0) {
          this.storeId = stores[0].id.toString();
          this.loadStoreDetails(this.storeId);
        } else {
          this.isLoading = false;
          this.error = 'Henüz bir mağazanız bulunmuyor. Lütfen önce bir mağaza oluşturun.';
          this.snackBar.open('Henüz bir mağazanız bulunmuyor.', 'Tamam', {
            duration: 5000
          });
        }
      },
      error: (err) => {
        console.error('Mağazalar yüklenirken hata oluştu:', err);
        this.isLoading = false;
        this.error = 'Mağazalar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        this.snackBar.open('Mağazalar yüklenirken bir hata oluştu.', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // Mağaza detaylarını getir
  loadStoreDetails(storeId: string): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';
    
    console.log(`Mağaza detayları yükleniyor (ID: ${storeId})...`);
    
    // Satıcı endpointini kullanarak mağaza detaylarını al (inactive dahil tüm statülerdeki mağazaları görüntüleyebilir)
    this.storeService.getStoreDetailsForSeller(storeId).subscribe({
      next: (storeData) => {
        console.log('Mağaza detayları başarıyla yüklendi:', storeData);
        this.store = storeData;
        
        // API'den gelen email/phone alanlarını düzenle
        if (!this.store.contactEmail && this.store.email) {
          this.store.contactEmail = this.store.email;
        }
        if (!this.store.contactPhone && this.store.phone) {
          this.store.contactPhone = this.store.phone;
        }
        
        this.isLoading = false;
        this.snackBar.open('Mağaza bilgileri başarıyla yüklendi', 'Tamam', {
          duration: 2000
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Mağaza detayları yüklenirken hata oluştu:', err);
        this.isLoading = false;
        
        if (err.status === 404) {
          this.error = 'Mağaza bulunamadı. Lütfen geçerli bir mağaza seçin.';
        } else if (err.status === 403) {
          this.error = 'Bu mağaza bilgilerine erişim izniniz yok.';
        } else {
          this.error = 'Mağaza detayları yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        }
        
        this.snackBar.open(this.error, 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // Telefon numarası doğrulama
  validatePhone(phone: string): boolean {
    if (!phone) return true; // Boş ise kontrol etmeye gerek yok
    
    // Türkiye telefon formatı kontrolü - başında + veya 0 olabilir
    const phoneRegex = /^(\+90|0)?\s*([0-9]{3})\s*([0-9]{3})\s*([0-9]{2})\s*([0-9]{2})$/;
    
    return phoneRegex.test(phone);
  }

  // Mağaza bilgilerini güncelle
  saveStoreProfile(): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';
    this.phoneError = '';
    
    // Telefon doğrulama kontrolü
    if (!this.validatePhone(this.store.contactPhone)) {
      this.phoneError = 'Geçerli bir telefon numarası giriniz. Örnek: +90 555 123 45 67';
      this.isLoading = false;
      return;
    }
    
    // Status doğrudan gönderilecek, banned -> inactive dönüşümü yapılmayacak
    
    // StoreCreateDTO formatında veri oluştur
    const storeData = {
      name: this.store.name,
      description: this.store.description,
      logo: this.store.logo,
      bannerImage: this.store.bannerImage,
      contactEmail: this.store.contactEmail,
      contactPhone: this.store.contactPhone,
      address: this.store.address,
      website: this.store.website,
      status: this.store.status, // Doğrudan store.status kullan
      category: this.store.category || '',
      facebook: this.store.facebook || '',
      instagram: this.store.instagram || '',
      twitter: this.store.twitter || ''
    };
    
    console.log('Sending store update:', storeData);
    
    this.storeService.updateStore(this.storeId, storeData).subscribe({
      next: (updatedStore) => {
        console.log('Store updated successfully:', updatedStore);
        
        this.store = updatedStore;
        
        this.isLoading = false;
        this.success = 'Mağaza bilgileri başarıyla güncellendi!';
        this.snackBar.open('Mağaza bilgileri başarıyla güncellendi!', 'Tamam', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Mağaza güncellenirken hata oluştu:', err);
        this.isLoading = false;
        this.error = 'Mağaza bilgileri güncellenirken bir hata oluştu.';
        this.snackBar.open('Mağaza güncellenirken hata oluştu!', 'Tamam', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // Logo değiştirme fonksiyonu
  changeLogo(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Önce dosya boyutu ve türü kontrolü
      if (file.size > 2 * 1024 * 1024) { // 2MB sınırı
        this.snackBar.open('Logo dosyası en fazla 2MB olabilir', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
        this.snackBar.open('Lütfen sadece resim dosyası seçin (JPEG, PNG, GIF)', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      // Önce görsel önizleme için dosyayı okuyoruz
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.store.logo = e.target.result; // Base64 formatında önizleme
      };
      reader.readAsDataURL(file);
      
      // Ardından dosyayı sunucuya yükleme işlemi
      this.isLoading = true;
      this.storeService.uploadLogo(this.storeId, file).subscribe({
        next: (response) => {
          // Sunucudan dönen logo URL'sini düzeltiyoruz
          if (response && response.logoUrl) {
            // URL'yi düzelt: Eğer tam URL değilse (http ile başlamıyorsa)
            // localhost:8080 ekle
            if (!response.logoUrl.startsWith('http')) {
              this.store.logo = 'http://localhost:8080' + response.logoUrl;
            } else {
              this.store.logo = response.logoUrl;
            }
          }
          this.isLoading = false;
          this.snackBar.open('Logo başarıyla güncellendi', 'Tamam', {
            duration: 3000
          });
        },
        error: (err) => {
          console.error('Logo yüklenirken hata oluştu:', err);
          this.isLoading = false;
          this.snackBar.open('Logo yüklenirken bir hata oluştu', 'Tamam', {
            duration: 3000
          });
        }
      });
    }
  }

  // Banner görselini değiştirme fonksiyonu
  changeBanner(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Önce dosya boyutu ve türü kontrolü
      if (file.size > 5 * 1024 * 1024) { // 5MB sınırı
        this.snackBar.open('Banner dosyası en fazla 5MB olabilir', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
        this.snackBar.open('Lütfen sadece resim dosyası seçin (JPEG, PNG, GIF)', 'Tamam', {
          duration: 3000
        });
        return;
      }
      
      // Önce görsel önizleme için dosyayı okuyoruz
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.store.bannerImage = e.target.result; // Base64 formatında önizleme
        this.showBannerPreview = true;
      };
      reader.readAsDataURL(file);
      
      // Ardından dosyayı sunucuya yükleme işlemi
      this.isLoading = true;
      this.storeService.uploadBanner(this.storeId, file).subscribe({
        next: (response) => {
          // Sunucudan dönen banner URL'sini düzeltiyoruz
          if (response && response.bannerUrl) {
            // URL'yi düzelt: Eğer tam URL değilse (http ile başlamıyorsa)
            // localhost:8080 ekle
            if (!response.bannerUrl.startsWith('http')) {
              this.store.bannerImage = 'http://localhost:8080' + response.bannerUrl;
            } else {
              this.store.bannerImage = response.bannerUrl;
            }
          }
          this.isLoading = false;
          this.snackBar.open('Banner görseli başarıyla güncellendi', 'Tamam', {
            duration: 3000
          });
        },
        error: (err) => {
          console.error('Banner yüklenirken hata oluştu:', err);
          this.isLoading = false;
          this.snackBar.open('Banner yüklenirken bir hata oluştu', 'Tamam', {
            duration: 3000
          });
        }
      });
    }
  }

  // Status sınıfı döndürür (görsel stiller için)
  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'inactive': return 'status-inactive';
      case 'rejected': return 'status-rejected';
      case 'banned': return 'status-banned';
      default: return 'status-inactive';
    }
  }

  // Status metni döndürür
  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'pending': return 'Beklemede';
      case 'rejected': return 'Reddedildi';
      case 'banned': return 'Yasaklandı';
      default: return 'Beklemede';
    }
  }

  // Trigger logo file input click
  triggerLogoUpload(): void {
    this.logoFileInput.nativeElement.click();
  }
  
  // Trigger banner file input click
  triggerBannerUpload(): void {
    this.bannerFileInput.nativeElement.click();
  }

  // Mağaza durumunu güncelle - satıcılar için özel endpoint
  updateStoreStatus(): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';
    
    console.log('Mağaza durumu güncelleniyor:', this.store.status);
    
    // Satıcılar için özel endpoint'i kullan
    this.storeService.updateStoreStatus(this.storeId, this.store.status).subscribe({
      next: (updatedStore) => {
        console.log('Mağaza durumu başarıyla güncellendi:', updatedStore);
        this.store = updatedStore;
        this.isLoading = false;
        this.success = 'Mağaza durumu başarıyla güncellendi!';
        this.snackBar.open('Mağaza durumu başarıyla güncellendi!', 'Tamam', {
          duration: 3000
        });
      },
      error: (err) => {
        console.error('Mağaza durumu güncellenirken hata oluştu:', err);
        this.isLoading = false;
        this.error = 'Mağaza durumu güncellenirken bir hata oluştu.';
        this.snackBar.open('Mağaza durumu güncellenirken hata oluştu!', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // Logout method
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Redirect to login page
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Çıkış yaparken hata oluştu:', err);
        this.snackBar.open('Çıkış yaparken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }
}
