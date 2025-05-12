import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminProductsComponent } from './admin-products/admin-products.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminStoresComponent } from './admin-stores/admin-stores.component';
import { AdminPendingUsersComponent } from './admin-pending-users/admin-pending-users.component';
import { AdminAddProductComponent } from './admin-add-product/admin-add-product.component';

// Create an empty component to serve as a container
import { Component } from '@angular/core';

@Component({
  template: '<router-outlet></router-outlet>',
  standalone: false
})
export class AdminContainerComponent {}

const routes: Routes = [
  {
    path: '',
    component: AdminContainerComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'products/add', component: AdminAddProductComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'stores', component: AdminStoresComponent },
      { path: 'pending-users', component: AdminPendingUsersComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  declarations: [AdminContainerComponent]
})
export class AdminRoutingModule { }
