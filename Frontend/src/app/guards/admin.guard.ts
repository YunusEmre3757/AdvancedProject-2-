import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // User var mı ve admin rolünde mi kontrol et
      const isAdmin = user && user.roles && user.roles.includes('ADMIN');
      
      if (isAdmin) {
        return true;
      }
      
      // Eğer admin değilse anasayfaya yönlendir
      console.log('Yönetici erişimi reddedildi. Admin yetkisi gerekiyor.');
      router.navigate(['/home']);
      return false;
    })
  );
};
