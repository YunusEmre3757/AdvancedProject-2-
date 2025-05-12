import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { sellerGuard } from './guards/seller.guard';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

const routes: Routes = [
    // Ana sayfalar
    {
        path: 'home',
        loadChildren: () => import('./components/home/home.module').then(m => m.HomeModule)
    },
    {
        path: 'products',
        loadChildren: () => import('./components/product/product.module').then(m => m.ProductModule)
    },
    // Token Test sayfası - doğrudan erişim için
    {
        path: 'token-test',
        loadComponent: () => import('./components/dashboard/token-test/token-test.component').then(m => m.TokenTestComponent)
    },
    // Store (Mağaza) sayfaları
    {
        path: 'stores',
        loadChildren: () => import('./components/store/store.module').then(m => m.StoreModule)
    },
    // Direct store access
    {
        path: 'store/:id',
        redirectTo: 'stores/:id/products',
        pathMatch: 'full'
    },
    // Kategori sayfaları
    {
        path: 'erkek',
        redirectTo: 'products?category=erkek',
        pathMatch: 'full'
    },
    {
        path: 'kadin',
        redirectTo: 'products?category=kadin',
        pathMatch: 'full'
    },
    {
        path: 'cocuk',
        redirectTo: 'products?category=cocuk',
        pathMatch: 'full'
    },
    {
        path: 'yeniler',
        redirectTo: 'products?category=yeniler',
        pathMatch: 'full'
    },
    {
        path: 'sporlar',
        redirectTo: 'products?category=sporlar',
        pathMatch: 'full'
    },
    {
        path: 'yeni-sezon',
        redirectTo: 'products?category=yeni-sezon',
        pathMatch: 'full'
    },
    {
        path: 'cok-satanlar',
        redirectTo: 'products?category=bestsellers',
        pathMatch: 'full'
    },
    {
        path: 'kampanyalar',
        redirectTo: 'products?category=discounted',
        pathMatch: 'full'
    },
    {
        path: 'outlet',
        redirectTo: 'products?category=outlet',
        pathMatch: 'full'
    },
    // Marka sayfaları
    {
        path: 'brand/:brandId',
        redirectTo: 'products/brand/:brandId',
        pathMatch: 'prefix'
    },
    {
        path: 'marka/:brandId',
        redirectTo: 'products/brand/:brandId',
        pathMatch: 'prefix'
    },
    // Kimlik doğrulama sayfaları
    { 
        path: 'auth',
        loadChildren: () => import('./components/auth/auth.module').then(m => m.AuthModule)
    },
    // Admin sayfası - admin yetkisi gerektirir
    {
        path: 'admin',
        loadChildren: () => import('./components/admin/admin.module').then(m => m.AdminModule),
        canActivate: [authGuard, adminGuard]
    },
    // Dashboard - role göre yönlendirme yapar
    {
        path: 'dashboard',
        canActivate: [authGuard],
        redirectTo: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'always',
        resolve: {
            roleBasedRedirect: () => {
                const authService = inject(AuthService);
                const router = inject(Router);
                const user = authService.currentUserValue;
                
                if (user && user.roles) {
                    if (user.roles.includes('ADMIN')) {
                        router.navigate(['/admin/dashboard']);
                    } else if (user.roles.includes('SELLER')) {
                        router.navigate(['/seller']);
                    } else {
                        router.navigate(['/profile']);
                    }
                } else {
                    router.navigate(['/profile']);
                }
                return true;
            }
        }
    },
    {
        path: 'seller',
        loadChildren: () => import('./components/seller/seller.module').then(m => m.SellerModule),
        canActivate: [authGuard, sellerGuard]
    },
    {
        path: 'store-dashboard',  // Store login'den sonra yönlendirmek için
        redirectTo: 'seller',
        pathMatch: 'full'
    },
    {
        path: 'profile',
        loadChildren: () => import('./components/auth/auth.module').then(m => m.AuthModule),
        canActivate: [authGuard]
    },
    {
        path: 'cart',
        loadChildren: () => import('./components/cart/cart.module').then(m => m.CartModule)
    },
    {
        path: 'checkout',
        loadChildren: () => import('./components/checkout/checkout.module').then(m => m.CheckoutModule),
        canActivate: [authGuard]
    },
    {
        path: 'favorites',
        loadChildren: () => import('./components/favorites/favorites.module').then(m => m.FavoritesModule)
    },
    {
        path: 'orders',
        loadChildren: () => import('./components/orders/orders.module').then(m => m.OrdersModule),
        canActivate: [authGuard]
    },
    {
        path: 'order-success',
        loadChildren: () => import('./components/order-success/order-success.module').then(m => m.OrderSuccessModule),
        canActivate: [authGuard]
    },
    { 
        path: 'verify-email',
        redirectTo: 'auth/verify-email',
        pathMatch: 'prefix'
    },
    // Varsayılan yönlendirmeler - bunlar en sonda olmalı
    { 
        path: '', 
        redirectTo: 'home', 
        pathMatch: 'full' 
    },
    { 
        path: '**', 
        redirectTo: 'home' 
    }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
