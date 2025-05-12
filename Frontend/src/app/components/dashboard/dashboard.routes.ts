import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { TokenTestComponent } from './token-test/token-test.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'token-test',
    component: TokenTestComponent
  }
]; 