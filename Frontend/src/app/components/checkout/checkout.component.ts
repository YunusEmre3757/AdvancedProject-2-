import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { AddressService } from '../../services/address.service';
import { PaymentService } from '../../services/payment.service';
import { User } from '../../models/user.interface';
import { Adres } from '../../models/address.interface';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { StripeService, StripeCardComponent } from 'ngx-stripe';
import { StripeCardElementOptions, StripeElementsOptions } from '@stripe/stripe-js';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
  standalone: false
})
export class CheckoutComponent implements OnInit {
  @ViewChild(StripeCardComponent) card!: StripeCardComponent;
  
  checkoutForm: FormGroup;
  cartItems: any[] = [];
  cartTotal = 0;
  processing = false;
  currentUser: User | null = null;
  userAddresses: Adres[] = [];
  loadingAddresses = false;
  selectedAddress: Adres | null = null;
  showAddressForm = true;
  
  // Adres formu için gerekli değişkenler
  iller: any[] = [];
  ilceler: any[] = [];
  mahalleler: any[] = [];
  
  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0'
        }
      }
    }
  };

  elementsOptions: StripeElementsOptions = {
    locale: 'tr'
  };
  
  paymentMethods = [
    { id: 'credit_card', name: 'Kredi Kartı' },
    { id: 'debit_card', name: 'Banka Kartı' },
    { id: 'bank_transfer', name: 'Havale/EFT' }
  ];

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private addressService: AddressService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private stripeService: StripeService,
    private paymentService: PaymentService
  ) {
    this.checkoutForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      // Adres formu için yeni kontroller
      addressTitle: ['', Validators.required],
      il: ['', Validators.required],
      ilce: ['', Validators.required],
      mahalle: ['', Validators.required],
      detayAdres: ['', [Validators.required, Validators.minLength(10)]],
      saveAddress: [true],
      paymentMethod: ['credit_card', Validators.required],
      savePaymentInfo: [false]
    });
    
    // İl değiştiğinde ilçeleri yükle
    this.checkoutForm.get('il')?.valueChanges.subscribe(ilId => {
      if (ilId) {
        this.loadIlceler(ilId);
        this.checkoutForm.patchValue({ ilce: '', mahalle: '' });
      }
    });

    // İlçe değiştiğinde mahalleleri yükle
    this.checkoutForm.get('ilce')?.valueChanges.subscribe(ilceId => {
      if (ilceId) {
        this.loadMahalleler(ilceId);
        this.checkoutForm.patchValue({ mahalle: '' });
      }
    });
  }

  ngOnInit(): void {
    this.loadCartItems();
    this.loadUserProfile();
    this.loadUserAddresses();
    this.loadIller(); // İlleri yükle
  }

  loadCartItems(): void {
    this.cartService.getCartItems().subscribe(items => {
      this.cartItems = items;
    });

    this.cartService.getCartTotal().subscribe(total => {
      this.cartTotal = total;
    });
  }

  loadUserProfile(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.checkoutForm.patchValue({
          fullName: `${user.name} ${user.surname}`,
          email: user.email,
          phone: user.phoneNumber || ''
        });
      }
    });
  }

  loadUserAddresses(): void {
    this.loadingAddresses = true;
    
    this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          console.log('Kullanıcı bulunamadı, adresler yüklenemedi');
          return of([]);
        }
        console.log('Adresler yüklenmeye başlanıyor, kullanıcı ID:', user.id);
        return this.addressService.getUserAdresleri(user.id);
      })
    ).subscribe({
      next: (addresses) => {
        console.log('Adresler başarıyla yüklendi', addresses);
        this.userAddresses = addresses;
        this.loadingAddresses = false;
        
        // Varsayılan adresi varsa seç
        const defaultAddress = addresses.find(addr => addr.varsayilanMi);
        if (defaultAddress) {
          this.selectAddress(defaultAddress);
        }
      },
      error: (error) => {
        console.error('Adresler yüklenirken hata:', error);
        this.loadingAddresses = false;
        this.snackBar.open('Adresleriniz yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      },
      complete: () => {
        this.loadingAddresses = false;
      }
    });
  }

  selectAddress(address: Adres): void {
    this.selectedAddress = address;
    this.showAddressForm = false;
    
    // Adres bilgilerini forma doldur
    this.checkoutForm.patchValue({
      fullName: this.currentUser ? `${this.currentUser.name} ${this.currentUser.surname}` : '',
      phone: address.telefon,
      // Eski alanlar yerine yeni alanları kullan
      addressTitle: address.adresBasligi,
      detayAdres: address.detayAdres,
      il: address.il.ilId,
      ilce: address.ilce.ilceId,
      mahalle: address.mahalle.mahalleId
    });
  }

  toggleAddressForm(): void {
    this.showAddressForm = !this.showAddressForm;
    if (this.showAddressForm) {
      this.selectedAddress = null;
      // Form alanlarını temizle
      this.checkoutForm.patchValue({
        addressTitle: '',
        detayAdres: '',
        il: '',
        ilce: '',
        mahalle: ''
      });
    }
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);
      return;
    }

    this.processing = true;
    
    // Adres bilgisini formatla
    let shippingAddress = '';
    
    if (this.selectedAddress) {
      // Seçili kayıtlı adres
      shippingAddress = `${this.checkoutForm.value.fullName}, ${this.selectedAddress.adresBasligi}, ${this.selectedAddress.detayAdres}, ${this.selectedAddress.mahalle.mahalleAdi}, ${this.selectedAddress.ilce.ilceAdi}, ${this.selectedAddress.il.ilAdi}, Tel: ${this.selectedAddress.telefon}`;
    } else {
      // Form'dan girilen adres
      const formValues = this.checkoutForm.value;
      
      // Yeni adres kaydetme işlemi
      if (formValues.saveAddress) {
        this.saveNewAddress();
      }
      
      // İl, ilçe ve mahalle adlarını çek
      const il = this.iller.find(il => il.ilId === formValues.il)?.ilAdi || '';
      const ilce = this.ilceler.find(ilce => ilce.ilceId === formValues.ilce)?.ilceAdi || '';
      const mahalle = this.mahalleler.find(mahalle => mahalle.mahalleId === formValues.mahalle)?.mahalleAdi || '';
      
      shippingAddress = `${formValues.fullName}, ${formValues.addressTitle}, ${formValues.detayAdres}, ${mahalle}, ${ilce}, ${il}, Tel: ${formValues.phone}`;
    }

    if (this.checkoutForm.value.paymentMethod === 'credit_card' || this.checkoutForm.value.paymentMethod === 'debit_card') {
      // Stripe ile ödeme
      this.createPaymentMethod(shippingAddress);
    } else {
      // Banka havalesi gibi diğer ödeme yöntemleri
      this.completeCheckout(shippingAddress, 'bank_transfer');
    }
  }

  createPaymentMethod(shippingAddress: string): void {
    // Önce ödeme niyeti (payment intent) oluştur
    const paymentRequest = {
      amount: this.cartTotal * 100, // Kuruş cinsinden
      currency: 'try',
      description: `Sipariş - ${this.currentUser?.name || 'Misafir'}`,
    };

    this.paymentService.createPaymentIntent(paymentRequest)
      .pipe(
        switchMap(paymentIntent => {
          // Payment intent oluşturulduktan sonra ödeme yöntemini oluştur
          return this.stripeService.createPaymentMethod({
            type: 'card',
            card: this.card.element,
            billing_details: {
              name: this.checkoutForm.value.fullName,
              email: this.checkoutForm.value.email,
              phone: this.checkoutForm.value.phone,
              address: {
                line1: this.checkoutForm.value.address,
                city: this.checkoutForm.value.city,
                postal_code: this.checkoutForm.value.postalCode,
                country: 'TR'
              }
            }
          }).pipe(
            // Payment method oluşturulduktan sonra ödemeyi doğrula
            switchMap(result => {
              if (result.paymentMethod) {
                const confirmRequest = {
                  paymentIntentId: paymentIntent.id,
                  paymentMethodId: result.paymentMethod.id
                };
                
                return this.paymentService.confirmPayment(confirmRequest).pipe(
                  switchMap(_ => {
                    // Ödeme başarılı olduktan sonra siparişi tamamla
                    return of({
                      success: true,
                      paymentIntentId: paymentIntent.id
                    });
                  })
                );
              } else {
                return of({
                  success: false,
                  error: result.error
                });
              }
            })
          );
        })
      )
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.completeCheckout(shippingAddress, 'stripe', result.paymentIntentId);
          } else {
            this.processing = false;
            this.snackBar.open(`Ödeme hatası: ${result.error?.message || 'Bilinmeyen hata'}`, 'Tamam', {
              duration: 5000
            });
          }
        },
        error: (error) => {
          this.processing = false;
          console.error('Ödeme hatası:', error);
          this.snackBar.open('Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'Tamam', {
            duration: 5000
          });
        }
      });
  }

  completeCheckout(shippingAddress: string, paymentType: string, paymentIntentId?: string): void {
    setTimeout(() => {
      this.cartService.checkout(shippingAddress, paymentIntentId, paymentType)
        .pipe(
          finalize(() => {
            this.processing = false;
          })
        )
        .subscribe({
          next: (order) => {
            this.snackBar.open('Siparişiniz başarıyla oluşturuldu!', 'Tamam', {
              duration: 3000
            });
            this.router.navigate(['/order-success', order.id]);
          },
          error: (error) => {
            console.error('Checkout error:', error);
            this.snackBar.open('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.', 'Tamam', {
              duration: 5000
            });
          }
        });
    }, 1500); // Ödeme işlemini simüle etmek için gecikme
  }

  getFormattedPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  }

  // Tüm form alanlarını dokunulmuş olarak işaretle
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  // Ödeme yöntemi değiştiğinde form validasyonlarını güncelle
  onPaymentMethodChange(method: string): void {
    const cardControls = ['cardName', 'cardNumber', 'cardExpiry', 'cardCvc'];
    
    if (method === 'credit_card' || method === 'debit_card') {
      cardControls.forEach(control => {
        this.checkoutForm.get(control)?.setValidators([Validators.required]);
      });
    } else {
      cardControls.forEach(control => {
        this.checkoutForm.get(control)?.clearValidators();
        this.checkoutForm.get(control)?.updateValueAndValidity();
      });
    }
  }
  
  // Adres kartı için kısaltılmış adres bilgisi
  getShortAddressText(address: Adres): string {
    return `${address.il.ilAdi}, ${address.ilce.ilceAdi}`;
  }

  get f() { return this.checkoutForm.controls; }

  // İl listesini yükleme
  loadIller(): void {
    this.addressService.getAllIller().subscribe({
      next: (data) => {
        this.iller = data;
      },
      error: (error) => {
        console.error('İller yüklenirken hata:', error);
        this.snackBar.open('İller yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // İlçe listesini yükleme
  loadIlceler(ilId: number): void {
    this.addressService.getIlcelerByIl(ilId).subscribe({
      next: (data) => {
        this.ilceler = data;
      },
      error: (error) => {
        console.error('İlçeler yüklenirken hata:', error);
        this.snackBar.open('İlçeler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // Mahalle listesini yükleme
  loadMahalleler(ilceId: number): void {
    this.addressService.getMahallelerByIlce(ilceId).subscribe({
      next: (data) => {
        this.mahalleler = data;
      },
      error: (error) => {
        console.error('Mahalleler yüklenirken hata:', error);
        this.snackBar.open('Mahalleler yüklenirken bir hata oluştu', 'Tamam', {
          duration: 3000
        });
      }
    });
  }

  // Yeni adresi kaydetme
  saveNewAddress(): void {
    if (this.checkoutForm.get('saveAddress')?.value && this.currentUser) {
      const formData = this.checkoutForm.value;
      
      const adresRequest = {
        adresBasligi: formData.addressTitle,
        telefon: formData.phone,
        ilId: formData.il,
        ilceId: formData.ilce,
        mahalleId: formData.mahalle,
        detayAdres: formData.detayAdres
      };

      this.addressService.addAdres(this.currentUser.id, adresRequest).subscribe({
        next: (response) => {
          this.snackBar.open('Adres başarıyla kaydedildi', 'Tamam', {
            duration: 3000
          });
          // Adres listesini güncelle
          this.loadUserAddresses();
        },
        error: (error) => {
          console.error('Adres kaydedilirken hata:', error);
          this.snackBar.open('Adres kaydedilirken bir hata oluştu', 'Tamam', {
            duration: 3000
          });
        }
      });
    }
  }
} 