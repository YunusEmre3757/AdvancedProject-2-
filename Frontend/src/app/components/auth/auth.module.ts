import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { StoreApplicationComponent } from './store-application/store-application.component';
import { StoreLoginComponent } from './store-login/store-login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
export const AUTH_ROUTES: Routes = [
 {
   path: 'login',
   component: LoginComponent
 },
 {
   path: 'register',
   component: RegisterComponent
 },
 {
   path: 'forgot-password',
   component: ForgotPasswordComponent
 },
 {
   path: 'verify-email',
   component: VerifyEmailComponent
 },
 {
   path: 'store-application',
   component: StoreApplicationComponent
 },
 {
   path: 'store-login',
   component: StoreLoginComponent
 },
 {
   path: '',
   redirectTo: 'login',
   pathMatch: 'full'
 }
]; 

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    VerifyEmailComponent,
    StoreApplicationComponent,
    StoreLoginComponent,
    ForgotPasswordComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(AUTH_ROUTES),
    // Material Modules
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatListModule,
    MatOptionModule,
    MatCheckboxModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class AuthModule { } 