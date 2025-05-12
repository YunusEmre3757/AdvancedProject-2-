import { Component } from '@angular/core';
import { StoreService } from '../../../services/store.service';
import { Store } from '../../../models/store.interface';

@Component({
  selector: 'app-stores-list',
  templateUrl: './stores-list.component.html',
  styleUrl: './stores-list.component.css',
  standalone: false
})
export class StoresListComponent {
  stores: Store[] = [];
  loading = true;
  error = false;

  constructor(private storeService: StoreService) { }

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.loading = true;
    this.error = false;
    
    this.storeService.getStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.loading = false;
      },
      error: (err) => {
        console.error('Mağazaları yüklerken hata oluştu:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
} 