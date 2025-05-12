import { NgModule } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
/*
import { SellerDashboardComponent } from './seller-dashboard/seller-dashboard.component';
import { SellerProductsComponent } from './seller-products/seller-products.component';
import { SellerOrdersComponent } from './seller-orders/seller-orders.component';
import { SellerProfileComponent } from './seller-profile/seller-profile.component';
import { SellerAnalyticsComponent } from './seller-analytics/seller-analytics.component';
import { AddProductComponent } from './seller-products/add-product/add-product.component';
import { EditProductComponent } from './seller-products/edit-product/edit-product.component';

*/

// Import our seller components
import { SellerProfileComponent } from './seller-profile/seller-profile.component';
import { SellerOrdersComponent } from './seller-orders/seller-orders.component';
import { EditProductComponent } from './edit-product/edit-product.component';
import { SellerOrderDetailComponent } from './seller-order-detail/seller-order-detail.component';
import { AddProductComponent } from './add-product/add-product.component';
import { SellerContainerComponent, SellerRoutingModule } from './seller-routing.module';

@NgModule({
  declarations: [
   EditProductComponent,
   SellerContainerComponent,
   SellerProfileComponent,
   SellerOrdersComponent,
   SellerOrderDetailComponent,
   AddProductComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    SellerRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule
  ],
  providers: [
    DatePipe,
    DecimalPipe
  ]
})
export class SellerModule { 
 
} 
