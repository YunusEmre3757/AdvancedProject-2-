import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxStripeModule } from 'ngx-stripe';
import { CheckoutComponent } from './checkout.component';

import { MatCardModule } from '@angular/material/card';
import { authGuard } from '../../guards/auth.guard';
import { AddressService } from '../../services/address.service';


const routes: Routes = [
  { path: '', component: CheckoutComponent, canActivate: [authGuard] }
];

@NgModule({
  declarations: [
    CheckoutComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatSnackBarModule,
    MatProgressSpinnerModule,
    NgxStripeModule,
    MatCardModule,
  ],
  providers: [
    AddressService
  ],
  exports: [
    CheckoutComponent
  ]
})
export class CheckoutModule { } 