import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddressService } from '../../../services/address.service';
import { Il, Ilce, Mahalle } from '../../../models/address.interface';



@Component({
  selector: 'app-address-dialog',
  standalone: false,
  template: `
    <div class="address-dialog">
      <div class="dialog-header">
        <h2>Adres Ekle</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="addressForm" (ngSubmit)="onSubmit()">
        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Ad*</mat-label>
            <input matInput formControlName="firstName" placeholder="Adınızı Giriniz">
            <mat-error *ngIf="addressForm.get('firstName')?.hasError('required')">
              Ad gereklidir
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Soyad*</mat-label>
            <input matInput formControlName="lastName" placeholder="Soyadınızı Giriniz">
            <mat-error *ngIf="addressForm.get('lastName')?.hasError('required')">
              Soyad gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Telefon*</mat-label>
            <input matInput formControlName="telefon" placeholder="0(___) ___ __ __">
            <mat-error *ngIf="addressForm.get('telefon')?.hasError('required')">
              Telefon numarası gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>İl*</mat-label>
            <mat-select formControlName="il">
              <mat-option *ngFor="let il of iller" [value]="il.ilId">
                {{il.ilAdi}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="addressForm.get('il')?.hasError('required')">
              İl seçimi gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>İlçe*</mat-label>
            <mat-select formControlName="ilce">
              <mat-option *ngFor="let ilce of ilceler" [value]="ilce.ilceId">
                {{ilce.ilceAdi}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="addressForm.get('ilce')?.hasError('required')">
              İlçe seçimi gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Mahalle*</mat-label>
            <mat-select formControlName="mahalle">
              <mat-option *ngFor="let mahalle of mahalleler" [value]="mahalle.mahalleId">
                {{mahalle.mahalleAdi}}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="addressForm.get('mahalle')?.hasError('required')">
              Mahalle seçimi gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Adres*</mat-label>
            <textarea matInput formControlName="detayAdres" rows="3" 
                      placeholder="Kargonuzun size sorunsuz bir şekilde ulaşabilmesi için mahalle, cadde, sokak, bina gibi detay bilgileri eksiksiz girdiğinizden emin olun."></textarea>
            <mat-error *ngIf="addressForm.get('detayAdres')?.hasError('required')">
              Adres gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Adres Başlığı*</mat-label>
            <input matInput formControlName="adresBasligi" placeholder="Adres Başlığı Giriniz">
            <mat-error *ngIf="addressForm.get('adresBasligi')?.hasError('required')">
              Adres başlığı gereklidir
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-actions">
          <button mat-raised-button color="primary" type="submit" 
                  [disabled]="!addressForm.valid || isLoading">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .address-dialog {
      padding: 0;
      max-width: 500px;
      width: 100%;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background-color: #f8f8f8;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    form {
      padding: 24px;
    }

    .form-row {
      margin-bottom: 16px;
    }

    .form-row mat-form-field {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .form-actions button {
      min-width: 120px;
    }

    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
      }
    }
  `]
})
export class AddressDialogComponent implements OnInit {
  addressForm: FormGroup;
  isLoading = false;
  iller: Il[] = [];
  ilceler: Ilce[] = [];
  mahalleler: Mahalle[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddressDialogComponent>,
    private addressService: AddressService,
    private snackBar: MatSnackBar
  ) {
    this.addressForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      telefon: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      il: ['', Validators.required],
      ilce: [{ value: '', disabled: true }, Validators.required],
      mahalle: [{ value: '', disabled: true }, Validators.required],
      detayAdres: ['', [Validators.required, Validators.minLength(10)]],
      adresBasligi: ['', Validators.required]
    });

    // İl seçimi değiştiğinde
    this.addressForm.get('il')?.valueChanges.subscribe(ilId => {
      if (ilId) {
        this.loadIlceler(ilId);
        this.addressForm.patchValue({ ilce: '', mahalle: '' });
        this.addressForm.get('ilce')?.enable();
        this.addressForm.get('mahalle')?.enable();
      } else {
        this.addressForm.get('ilce')?.disable();
        this.addressForm.get('mahalle')?.disable();
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
    this.loadIller();
  }

  loadIller() {
    this.addressService.getAllIller().subscribe({
      next: (data) => {
        this.iller = data;
      },
      error: (error) => {
        this.snackBar.open('İller yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  loadIlceler(ilId: number) {
    this.addressService.getIlcelerByIl(ilId).subscribe({
      next: (data) => {
        this.ilceler = data;
      },
      error: (error) => {
        this.snackBar.open('İlçeler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  loadMahalleler(ilceId: number) {
    this.addressService.getMahallelerByIlce(ilceId).subscribe({
      next: (data) => {
        this.mahalleler = data;
      },
      error: (error) => {
        this.snackBar.open('Mahalleler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  onSubmit() {
    if (this.addressForm.valid) {
      this.dialogRef.close(this.addressForm.value);
    }
  }

  close() {
    this.dialogRef.close();
  }
} 