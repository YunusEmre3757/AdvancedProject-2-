import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';


import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule } from '@angular/material/core';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ProductReviewsComponent } from './product-reviews/product-reviews.component';
import { BrandFilterComponent } from '../brand-filter/brand-filter.component';




const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'featured', component: ProductListComponent },
  { path: 'category/:categoryId', component: ProductListComponent },
  { path: 'brand/:brandId', component: ProductListComponent },
  { path: ':id', component: ProductDetailComponent }
];

@NgModule({
  declarations: [
    ProductListComponent,
    ProductDetailComponent,
    BrandFilterComponent,
    ProductReviewsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatRippleModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatCardModule
  ],
  exports: [
    ProductListComponent,
    ProductDetailComponent,
    BrandFilterComponent,
    ProductReviewsComponent
  ]
})
export class ProductModule { } 