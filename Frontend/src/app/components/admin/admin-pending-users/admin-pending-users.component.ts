import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';
import { PendingUser } from '../../../models/pending-user.interface';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-pending-users',
  templateUrl: './admin-pending-users.component.html',
  styleUrls: ['./admin-pending-users.component.css'],
  standalone: false
})
export class AdminPendingUsersComponent implements OnInit {
  pendingUsers: PendingUser[] = [];
  loading = true;
  error: string | null = null;
  page = 0;
  size = 10;
  totalPendingUsers = 0;
  searchQuery = '';
  
  // Durum değiştirme için
  statusUpdateProcessing = false;
  statusUpdateSuccess = false;
  statusUpdateMessage = '';

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadPendingUsers();
  }

  loadPendingUsers(): void {
    this.loading = true;
    this.adminService.getPendingUsers(this.page, this.size).subscribe({
      next: (data) => {
        console.log('Bekleyen kullanıcı verileri (ham):', data);
        this.pendingUsers = data.content;
        this.totalPendingUsers = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading pending users:', err);
        this.error = 'Bekleyen kullanıcı listesi yüklenirken bir hata oluştu.';
        this.loading = false;
      }
    });
  }

  searchPendingUsers(): void {
    if (!this.searchQuery.trim()) {
      this.loadPendingUsers();
      return;
    }

    this.loading = true;
    this.adminService.searchPendingUsers(this.searchQuery, this.page, this.size).subscribe({
      next: (data) => {
        console.log('Arama sonuçları (ham):', data);
        this.pendingUsers = data.content;
        this.totalPendingUsers = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error searching pending users:', err);
        this.error = 'Bekleyen kullanıcı araması yapılırken bir hata oluştu.';
        this.loading = false;
      }
    });
  }

  onPageChange(event: number): void {
    this.page = event;
    if (this.searchQuery.trim()) {
      this.searchPendingUsers();
    } else {
      this.loadPendingUsers();
    }
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalPendingUsers / this.size);
    const displayPages = 5; // Maximum pages to display
    
    let startPage = Math.max(0, this.page - Math.floor(displayPages / 2));
    const endPage = Math.min(totalPages - 1, startPage + displayPages - 1);
    
    if (endPage - startPage + 1 < displayPages) {
      startPage = Math.max(0, endPage - displayPages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  // Bekleyen kullanıcıyı onayla
  approvePendingUser(id: number): void {
    this.statusUpdateProcessing = true;
    this.statusUpdateMessage = '';
    
    this.adminService.approvePendingUser(id).subscribe({
      next: (approvedUser) => {
        // Bekleyen kullanıcıları yeniden yükle
        this.loadPendingUsers();
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Kullanıcı başarıyla onaylandı.`;
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Error approving user:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Kullanıcı onaylanırken bir hata oluştu.';
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      }
    });
  }

  // Bekleyen kullanıcıyı reddet/sil
  rejectPendingUser(id: number): void {
    this.statusUpdateProcessing = true;
    this.statusUpdateMessage = '';
    
    this.adminService.deletePendingUser(id).subscribe({
      next: () => {
        // Kullanıcıyı listeden kaldır
        this.pendingUsers = this.pendingUsers.filter(user => user.id !== id);
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Bekleyen kullanıcı başarıyla silindi.`;
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Error rejecting pending user:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Kullanıcı silinirken bir hata oluştu.';
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      }
    });
  }

  // Doğrulama e-postasını yeniden gönder
  resendVerificationEmail(id: number, email: string): void {
    this.statusUpdateProcessing = true;
    this.statusUpdateMessage = '';
    
    this.adminService.resendVerificationEmail(id).subscribe({
      next: () => {
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Doğrulama e-postası ${email} adresine yeniden gönderildi.`;
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Error resending verification email:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Doğrulama e-postası gönderilirken bir hata oluştu.';
        
        // Mesajı 3 saniye sonra temizle
        setTimeout(() => {
          this.statusUpdateMessage = '';
        }, 3000);
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
