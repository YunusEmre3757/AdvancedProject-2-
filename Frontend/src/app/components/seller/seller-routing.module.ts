import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

// Import our implemented components
import { SellerProfileComponent } from './seller-profile/seller-profile.component';
import { SellerOrdersComponent } from './seller-orders/seller-orders.component';
import { EditProductComponent } from './edit-product/edit-product.component';
import { SellerOrderDetailComponent } from './seller-order-detail/seller-order-detail.component';
import { AddProductComponent } from './add-product/add-product.component';

// Import store componentsimport { StoreFeaturedComponent } from '../dd/d/a/a.component';import { StoreDetailComponent } from '../dd/d/d.component';// Bir "container" bileşeni oluşturuyoruz, çocuk rotaları içerecek
@Component({
  template: '<router-outlet></router-outlet>',
  standalone: false
})
export class SellerContainerComponent {} 

// These are placeholders for components that will be implemented later
export class SellerProductsComponent {}
export class SellerAnalyticsComponent {}

// Rota tanımları
const routes: Routes = [
  {
    path: '',
    component: SellerContainerComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./seller-dashboard/seller-dashboard.module').then(m => m.SellerDashboardModule) },
      { path: 'products', component: EditProductComponent },
      { path: 'products/store/:id', component: EditProductComponent },
      { path: 'products/add', component: AddProductComponent },
      { path: 'products/add/store/:storeId', component: AddProductComponent },
      { path: 'products/edit/:id', component: EditProductComponent },
      { path: 'orders', component: SellerOrdersComponent },
      { path: 'orders/store/:storeId', component: SellerOrdersComponent },
      { path: 'store/:storeId', component: SellerProfileComponent },
      { path: 'profile', component: SellerProfileComponent },
      { path: 'analytics', component: SellerAnalyticsComponent },
      { path: 'orders/store/:storeId/detail/:orderId', component: SellerOrderDetailComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SellerRoutingModule { } 