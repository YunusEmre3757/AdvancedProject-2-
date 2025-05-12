import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const sellerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUserValue;
  
  if (currentUser && currentUser.roles?.includes('SELLER')) {
    return true;
  }
  
  // Kullanıcı seller rolüne sahip değilse ana sayfaya yönlendir
  console.log('Kullanıcının SELLER rolü yok, erişim reddedildi');
  router.navigate(['/']);
  
  return false;
}; 