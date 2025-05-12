import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../../models/user.interface';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
  standalone: false
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;
  page = 0;
  size = 10;
  totalUsers = 0;
  searchQuery = '';
  emailToPromote: string = '';
  resultMessage: string = '';
  isSuccess: boolean = false;
  isProcessing: boolean = false;
  currentPage: number = 0;
  totalPages: number = 0;
  pageSize: number = 10;
  
  // Satıcı yapma için
  emailToSeller: string = '';
  sellerResultMessage: string = '';
  isSellerSuccess: boolean = false;
  isSellerProcessing: boolean = false;
  
  // Kullanıcı detayları için
  selectedUser: User | null = null;
  showUserDetailsModal = false;
  userDetailsLoading = false;
  
  // Durum değiştirme için
  statusUpdateProcessing = false;
  statusUpdateSuccess = false;
  statusUpdateMessage = '';

  constructor(private adminService: AdminService, 
              private authService: AuthService, 
              private router: Router) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers(this.page, this.size).subscribe({
      next: (data) => {
        console.log('Kullanıcı verileri (ham):', data);
        this.users = data.content;
        
        // Process user data
        this.processUserData(this.users);
        
        console.log('İşlenmiş kullanıcı verileri:', this.users);
        this.totalUsers = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error = 'Kullanıcı listesi yüklenirken bir hata oluştu.';
        this.loading = false;
      }
    });
  }

  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.loadUsers();
      return;
    }

    this.loading = true;
    this.adminService.searchUsers(this.searchQuery, this.page, this.size).subscribe({
      next: (data) => {
        console.log('Arama sonuçları (ham):', data);
        this.users = data.content;
        
        // Process user data
        this.processUserData(this.users);
        
        this.totalUsers = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching users:', err);
        this.error = 'Kullanıcı araması yapılırken bir hata oluştu.';
        this.loading = false;
      }
    });
  }

  // Process user data helper method
  private processUserData(users: User[]): void {
    users.forEach(user => {
      // Fix date data
      if (user.createdAt) {
        user.createdAt = this.parseDate(user.createdAt);
        console.log(`Kullanıcı ${user.email} için işlenmiş tarih:`, user.createdAt);
      }
      
      // Check and explicitly set isActive property
      if (user.isActive === undefined || user.isActive === null) {
        user.isActive = user.emailVerified !== false; // Consider active if not explicitly false
        console.log(`Kullanıcı ${user.email} için isActive durumu atandı:`, user.isActive);
      } else {
        // Enforce boolean type for isActive
        user.isActive = user.isActive === true;
      }
      
      // Ensure roles array exists
      if (!user.roles || !Array.isArray(user.roles)) {
        user.roles = [];
      }
    });
  }

  onPageChange(event: number): void {
    this.page = event;
    if (this.searchQuery.trim()) {
      this.searchUsers();
    } else {
      this.loadUsers();
    }
  }

  makeAdmin(): void {
    if (!this.emailToPromote) return;
    
    this.isProcessing = true;
    this.resultMessage = '';
    
    this.adminService.addAdminRole(this.emailToPromote).subscribe({
      next: (user) => {
        this.isProcessing = false;
        this.isSuccess = true;
        this.resultMessage = `${user.email} kullanıcısına admin yetkisi verildi!`;
        this.emailToPromote = '';
        this.loadUsers(); // Refresh list
      },
      error: (error) => {
        this.isProcessing = false;
        this.isSuccess = false;
        this.resultMessage = error.error?.message || 'Kullanıcıya admin yetkisi verilirken bir hata oluştu.';
        console.error('Admin yetkisi verme hatası:', error);
      }
    });
  }

  makeSeller(): void {
    if (!this.emailToSeller) return;
    
    this.isSellerProcessing = true;
    this.sellerResultMessage = '';
    
    this.adminService.addSellerRole(this.emailToSeller).subscribe({
      next: (user) => {
        this.isSellerProcessing = false;
        this.isSellerSuccess = true;
        this.sellerResultMessage = `${user.email} kullanıcısına satıcı yetkisi verildi!`;
        this.emailToSeller = '';
        this.loadUsers(); // Refresh list
      },
      error: (error) => {
        this.isSellerProcessing = false;
        this.isSellerSuccess = false;
        this.sellerResultMessage = error.error?.message || 'Kullanıcıya satıcı yetkisi verilirken bir hata oluştu.';
        console.error('Satıcı yetkisi verme hatası:', error);
      }
    });
  }

  addAdminRole(email: string): void {
    const userIndex = this.users.findIndex(user => user.email === email);
    // Kullanıcının mevcut aktif durumunu kaydet
    const currentActiveStatus = userIndex !== -1 ? this.users[userIndex].isActive : true;

    this.adminService.addAdminRole(email).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.email === email);
        if (index !== -1) {
          // Güncellenmiş kullanıcı nesnesini klonla
          const updatedUserCopy = {...updatedUser};
          
          // Tarih formatını düzelt
          if (updatedUserCopy.createdAt) {
            updatedUserCopy.createdAt = this.parseDate(updatedUserCopy.createdAt);
          }
          
          // API'den gelen isActive değeri undefined, null veya beklenmeyen değer ise,
          // kullanıcının mevcut aktivasyon durumunu koru
          if (updatedUserCopy.isActive === undefined || updatedUserCopy.isActive === null) {
            updatedUserCopy.isActive = currentActiveStatus;
          }

          // Rollerin doğru şekilde tanımlandığından emin ol
          if (!updatedUserCopy.roles) {
            updatedUserCopy.roles = ['ADMIN'];
          } else if (!updatedUserCopy.roles.includes('ADMIN')) {
            updatedUserCopy.roles.push('ADMIN');
          }
          
          // Güncellenmiş kullanıcı nesnesini atama
          this.users[index] = updatedUserCopy;
          
          console.log('Admin rolü eklendi, güncellenmiş kullanıcı:', updatedUserCopy);
        }
      },
      error: (err) => {
        console.error('Error adding admin role:', err);
        this.error = 'Admin rolü eklenirken bir hata oluştu.';
      }
    });
  }

  removeAdminRole(email: string): void {
    const userIndex = this.users.findIndex(user => user.email === email);
    // Kullanıcının mevcut aktif durumunu kaydet
    const currentActiveStatus = userIndex !== -1 ? this.users[userIndex].isActive : true;

    this.adminService.removeAdminRole(email).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.email === email);
        if (index !== -1) {
          // Güncellenmiş kullanıcı nesnesini klonla
          const updatedUserCopy = {...updatedUser};
          
          // Tarih formatını düzelt
          if (updatedUserCopy.createdAt) {
            updatedUserCopy.createdAt = this.parseDate(updatedUserCopy.createdAt);
          }
          
          // API'den gelen isActive değeri undefined, null veya beklenmeyen değer ise,
          // kullanıcının mevcut aktivasyon durumunu koru
          if (updatedUserCopy.isActive === undefined || updatedUserCopy.isActive === null) {
            updatedUserCopy.isActive = currentActiveStatus;
          }

          // Rollerin doğru şekilde tanımlandığından emin ol 
          if (!updatedUserCopy.roles) {
            updatedUserCopy.roles = [];
          } else {
            // Admin rolünü kaldır
            updatedUserCopy.roles = updatedUserCopy.roles.filter(role => role !== 'ADMIN');
          }
          
          // Güncellenmiş kullanıcı nesnesini atama
          this.users[index] = updatedUserCopy;
          
          console.log('Admin rolü kaldırıldı, güncellenmiş kullanıcı:', updatedUserCopy);
        }
      },
      error: (err) => {
        console.error('Error removing admin role:', err);
        this.error = 'Admin rolü kaldırılırken bir hata oluştu.';
      }
    });
  }

  addSellerRole(email: string): void {
    const userIndex = this.users.findIndex(user => user.email === email);
    // Kullanıcının mevcut aktif durumunu kaydet
    const currentActiveStatus = userIndex !== -1 ? this.users[userIndex].isActive : true;

    this.adminService.addSellerRole(email).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.email === email);
        if (index !== -1) {
          // Güncellenmiş kullanıcı nesnesini klonla
          const updatedUserCopy = {...updatedUser};
          
          // Tarih formatını düzelt
          if (updatedUserCopy.createdAt) {
            updatedUserCopy.createdAt = this.parseDate(updatedUserCopy.createdAt);
          }
          
          // API'den gelen isActive değeri undefined, null veya beklenmeyen değer ise,
          // kullanıcının mevcut aktivasyon durumunu koru
          if (updatedUserCopy.isActive === undefined || updatedUserCopy.isActive === null) {
            updatedUserCopy.isActive = currentActiveStatus;
          }

          // Rollerin doğru şekilde tanımlandığından emin ol
          if (!updatedUserCopy.roles) {
            updatedUserCopy.roles = ['SELLER'];
          } else if (!updatedUserCopy.roles.includes('SELLER')) {
            updatedUserCopy.roles.push('SELLER');
          }
          
          // Güncellenmiş kullanıcı nesnesini atama
          this.users[index] = updatedUserCopy;
          
          console.log('Satıcı rolü eklendi, güncellenmiş kullanıcı:', updatedUserCopy);
        }
      },
      error: (err) => {
        console.error('Error adding seller role:', err);
        this.error = 'Satıcı rolü eklenirken bir hata oluştu.';
      }
    });
  }

  removeSellerRole(email: string): void {
    const userIndex = this.users.findIndex(user => user.email === email);
    // Kullanıcının mevcut aktif durumunu kaydet
    const currentActiveStatus = userIndex !== -1 ? this.users[userIndex].isActive : true;

    this.adminService.removeSellerRole(email).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(user => user.email === email);
        if (index !== -1) {
          // Güncellenmiş kullanıcı nesnesini klonla
          const updatedUserCopy = {...updatedUser};
          
          // Tarih formatını düzelt
          if (updatedUserCopy.createdAt) {
            updatedUserCopy.createdAt = this.parseDate(updatedUserCopy.createdAt);
          }
          
          // API'den gelen isActive değeri undefined, null veya beklenmeyen değer ise,
          // kullanıcının mevcut aktivasyon durumunu koru
          if (updatedUserCopy.isActive === undefined || updatedUserCopy.isActive === null) {
            updatedUserCopy.isActive = currentActiveStatus;
          }

          // SELLER rolünü kaldır
          if (updatedUserCopy.roles) {
            updatedUserCopy.roles = updatedUserCopy.roles.filter(role => role !== 'SELLER');
          }
          
          // Güncellenmiş kullanıcı nesnesini atama
          this.users[index] = updatedUserCopy;
          
          console.log('Satıcı rolü kaldırıldı, güncellenmiş kullanıcı:', updatedUserCopy);
        }
      },
      error: (err) => {
        console.error('Error removing seller role:', err);
        this.error = 'Satıcı rolü kaldırılırken bir hata oluştu.';
      }
    });
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalUsers / this.size);
    const displayPages = 5; // Maximum pages to display
    
    
    let startPage = Math.max(0, this.page - Math.floor(displayPages / 2));
    const endPage = Math.min(totalPages - 1, startPage + displayPages - 1);
    
    if (endPage - startPage + 1 < displayPages) {
      startPage = Math.max(0, endPage - displayPages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    
    try {
      console.log('Tarih dönüştürülüyor, gelen veri tipi:', typeof dateValue, 'değer:', dateValue);
      
      // Date nesnesi ise doğrudan döndür
      if (dateValue instanceof Date) {
        return dateValue;
      }
      
      // Handle array format [year, month, day, hour, minute]
      if (Array.isArray(dateValue)) {
        const year = dateValue[0];
        const month = dateValue[1] - 1; // JavaScript months are 0-11
        const day = dateValue[2];
        
        let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
        if (dateValue.length > 3) hours = dateValue[3];
        if (dateValue.length > 4) minutes = dateValue[4];
        if (dateValue.length > 5) seconds = dateValue[5];
        if (dateValue.length > 6) {
          // Milisaniye değerini daha düzgün yönetmek için
          milliseconds = Math.min(999, parseInt(String(dateValue[6]).substring(0, 3)));
        }
        
        const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
        console.log('Diziden oluşturulan tarih:', date);
        
        if (!isNaN(date.getTime())) {
          return date;
        } else {
          // Alternatif yaklaşım, UTC tarih oluşturma
          const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
          console.log('UTC olarak oluşturulan tarih:', utcDate);
          return utcDate;
        }
      }
      
      // Handle string format with comma-separated values [year,month,day]
      if (typeof dateValue === 'string') {
        // Check for comma-separated values
        if (dateValue.includes(',')) {
          const dateValues = dateValue.replace(/[\[\]]/g, '').split(',').map(Number);
          if (dateValues.length >= 3) {
            const year = dateValues[0];
            const month = dateValues[1] - 1;
            const day = dateValues[2];
            
            let hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
            if (dateValues.length > 3) hours = dateValues[3];
            if (dateValues.length > 4) minutes = dateValues[4];
            if (dateValues.length > 5) seconds = dateValues[5];
            if (dateValues.length > 6) {
              // Milisaniye değerini daha düzgün yönetmek için
              milliseconds = Math.min(999, parseInt(String(dateValues[6]).substring(0, 3)));
            }
            
            const date = new Date(year, month, day, hours, minutes, seconds, milliseconds);
            console.log('Virgülle ayrılmış tarihten oluşturulan:', date);
            
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        
        // Try ISO format
        if (dateValue.includes('T') || dateValue.includes('-')) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            console.log('ISO formatından oluşturulan tarih:', date);
            return date;
          }
        }
        
        // Try parsing as a timestamp
        if (!isNaN(Number(dateValue))) {
          const timestamp = Number(dateValue);
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            console.log('String timestamp\'ten oluşturulan tarih:', date);
            return date;
          }
        }
      }
      
      // Try parsing as a timestamp for number type
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          console.log('Timestamp\'ten oluşturulan tarih:', date);
          return date;
        }
      }
      
      // Fallback for object type that might have toISOString or similar methods
      if (typeof dateValue === 'object' && dateValue !== null) {
        try {
          // Try to use toISOString if available
          if (typeof dateValue.toISOString === 'function') {
            const isoString = dateValue.toISOString();
            const date = new Date(isoString);
            if (!isNaN(date.getTime())) {
              console.log('toISOString metodu ile oluşturulan tarih:', date);
              return date;
            }
          }
          
          // Try to stringify and parse
          const dateStr = JSON.stringify(dateValue);
          const parsedDate = new Date(JSON.parse(dateStr));
          if (!isNaN(parsedDate.getTime())) {
            console.log('JSON stringify/parse ile oluşturulan tarih:', parsedDate);
            return parsedDate;
          }
        } catch (e) {
          console.warn('Nesne türü tarih dönüştürme hatası:', e);
        }
      }
      
      // Önceki yöntemler başarısız olursa, güncel tarihi döndür
      console.warn('Tarih değeri tanımlanamadı. Geçerli tarih kullanılıyor.');
      return new Date();
      
    } catch (error) {
      console.error('Tarih dönüştürme hatası:', error);
      return new Date(); // Hata durumunda geçerli tarihi kullan
    }
  }

  // Kullanıcı detaylarını görüntüle
  viewUserDetails(userId: number): void {
    this.userDetailsLoading = true;
    this.showUserDetailsModal = true;
    this.selectedUser = null;
    
    this.adminService.getUserById(userId).subscribe({
      next: (user) => {
        // Kullanıcı bilgisini düzgün bir şekilde kopyala
        this.selectedUser = {...user};
        
        // isActive özelliğini açıkça ayarla (eğer undefined ise)
        if (this.selectedUser.isActive === undefined) {
          this.selectedUser.isActive = true; // Varsayılan olarak aktif
        }
        
        // Tarih formatını düzelt
        if (user.createdAt) {
          this.selectedUser.createdAt = this.parseDate(user.createdAt);
        }
        
        this.userDetailsLoading = false;
      },
      error: (err) => {
        console.error('Error loading user details:', err);
        this.error = 'Kullanıcı detayları yüklenirken bir hata oluştu.';
        this.userDetailsLoading = false;
      }
    });
  }
  
  // Kullanıcı detay modalını kapat
  closeUserDetailsModal(): void {
    this.showUserDetailsModal = false;
    this.selectedUser = null;
  }
  
  // Kullanıcı durumunu değiştir (aktif/pasif)
  toggleUserStatus(email: string, currentStatus: boolean | undefined): void {
    // Eğer currentStatus undefined ise, false olarak varsay
    const isActive = currentStatus === undefined ? false : currentStatus;
    const newStatus = !isActive;
    
    this.statusUpdateProcessing = true;
    this.statusUpdateMessage = '';
    
    this.adminService.toggleUserStatus(email, newStatus).subscribe({
      next: (updatedUser) => {
        // Kullanıcı listesini güncelle
        const index = this.users.findIndex(user => user.email === email);
        if (index !== -1) {
          // Güncellenmiş kullanıcı bilgisini diziye at
          this.users[index] = {...updatedUser};
          
          // Tarih formatını düzelt
          if (updatedUser.createdAt) {
            this.users[index].createdAt = this.parseDate(updatedUser.createdAt);
          }
          
          // Durumu açıkça ayarla
          this.users[index].isActive = newStatus;
        }
        
        // Eğer seçili kullanıcı bu ise, o bilgiyi de güncelle
        if (this.selectedUser && this.selectedUser.email === email) {
          this.selectedUser = {...updatedUser};
          this.selectedUser.isActive = newStatus;
          
          // Tarih formatını düzelt
          if (updatedUser.createdAt) {
            this.selectedUser.createdAt = this.parseDate(updatedUser.createdAt);
          }
        }
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Kullanıcı durumu ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi.`;
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Error updating user status:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Kullanıcı durumu güncellenirken bir hata oluştu.';
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      }
    });
  }

  // Kullanıcı silme işlemini başlat
  deleteUser(userId: number): void {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    this.adminService.deleteUser(userId).subscribe({
      next: (response) => {
        console.log('Kullanıcı başarıyla silindi:', response);
        // Silme işlemi başarılı olduğunda kullanıcı listesini güncelle
        this.loadUsers();
      },
      error: (error) => {
        console.error('Kullanıcı silinirken hata oluştu:', error);
        this.error = 'Kullanıcı silinirken bir hata oluştu.';
      }
    });
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
