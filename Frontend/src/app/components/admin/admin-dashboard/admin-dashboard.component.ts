import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { AdminService, DashboardStats, StoreApplication } from '../../../services/admin.service';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';

interface ActivityItem {
  type: string;
  icon: string;
  message: string;
  time: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false,
  providers: [DatePipe]
})
export class AdminDashboardComponent implements OnInit {
  currentRoute: string = 'dashboard';
  
  // Dashboard statistics
  stats: DashboardStats = {
    totalUsers: 0,
    newUsers: 0,
    orders: 0,
    ordersPercentage: 0,
    stores: 0,
    newStores: 0,
    products: 0,
    newProducts: 0
  };
  
  // Recent activities
  recentActivities: ActivityItem[] = [
    {
      type: 'user',
      icon: 'fas fa-user-plus',
      message: 'Yeni kullanıcı kaydoldu: Ahmet Yılmaz',
      time: '5 dakika önce'
    },
    {
      type: 'order',
      icon: 'fas fa-shopping-cart',
      message: 'Yeni sipariş: #ORD78945 - ₺1,250.00',
      time: '1 saat önce'
    },
    {
      type: 'store',
      icon: 'fas fa-store',
      message: 'Mağaza başvurusu: TechWorld',
      time: '3 saat önce'
    },
    {
      type: 'product',
      icon: 'fas fa-box',
      message: 'Yeni ürün eklendi: iPhone 15 Pro',
      time: '5 saat önce'
    },
    {
      type: 'update',
      icon: 'fas fa-sync',
      message: 'Sistem güncellemesi tamamlandı',
      time: '1 gün önce'
    }
  ];
  
  // Store applications
  storeApplications: StoreApplication[] = [];
  pendingApplications: StoreApplication[] = [];

  constructor(
    private router: Router,
    private adminService: AdminService,
    private storeService: StoreService,
    private datePipe: DatePipe,
    private authService: AuthService
  ) {
    // Track current route for conditional rendering
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      if (url.includes('/dashboard')) {
        this.currentRoute = 'dashboard';
      } else if (url.includes('/products')) {
        this.currentRoute = 'products';
      } else if (url.includes('/orders')) {
        this.currentRoute = 'orders';
      } else if (url.includes('/users')) {
        this.currentRoute = 'users';
      } else if (url.includes('/stores')) {
        this.currentRoute = 'stores';
      } else {
        this.currentRoute = '';
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  // Check if a specific route is active
  isActive(route: string): boolean {
    return this.currentRoute === route;
  }
  
  // Check if we should show the dashboard content (only on main admin page or dashboard route)
  shouldShowDashboard(): boolean {
    return this.router.url === '/admin' || this.router.url === '/admin/dashboard';
  }

  // Format a date safely, handling potential errors
  formatDate(date: any): string {
    if (!date) return 'Tarih bilgisi yok';
    
    try {
      // Try to create a valid date object if it's not already one
      let dateObj: Date;
      
      if (Array.isArray(date)) {
        // Dizi formatındaki tarihi işle
        const dateParts = date as number[];
        if (dateParts.length < 3) {
          return 'Geçersiz tarih formatı';
        }
        
        const year = dateParts[0];
        const month = dateParts[1] - 1;
        const day = dateParts[2];
        
        let hour = 0, minute = 0, second = 0, millisecond = 0;
        if (dateParts.length > 3) hour = dateParts[3];
        if (dateParts.length > 4) minute = dateParts[4];
        if (dateParts.length > 5) second = dateParts[5];
        if (dateParts.length > 6) millisecond = dateParts[6];
        
        dateObj = new Date(year, month, day, hour, minute, second, millisecond);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Geçersiz tarih';
      }
      
      // Use DatePipe to format the date
      const formattedDate = this.datePipe.transform(dateObj, 'dd.MM.yyyy HH:mm');
      return formattedDate || 'Tarih biçimlendirilemedi';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Tarih hatası';
    }
  }

  loadDashboardData(): void {
    // Load dashboard statistics
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
      }
    });
    
    // Sadece pending store başvurularını getir
    this.adminService.getStoreApplications().subscribe({
      next: (applications) => {
        console.log('Admin dashboard için tüm başvurular yüklendi:', applications);
        
        // Başvuru durumu kontrolü ve tarih düzeltmesi
        applications.forEach(app => {
          // Tarih düzeltmesi
          if (app.date === null) {
            console.warn(`"${app.name}" mağazası için tarih bilgisi yok`);
          } else if (Array.isArray(app.date)) {
            console.log(`"${app.name}" mağazası için tarih dizi formatında:`, app.date);
            
            try {
              const dateParts = app.date as any;
              if (dateParts.length >= 3) {
                const year = dateParts[0];
                const month = dateParts[1] - 1;
                const day = dateParts[2];
                
                let hour = 0, minute = 0, second = 0, millisecond = 0;
                if (dateParts.length > 3) hour = dateParts[3];
                if (dateParts.length > 4) minute = dateParts[4];
                if (dateParts.length > 5) second = dateParts[5];
                if (dateParts.length > 6) millisecond = dateParts[6];
                
                app.date = new Date(year, month, day, hour, minute, second, millisecond);
                console.log(`"${app.name}" mağazası için düzeltilmiş tarih:`, app.date);
              }
            } catch (err) {
              console.error(`"${app.name}" mağazası için tarih dönüşüm hatası:`, err);
              app.date = null;
            }
          } else if (typeof app.date === 'string') {
            console.log(`"${app.name}" mağazası için tarih string formatında:`, app.date);
            
            try {
              if (app.date.includes(',')) {
                console.log('Virgülle ayrılmış tarih tespit edildi');
              } else if (app.date.includes('T')) {
                console.log('ISO formatında tarih tespit edildi');
              }
            } catch (err) {
              console.error('Başvuru tarih dönüşüm hatası:', err);
            }
          }
        });
        
        // Pending durumundaki başvuruları filtrele
        const pendingApplications = applications.filter(app => app.status === 'pending');
        console.log('Filtered pending applications:', pendingApplications);
        
        // Bekleyen başvuruları sakla
        this.storeApplications = pendingApplications;
        // En fazla 3 başvuru göster
        this.pendingApplications = pendingApplications.slice(0, 3);
          
        console.log('Bekleyen mağaza başvuruları (max 3):', this.pendingApplications);
      },
      error: (error) => {
        console.error('Error loading store applications:', error);
      }
    });
  }
  
  // Approve a store application
  approveStoreApplication(id: string): void {
    this.adminService.updateStoreApplication(id, 'approved').subscribe({
      next: () => {
        // Refresh applications after approval
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error approving store application:', error);
      }
    });
  }
  
  // Reject a store application
  rejectStoreApplication(id: string): void {
    this.adminService.updateStoreApplication(id, 'rejected').subscribe({
      next: () => {
        // Refresh applications after rejection
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error rejecting store application:', error);
      }
    });
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  // Get only pending store applications
  getPendingStoreApplications(): StoreApplication[] {
    // pendingApplications zaten doğrudan getPendingStoreApplications() çağrısıyla
    // doldurulduğu için, burada sadece döndürüyoruz
    return this.pendingApplications;
  }
  
  // Check if there are any pending applications
  hasPendingStoreApplications(): boolean {
    return this.pendingApplications.length > 0;
  }
}
