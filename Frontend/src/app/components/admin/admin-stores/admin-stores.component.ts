import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { StoreService } from '../../../services/store.service';
import { AdminService, StoreApplication } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { Store } from '../../../models/store.interface';

@Component({
  selector: 'app-admin-stores',
  templateUrl: './admin-stores.component.html',
  styleUrls: ['./admin-stores.component.css'],
  standalone: false
})
export class AdminStoresComponent implements OnInit {
  stores: Store[] = [];
  storeApplications: StoreApplication[] = [];
  loading = {
    stores: true,
    applications: true
  };
  error: string | null = null;
  activeTab = 'stores'; // 'stores' veya 'applications'
  statusFilter: string = 'all'; // 'all', 'approved', 'rejected', 'pending', 'banned'

  constructor(
    private storeService: StoreService,
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStores();
    this.loadStoreApplications();
  }

  loadStores(): void {
    this.loading.stores = true;
    this.adminService.getAllStores().subscribe({
      next: (data) => {
        this.stores = data;
        console.log('Yüklenen mağazalar:', this.stores);
        
        // Mağazaların status değerlerini kontrol et ve logla
        if (this.stores.length > 0) {
          const statusCounts = this.stores.reduce((acc, store) => {
            const status = store.status || 'undefined';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log('Mağaza status dağılımı:', statusCounts);
          
          // Status değeri eksik olan mağazaları tespit et
          const invalidStores = this.stores.filter(store => 
            !store.status || 
            (store.status !== 'approved' && store.status !== 'rejected' && store.status !== 'pending' && store.status !== 'banned')
          );
          
          if (invalidStores.length > 0) {
            console.warn('Geçersiz status değerine sahip mağazalar:', invalidStores);
          }
        }
        
        this.loading.stores = false;
      },
      error: (err) => {
        console.error('Error loading stores:', err);
        this.error = 'Mağazalar yüklenirken bir hata oluştu.';
        this.loading.stores = false;
      }
    });
  }

  loadStoreApplications(): void {
    this.loading.applications = true;
    
    // Mağaza başvurularını yükle
    this.adminService.getStoreApplications().subscribe({
      next: (data) => {
        this.storeApplications = data;
        console.log('Yüklenen mağaza başvuruları:', this.storeApplications);
        
        // Başvuruların status değerlerini kontrol et ve logla
        if (this.storeApplications.length > 0) {
          const statusCounts = this.storeApplications.reduce((acc, app) => {
            const status = app.status || 'undefined';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log('Başvuru status dağılımı:', statusCounts);
          console.log('Bekleyen başvuru sayısı:', this.getPendingApplicationCount());
          
          // Status değeri eksik olan başvuruları tespit et
          const invalidApplications = this.storeApplications.filter(app => 
            !app.status || 
            (app.status !== 'approved' && app.status !== 'rejected' && app.status !== 'pending')
          );
          
          if (invalidApplications.length > 0) {
            console.warn('Geçersiz status değerine sahip başvurular:', invalidApplications);
          }
        }
        
        this.loading.applications = false;
      },
      error: (err) => {
        console.error('Error loading store applications:', err);
        this.error = 'Mağaza başvuruları yüklenirken bir hata oluştu.';
        this.loading.applications = false;
      }
    });
  }

  updateStoreApplication(id: string, status: 'approved' | 'rejected'): void {
    console.log(`Mağaza başvurusu güncelleniyor: ID=${id}, status=${status}`);
    
    this.adminService.updateStoreApplication(id, status).subscribe({
      next: (updatedApplication) => {
        console.log('Başvuru güncelleme yanıtı:', updatedApplication);
        
        // Başvurular listesini yeniden yükle
        this.loadStoreApplications();
        
        // Eğer onaylandıysa veya reddedildiyse, mağazaları yeniden yükle
        if (status === 'approved' || status === 'rejected') {
          console.log(`Başvuru ${status} olarak güncellendi (ID=${id}), mağaza listesi yenileniyor...`);
          this.loadStores();
        }
      },
      error: (err) => {
        console.error('Error updating store application:', err);
        this.error = 'Mağaza başvurusu güncellenirken bir hata oluştu.';
      }
    });
  }

  // Mağazayı yasakla (ban)
  banStore(storeId: number): void {
    console.log(`Mağaza yasaklanıyor: ID=${storeId}`);
    
    this.adminService.banStore(storeId).subscribe({
      next: (response) => {
        console.log('Mağaza yasaklama yanıtı:', response);
        // Mağaza listesini yeniden yükle
        this.loadStores();
      },
      error: (err) => {
        console.error('Error banning store:', err);
        this.error = 'Mağaza yasaklanırken bir hata oluştu.';
      }
    });
  }

  // Mağaza yasağını kaldır (unban)
  unbanStore(storeId: number): void {
    console.log(`Mağaza yasağı kaldırılıyor: ID=${storeId}`);
    
    this.adminService.unbanStore(storeId).subscribe({
      next: (response) => {
        console.log('Mağaza yasağı kaldırma yanıtı:', response);
        // Mağaza listesini yeniden yükle
        this.loadStores();
      },
      error: (err) => {
        console.error('Error unbanning store:', err);
        this.error = 'Mağaza yasağı kaldırılırken bir hata oluştu.';
      }
    });
  }

  // Mağazayı pasif duruma getir (inactive)
  setStoreInactive(storeId: number): void {
    console.log(`Mağaza pasif duruma getiriliyor: ID=${storeId}`);
    
    this.adminService.setStoreInactive(storeId).subscribe({
      next: (response) => {
        console.log('Mağaza pasif duruma getirme yanıtı:', response);
        // Mağaza listesini yeniden yükle
        this.loadStores();
      },
      error: (err) => {
        console.error('Error setting store inactive:', err);
        this.error = 'Mağaza pasif duruma getirilirken bir hata oluştu.';
      }
    });
  }

  // Mağazayı ve ilişkili tüm verilerini sil
  deleteStore(storeId: number): void {
    const store = this.stores.find(s => s.id === storeId);
    if (!store) return;
    
    if (confirm(`"${store.name}" mağazasını silmek istediğinizden emin misiniz? 
    \nBu işlem geri alınamaz ve mağazaya ait tüm ürünler, resimler ve ilişkili diğer veriler de kalıcı olarak silinecektir.`)) {
      console.log(`Mağaza siliniyor: ID=${storeId}, Name=${store.name}`);
      
      this.adminService.deleteStore(storeId).subscribe({
        next: (response) => {
          console.log('Mağaza silme yanıtı:', response);
          // Başarı mesajı
          this.error = null;
          // Mağaza listesini yeniden yükle
          this.loadStores();
          // Kullanıcıya bilgilendirme
          alert(`"${store.name}" mağazası ve ilişkili tüm veriler başarıyla silindi.`);
        },
        error: (err) => {
          console.error('Error deleting store:', err);
          this.error = `Mağaza silinirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`;
        }
      });
    }
  }

  // Mağaza durumunu onayla (varolan bir mağazayı onaylı yapar)
  approveStore(storeId: number): void {
    console.log(`Mağaza onaylanıyor: ID=${storeId}`);
    this.updateStoreStatus(storeId, 'approved');
  }

  // Mağaza durumunu reddet (varolan bir mağazayı reddedilmiş yapar)
  rejectStore(storeId: number): void {
    console.log(`Mağaza reddediliyor: ID=${storeId}`);
    this.updateStoreStatus(storeId, 'rejected');
  }

  // Mağaza durumunu güncelle (common method for updating status)
  updateStoreStatus(storeId: number, status: 'approved' | 'rejected' | 'inactive'): void {
    this.adminService.updateStoreStatus(storeId, status).subscribe({
      next: (response) => {
        console.log(`Mağaza durumu güncelleme yanıtı (${status}):`, response);
        this.loadStores();
      },
      error: (err) => {
        console.error(`Error updating store status to ${status}:`, err);
        this.error = `Mağaza durumu "${this.getStatusText(status)}" olarak güncellenirken bir hata oluştu.`;
      }
    });
  }

  // Belirli bir statüdeki mağazaları filtrele
  filterStoresByStatus(status: string): void {
    this.statusFilter = status;
  }

  // Filtrelenmiş mağazaları getir
  get filteredStores(): Store[] {
    if (this.statusFilter === 'all') {
      return this.stores;
    }
    return this.stores.filter(store => store.status === this.statusFilter);
  }

  // Beklemedeki başvuru sayısını döndür
  getPendingApplicationCount(): number {
    return this.storeApplications.filter(app => app.status === 'pending').length;
  }

  // Beklemedeki başvuru var mı kontrol et
  hasPendingApplications(): boolean {
    return this.getPendingApplicationCount() > 0;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Status CSS sınıfı döndür
  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'banned': return 'status-banned';
      case 'inactive': return 'status-inactive';
      default: return 'status-pending';
    }
  }

  // Status metni döndür
  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'Onaylı';
      case 'pending': return 'Beklemede';
      case 'rejected': return 'Reddedilmiş';
      case 'banned': return 'Yasaklı';
      case 'inactive': return 'Pasif';
      default: return 'Belirsiz';
    }
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
