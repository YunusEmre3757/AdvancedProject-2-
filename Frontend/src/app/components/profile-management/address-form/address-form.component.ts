import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { AddressService } from '../../../services/address.service';
import { AdresRequest, Il, Ilce, Mahalle } from '../../../models/address.interface';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-address-form',
  templateUrl: './address-form.component.html',
  styleUrls: ['./address-form.component.css'],
  standalone: false
})
export class AddressFormComponent implements OnInit {
  @Output() addressAdded = new EventEmitter<void>();
  
  addressForm: FormGroup;
  isLoading = false;
  iller: Il[] = [];
  ilceler: Ilce[] = [];
  mahalleler: Mahalle[] = [];

  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.addressForm = this.fb.group({
      adresBasligi: ['', Validators.required],
      telefon: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      il: ['', Validators.required],
      ilce: ['', Validators.required],
      mahalle: ['', Validators.required],
      detayAdres: ['', [Validators.required, Validators.minLength(10)]]
    });

    // İl seçimi değiştiğinde
    this.addressForm.get('il')?.valueChanges.subscribe(ilId => {
      if (ilId) {
        this.loadIlceler(ilId);
        this.addressForm.patchValue({ ilce: '', mahalle: '' });
      }
    });

    // İlçe seçimi değiştiğinde
    this.addressForm.get('ilce')?.valueChanges.subscribe(ilceId => {
      if (ilceId) {
        this.loadMahalleler(ilceId);
        this.addressForm.patchValue({ mahalle: '' });
      }
    });
  }

  ngOnInit() {
    console.log('AddressFormComponent initialized');
    this.loadIller();
  }

  loadIller() {
    console.log('Loading iller...');
    this.addressService.getAllIller().subscribe({
      next: (data) => {
        console.log('Loaded iller:', data);
        this.iller = data;
      },
      error: (error) => {
        console.error('Error loading iller:', error);
        this.snackBar.open('İller yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  loadIlceler(ilId: number) {
    console.log('Loading ilceler for il:', ilId);
    this.addressService.getIlcelerByIl(ilId).subscribe({
      next: (data) => {
        console.log('Raw ilceler response:', data);
        console.log('Response type:', typeof data);
        if (Array.isArray(data)) {
          console.log('Number of ilceler:', data.length);
          if (data.length > 0) {
            console.log('First ilce structure:', data[0]);
          }
        }
        this.ilceler = data;
      },
      error: (error) => {
        console.error('Error loading ilceler:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.snackBar.open('İlçeler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  loadMahalleler(ilceId: number) {
    console.log('Loading mahalleler for ilceId:', ilceId);
    this.addressService.getMahallelerByIlce(ilceId).subscribe({
      next: (response) => {
        this.mahalleler = response;
        console.log('Mahalleler loaded:', this.mahalleler);
        if (response && response.length > 0) {
          console.log('İlk mahalle örneği:', response[0]);
          console.log('Toplam mahalle sayısı:', response.length);
        } else {
          console.log('Mahalle bulunamadı');
        }
      },
      error: (error) => {
        console.error('Mahalle yükleme hatası:', error);
        console.error('Hata detayları:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.snackBar.open('Mahalleler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  onSubmit() {
    if (this.addressForm.valid) {
      this.isLoading = true;
      const formData = this.addressForm.value;
      
      const adresRequest: AdresRequest = {
        adresBasligi: formData.adresBasligi,
        telefon: formData.telefon,
        ilId: formData.il,
        ilceId: formData.ilce,
        mahalleId: formData.mahalle,
        detayAdres: formData.detayAdres
      };

      this.authService.currentUser$.pipe(
        take(1),
        switchMap(user => {
          if (!user) {
            throw new Error('Kullanıcı bulunamadı');
          }
          return this.addressService.addAdres(user.id, adresRequest);
        }),
        catchError(error => {
          console.error('Adres ekleme hatası:', error);
          this.snackBar.open(
            error.message === 'Kullanıcı bulunamadı' 
              ? 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.' 
              : 'Adres kaydedilirken bir hata oluştu',
            'Tamam',
            { duration: 3000, panelClass: ['error-snackbar'] }
          );
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response) {
            this.snackBar.open('Adres başarıyla kaydedildi', 'Tamam', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            
            // Reset form and state
            this.resetForm();
            
            // Emit event after successful submission
            this.addressAdded.emit();
            
            // Reset form controls to initial state
            setTimeout(() => {
              this.loadIller();
              this.addressForm.markAsPristine();
              this.addressForm.markAsUntouched();
              
              // Reset all form controls
              Object.keys(this.addressForm.controls).forEach(key => {
                const control = this.addressForm.get(key);
                control?.setErrors(null);
                control?.updateValueAndValidity();
              });
            });
          }
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  resetForm() {
    // Reset form values
    this.addressForm.reset();
    
    // Clear dependent dropdowns
    this.ilceler = [];
    this.mahalleler = [];
    
    // Reset validation states
    Object.keys(this.addressForm.controls).forEach(key => {
      const control = this.addressForm.get(key);
      control?.setErrors(null);
      control?.updateValueAndValidity();
    });
    
    // Mark form as pristine and untouched
    this.addressForm.markAsPristine();
    this.addressForm.markAsUntouched();
  }
} 