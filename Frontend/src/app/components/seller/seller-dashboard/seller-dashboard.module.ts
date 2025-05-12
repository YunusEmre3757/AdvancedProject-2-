import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SellerDashboardComponent } from './seller-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: SellerDashboardComponent
  }
];

@NgModule({
  declarations: [
    SellerDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class SellerDashboardModule { } 