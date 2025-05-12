import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { Subscription } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';

import { AddressDialogComponent } from '../address-form/address-dialog.component';
import { UpdateProfileRequest, User } from '../../../models/user.interface';
import { AuthService } from '../../../services/auth.service';
import { AddressService } from '../../../services/address.service';
import { StoreService } from '../../../services/store.service';
import { AccountSettingsComponent } from '../account-settings/account-settings.component';
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: false
})
export class ProfileComponent implements OnInit, OnDestroy {
  private userSubscription: Subscription | null = null;
  profileForm: FormGroup;
  addressForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  showAddressForm = false;
  addresses: any[] = [];
  userAvatar: string | null = null;
  activeSection: 'personal' | 'addresses' | 'orders' | 'preferences' | 'applications' = 'personal';
  isEditing = false;
  isEditingLoginDetails = false;
  verificationCode = '';
  isWaitingForVerification = false;
  verificationCodeArray: string[] = ['', '', '', '', '', '']; // 6 haneli kod için array
  isEditingEmail = false;
  newEmail = '';
  isVerifyingCurrentEmail = false;
  isVerifyingNewEmail = false;
  verificationStep: 'none' | 'current' | 'new' = 'none';
  storeApplications: any[] = []; // Mağaza başvurularını tutacak array

  // Onaylanmış başvurunun olup olmadığını kontrol eden accessor
  get hasApprovedApplication(): boolean {
    return this.storeApplications.some(app => app.status === 'approved');
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private addressService: AddressService,
    private storeService: StoreService,
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [this.phoneNumberValidator]],
      currentPassword: [''],
      newPassword: ['', [
        // Password validators will be applied conditionally when the field is used
      ]],
      confirmPassword: ['']
    }, { 
      validators: this.passwordMatchValidator
    });

    this.addressForm = this.fb.group({
      title: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      district: ['', Validators.required],
      postalCode: ['', Validators.required],
      isDefault: [false]
    });
  }

  ngOnInit() {
    // Sayfa yüklenirken tüm loading durumlarını temizle
    console.log('Profile: Reset all loading states on init');
    
    // Load user data first
    this.loadUserData();

    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Load user addresses
        this.isLoading = true;
        this.addressService.getUserAdresleri(user.id).subscribe({
          next: (addresses) => {
            this.addresses = addresses;
            this.isLoading = false;
          },
          error: (error: any) => {
            console.error('Error loading addresses:', error);
            this.isLoading = false;
            this.snackBar.open('Adresler yüklenirken bir hata oluştu', 'Tamam', {
              duration: 3000
            });
          }
        });

        // Set form values
        this.profileForm.patchValue({
          name: user.name,
          surname: user.surname,
          email: user.email,
          phoneNumber: user.phoneNumber,
          gender: user.gender
        });
      }
    });

    // Telefon numarası formatlaması için değişiklikleri dinle
    this.profileForm.get('phoneNumber')?.valueChanges.subscribe(value => {
      if (value) {
        // Input'u işle ve formatla, boşlukları kaldır
        const cleaned = value.replace(/\D/g, '');
        
        // Formatlanmış telefon numarasını oluştur
        let formatted = '';
        
        if (cleaned.length > 0) {
          // İlk karakter 0 değilse, ekle
          if (cleaned.charAt(0) !== '0') {
            formatted = '0';
          }
          
          // Numarayı grupla: 0XXX XXX XX XX
          for (let i = 0; i < cleaned.length; i++) {
            if (i === 0 && cleaned.charAt(0) === '0') {
              formatted += cleaned.charAt(i);
            } else if (i === 1 && formatted.length === 1) {
              formatted += cleaned.charAt(i);
            } else if (i === 4) {
              formatted += ' ' + cleaned.charAt(i);
            } else if (i === 7) {
              formatted += ' ' + cleaned.charAt(i);
            } else if (i === 9) {
              formatted += ' ' + cleaned.charAt(i);
            } else {
              formatted += cleaned.charAt(i);
            }
          }
        }
        
        // Input değerini güncelle (patch yaparak sonsuz döngüyü engelle)
        if (formatted !== value) {
          this.profileForm.get('phoneNumber')?.setValue(formatted, { emitEvent: false });
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Snackbar mesajlarını kontrol eden metod
  private showSnackBarMessage(message: string, action: string = 'Kapat', duration: number = 3000) {
    // Email doğrulama sırasında bazı mesajları gösterme
    if (this.isWaitingForVerification && message === 'Profil başarıyla güncellendi') {
      return;
    }
    
    this.snackBar.open(message, action, { duration });
  }

  loadUserData(forceRefresh: boolean = false) {
    console.log('loadUserData başlatıldı, forceRefresh:', forceRefresh);
    this.isLoading = true;
    
    this.authService.currentUser$.subscribe({
      next: (userData) => {
        console.log('Kullanıcı verileri alındı:', userData);
        this.updateUserDataAndForm(userData);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
        this.isLoading = false;
      }
    });
  }

  private updateUserDataAndForm(userData: any) {
    try {
      // Extract user data properly
      const user = userData?.user || userData;
      if (!user) {
        console.log('No user data provided, skipping update');
        this.isLoading = false;
        return;
      }

      // Compare only relevant form fields for change detection
      const currentFormValues = {
        name: this.profileForm.get('name')?.value || '',
        surname: this.profileForm.get('surname')?.value || '',
        email: this.profileForm.get('email')?.value || '',
        phoneNumber: this.profileForm.get('phoneNumber')?.value || ''
      };

      const newFormValues = {
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      };

      const formValuesChanged = JSON.stringify(currentFormValues) !== JSON.stringify(newFormValues);
      const userDataChanged = !this.currentUser || JSON.stringify(this.currentUser) !== JSON.stringify(user);

      if (userDataChanged) {
        console.log('Updating user data:', user);
        this.currentUser = user;
        this.addresses = user.addresses || [];
      }

      if (formValuesChanged) {
        console.log('Updating form with new values:', newFormValues);
        this.profileForm.patchValue(newFormValues, { emitEvent: false });
      }

      this.isLoading = false;
    } catch (error) {
      console.error('updateUserDataAndForm içinde hata:', error);
      this.isLoading = false;
    }
  }

  toggleEdit() {
    if (this.isEditing) {
      // Eğer düzenleme modundaysak ve form değişmişse
      if (this.profileForm.dirty) {
        this.onSubmit();
      }
    }
    this.isEditing = !this.isEditing;
  }

  onSubmit() {
    if (this.profileForm.valid && this.currentUser) {
      this.isLoading = true;
      const updateData: UpdateProfileRequest = {
        name: this.profileForm.value.name,
        surname: this.profileForm.value.surname,
        email: this.profileForm.value.email,
        phoneNumber: this.profileForm.value.phoneNumber?.replace(/\s/g, '') || null,
        gender: this.currentUser.gender || undefined,
        addresses: this.currentUser.addresses
      };

      console.log('Profile update data:', updateData);
      console.log('Current token:', this.authService.getAccessToken());

      this.authService.updateProfile(updateData).subscribe({
        next: (updatedUser: User) => {
          // Update the current user data immediately
          this.currentUser = updatedUser;
          
          // Update form with new values without emitting events
          this.profileForm.patchValue({
            name: updatedUser.name || '',
            surname: updatedUser.surname || '',
            email: updatedUser.email || '',
            phoneNumber: updatedUser.phoneNumber || ''
          }, { emitEvent: false });
          
          this.showSnackBarMessage('Profil başarıyla güncellendi');
          this.isLoading = false;
          this.isEditing = false;
        },
        error: (error: any) => {
          console.error('Profil güncellenirken hata:', error);
          this.showSnackBarMessage('Profil güncellenirken bir hata oluştu');
          this.isLoading = false;
        }
      });
    }
  }

  addAddress() {
    const dialogRef = this.dialog.open(AddressDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      panelClass: 'address-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        const adresRequest = {
          adresBasligi: result.adresBasligi,
          telefon: result.telefon,
          ilId: result.il,
          ilceId: result.ilce,
          mahalleId: result.mahalle,
          detayAdres: result.detayAdres
        };

        this.authService.currentUser$.pipe(
          take(1),
          switchMap(user => {
            if (!user) {
              throw new Error('Kullanıcı bulunamadı');
            }
            return this.addressService.addAdres(user.id, adresRequest);
          })
        ).subscribe({
          next: () => {
            this.snackBar.open('Adres başarıyla eklendi', 'Tamam', {
              duration: 3000
            });
            // Adres listesini yenile
            this.authService.currentUser$.pipe(
              take(1),
              switchMap(user => {
                if (!user) {
                  throw new Error('Kullanıcı bulunamadı');
                }
                return this.addressService.getUserAdresleri(user.id);
              })
            ).subscribe({
              next: (addresses) => {
                this.addresses = addresses;
                this.isLoading = false;
              },
              error: (error: any) => {
                console.error('Adresler yüklenirken hata:', error);
                this.isLoading = false;
              }
            });
          },
          error: (error: any) => {
            console.error('Adres ekleme hatası:', error);
            this.snackBar.open('Adres eklenirken bir hata oluştu', 'Tamam', {
              duration: 3000
            });
            this.isLoading = false;
          }
        });
      }
    });
  }

  private refreshAddresses() {
    if (this.currentUser) {
      this.isLoading = true;
      this.addressService.getUserAdresleri(this.currentUser.id).subscribe({
        next: (addresses) => {
          this.addresses = addresses;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Adresler yenilenirken hata:', error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteAddress(addressId: number) {
    if (this.currentUser) {
      this.isLoading = true;
      this.addressService.deleteAdres(this.currentUser.id, addressId).subscribe({
        next: () => {
          this.addresses = this.addresses.filter(addr => addr.id !== addressId);
          this.snackBar.open('Adres başarıyla silindi', 'Tamam', {
            duration: 3000
          });
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error deleting address:', error);
          this.snackBar.open('Adres silinirken bir hata oluştu', 'Tamam', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
    }
  }

  setDefaultAddress(addressId: number) {
    if (this.currentUser) {
      this.isLoading = true;
      // Assuming there's an endpoint to set default address
      this.addressService.setDefaultAddress(this.currentUser.id, addressId).subscribe({
        next: () => {
          // Update the addresses list to reflect the new default status
          this.addresses = this.addresses.map(addr => ({
            ...addr,
            varsayilanMi: addr.id === addressId
          }));
          this.snackBar.open('Varsayılan adres güncellendi', 'Tamam', {
            duration: 3000
          });
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error setting default address:', error);
          this.snackBar.open('Varsayılan adres güncellenirken bir hata oluştu', 'Tamam', {
            duration: 3000
          });
          this.isLoading = false;
        }
      });
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error: any) => {
        console.error('Çıkış yapılırken hata:', error);
        this.snackBar.open('Çıkış yapılırken bir hata oluştu', 'Kapat', {
          duration: 3000
        });
      }
    });
  }

  editEmail() {
    this.isEditingEmail = true;
    this.profileForm.patchValue({ newEmail: '' });
    this.verificationStep = 'none';
    this.verificationCodeArray = ['', '', '', '', '', ''];
  }

  cancelEmailEdit() {
    this.isEditingEmail = false;
    this.profileForm.patchValue({ newEmail: '' });
    this.verificationStep = 'none';
    this.verificationCodeArray = ['', '', '', '', '', ''];
  }

  toggleLoginDetailsEdit() {
    if (this.isEditingLoginDetails) {
      if (this.profileForm.dirty && !this.isWaitingForVerification) {
        this.updateLoginDetails();
      }
    }
    this.isEditingLoginDetails = !this.isEditingLoginDetails;
    
    if (!this.isEditingLoginDetails) {
      this.profileForm.patchValue({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        verificationCode: ''
      });
    }
  }

  updateLoginDetails() {
    if (!this.currentUser) {
      this.snackBar.open('Lütfen önce giriş yapın', 'Kapat', {
        duration: 3000
      });
      this.router.navigate(['/login']);
      return;
    }

    if (this.isWaitingForVerification) {
      console.log('Doğrulama beklendiği için güncelleme yapılmadı');
      return;
    }

    const newEmail = this.profileForm.get('email')?.value;
    const currentPassword = this.profileForm.get('currentPassword')?.value;
    const newPassword = this.profileForm.get('newPassword')?.value;
    const confirmPassword = this.profileForm.get('confirmPassword')?.value;

    if (newEmail && newEmail !== this.currentUser?.email) {
      if (!this.emailChangeValidator(newEmail)) {
        return;
      }

      console.log('Email değişikliği tespit edildi. Mevcut:', this.currentUser.email, 'Yeni:', newEmail);
      this.sendVerificationEmail('new');
      return;
    }

    if (newPassword && !this.isWaitingForVerification) {
      // Password validation
      if (!this.isPasswordStrong(newPassword)) {
        this.showSnackBarMessage('Şifreniz güvenlik gereksinimlerini karşılamıyor.');
        return;
      }

      if (newPassword !== confirmPassword) {
        this.showSnackBarMessage('Şifreler eşleşmiyor.');
        return;
      }

      if (!currentPassword) {
        this.showSnackBarMessage('Mevcut şifrenizi girmelisiniz.');
        return;
      }

      this.isLoading = true;
      this.authService.updatePassword({
        currentPassword,
        newPassword
      }).subscribe({
        next: (updatedUser) => {
          this.showSnackBarMessage('Şifreniz başarıyla güncellendi.');
          this.isEditingLoginDetails = false;
          this.profileForm.patchValue({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Şifre güncellenirken hata:', error);
          if (error.status === 401 || error.status === 400) {
            this.showSnackBarMessage('Mevcut şifreniz hatalı.');
          } else {
            this.showSnackBarMessage('Şifre güncellenirken bir hata oluştu.');
          }
          this.isLoading = false;
        }
      });
    }
  }

  async sendVerificationEmail(type: 'current' | 'new') {
    try {
      this.isLoading = true;
      const currentEmail = this.currentUser?.email;
      const newEmail = this.profileForm.get('email')?.value;
      
      if (!currentEmail) {
        this.showSnackBarMessage('Mevcut e-posta adresi bulunamadı.');
        return;
      }

      if (type === 'new' && (!newEmail || newEmail === currentEmail)) {
        this.showSnackBarMessage('Yeni e-posta adresi mevcut adres ile aynı olamaz.');
        return;
      }

      // Store the new email for later use
      if (type === 'new') {
        this.newEmail = newEmail!;
      }

      // Doğrulama durumunu güncelle
      this.isWaitingForVerification = true;

      const requestData = {
        currentEmail: currentEmail,
        newEmail: type === 'new' ? newEmail : undefined,
        type: type
      };

      await this.authService.sendVerificationEmailAsync(requestData);
      
      const dialogRef = this.dialog.open(AccountSettingsComponent, {
        width: '400px',
        data: { type, newEmail: type === 'new' ? newEmail : undefined },
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(async (code: string) => {
        if (code) {
          try {
            this.isLoading = true;
            if (type === 'current') {
              this.verificationStep = 'new';
              this.verificationCodeArray = code.split('');
              this.verificationCode = code;
              await this.verifyEmail();
            } else {
              this.verificationStep = 'none';
              // Use the stored newEmail value
              await this.updateEmail(code);
            }
          } catch (error) {
            this.showSnackBarMessage('Doğrulama işlemi başarısız oldu.');
          } finally {
            this.isLoading = false;
            this.isWaitingForVerification = false;
          }
        } else {
          // Dialog iptal edildiğinde tüm durumları sıfırla
          this.isLoading = false;
          this.isWaitingForVerification = false;
          this.verificationStep = 'none';
          this.newEmail = '';
          
          // Form değerlerini orijinal değerlerine geri al
          if (this.currentUser) {
            this.profileForm.patchValue({
              email: this.currentUser.email
            });
          }
          
          // Email düzenleme durumunu kapat
          this.isEditingEmail = false;
          this.isEditingLoginDetails = false;
        }
      });
    } catch (error: any) {
      this.isLoading = false;
      this.isWaitingForVerification = false;
      
      // HTTP hata mesajlarını göster
      if (error.error && error.error.message) {
        this.showSnackBarMessage(error.error.message);
      } else if (error.status === 400) {
        this.showSnackBarMessage('Bu e-posta adresi zaten başka bir hesapta kullanılmaktadır.');
      } else if (error.status === 401) {
        // Kimlik doğrulama hatası, oturumu yenilemeye çalışma
        this.showSnackBarMessage('Oturum süresi dolmuş. Lütfen yeniden giriş yapın.');
      } else {
        this.showSnackBarMessage('Doğrulama kodu gönderme işlemi başarısız oldu.');
      }
    }
  }

  private async updateEmail(verificationCode: string) {
    try {
      this.isLoading = true;
      // Use the stored newEmail value instead of getting it from the form
      const newEmail = this.newEmail || this.profileForm.get('email')?.value;
      
      if (!newEmail) {
        throw new Error('E-posta adresi bulunamadı');
      }

      await this.authService.updateEmailWithVerificationAsync(newEmail, verificationCode);
      this.currentUser = { ...this.currentUser!, email: newEmail };
      this.isEditingEmail = false;
      this.isEditingLoginDetails = false;
      this.showSnackBarMessage('E-posta adresiniz başarıyla güncellendi.');
      
      // Clear the stored newEmail after successful update
      this.newEmail = '';
    } catch (error) {
      this.showSnackBarMessage('E-posta güncellenirken bir hata oluştu.');
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  verifyEmail() {
    if (this.verificationCode.length !== 6) {
      this.showSnackBarMessage('Lütfen 6 haneli doğrulama kodunu girin');
      return;
    }

    this.isLoading = true;
    const newEmail = this.profileForm.get('email')?.value;
    
    if (newEmail) {
      this.authService.updateEmailWithVerification(newEmail, this.verificationCode).subscribe({
        next: (response: any) => {
          if (response) {
            this.showSnackBarMessage('E-posta doğrulama işlemi başarılı');
            this.isWaitingForVerification = false;
            this.clearVerificationCode();
            this.isEditingLoginDetails = false;
          } else {
            this.showSnackBarMessage('E-posta doğrulama işlemi başarısız oldu');
          }
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error verifying email:', error);
          this.showSnackBarMessage(error.error?.message || 'E-posta doğrulanamadı');
          this.isLoading = false;
        }
      });
    }
  }

  resendVerificationCode() {
    if (this.isWaitingForVerification) {
      this.sendVerificationEmail('new');
    }
  }

  editPassword() {
    this.isEditingLoginDetails = true;
    this.profileForm.patchValue({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // Focus on the current password field
    setTimeout(() => {
      const currentPasswordInput = document.querySelector('input[formcontrolname="currentPassword"]') as HTMLInputElement;
      if (currentPasswordInput) {
        currentPasswordInput.focus();
      }
    }, 100);
  }


  deleteAccount() {
    const confirmDelete = window.confirm('Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    
    if (confirmDelete) {
      this.authService.deleteAccount().subscribe({
        next: () => {
          this.snackBar.open('Hesabınız başarıyla silindi', 'Tamam', {
            duration: 3000
          });
          this.router.navigate(['/']);
        },
        error: (error: any) => {
          console.error('Hesap silinirken hata:', error);
          this.snackBar.open('Hesap silinirken bir hata oluştu', 'Kapat', {
            duration: 3000
          });
        }
      });
    }
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isStrong = password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChars;
    
    if (!isStrong) {
      // Set specific errors on the form control
      const passwordControl = this.profileForm.get('newPassword');
      if (passwordControl) {
        const errors: any = {};
        if (password.length < minLength) errors.length = true;
        if (!hasUpperCase) errors.uppercase = true;
        if (!hasLowerCase) errors.lowercase = true;
        if (!hasNumbers) errors.number = true;
        if (!hasSpecialChars) errors.special = true;
        
        passwordControl.setErrors(errors);
      }
    }
    
    return isStrong;
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (newPassword && confirmPassword && 
        newPassword.value && confirmPassword.value &&
        newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    // If confirm password has only the mismatch error and passwords now match, clear the error
    if (confirmPassword && confirmPassword.errors && 
        'passwordMismatch' in confirmPassword.errors &&
        Object.keys(confirmPassword.errors).length === 1 && 
        (!newPassword?.value || newPassword.value === confirmPassword.value)) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  emailChangeValidator(newEmail: string): boolean {
    if (!this.currentUser) return false;
    
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(newEmail)) {
      this.snackBar.open('Geçerli bir e-posta adresi giriniz', 'Kapat', {
        duration: 3000
      });
      return false;
    }

    if (newEmail === this.currentUser.email) {
      this.snackBar.open('Yeni e-posta adresi mevcut adres ile aynı olamaz', 'Kapat', {
        duration: 3000
      });
      return false;
    }

    return true;
  }

  hasPasswordError(type: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'): boolean {
    const password = this.profileForm.get('newPassword')?.value;
    if (!password) return true;

    switch (type) {
      case 'length':
        return password.length < 8;
      case 'uppercase':
        return !/[A-Z]/.test(password);
      case 'lowercase':
        return !/[a-z]/.test(password);
      case 'number':
        return !/[0-9]/.test(password);
      case 'special':
        return !/[!@#$%^&*(),.?":{}|<>]/.test(password);
      default:
        return false;
    }
  }

  onVerificationCodeInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^\d*$/.test(value)) {
      input.value = '';
      return;
    }

    const singleChar = value.slice(-1);
    this.verificationCodeArray[index] = singleChar;
    input.value = singleChar;

    this.verificationCode = this.verificationCodeArray.join('');

    if (singleChar && index < 5) {
      const nextInput = input.parentElement?.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  onVerificationCodeKeydown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    
    if (event.key === 'Backspace') {
      event.preventDefault();
      
      this.verificationCodeArray[index] = '';
      input.value = '';
      this.verificationCode = this.verificationCodeArray.join('');
      
      if (index > 0) {
        const prevInput = input.parentElement?.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = input.parentElement?.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      const nextInput = input.parentElement?.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  onVerificationCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      this.verificationCodeArray = pastedData.split('');
      this.verificationCode = pastedData;
      
      const inputs = document.querySelectorAll('input[data-verification-code]');
      inputs.forEach((input, index) => {
        (input as HTMLInputElement).value = this.verificationCodeArray[index];
      });

      const lastInput = document.querySelector('input[data-index="5"]') as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }
  }

  clearVerificationCode() {
    this.verificationCodeArray = ['', '', '', '', '', ''];
    this.verificationCode = '';
    
    const inputs = document.querySelectorAll('input[data-verification-code]');
    inputs.forEach((input) => {
      (input as HTMLInputElement).value = '';
    });
    
    const firstInput = document.querySelector('input[data-index="0"]') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  // Telefon numarası validator
  phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (!value) {
      return null; // Telefon numarası zorunlu değil
    }
    
    // Türkiye için telefon numarası formatı: 05XX XXX XX XX veya 5XX XXX XX XX
    // Boşluk, -, ve ( ) karakterlerini temizle
    const cleanedValue = value.replace(/\s|-|\(|\)/g, '');
    
    // 05XX... veya 5XX... formatı için regex
    const turkishPhoneRegex = /^(0?5)[0-9]{9}$/;
    
    if (!turkishPhoneRegex.test(cleanedValue)) {
      return { invalidPhoneNumber: true };
    }
    
    return null;
  }

  // Mağaza başvurularını yükleme metodu
  loadStoreApplications() {
    if (!this.currentUser) {
      this.storeApplications = [];
      return;
    }
    
    this.isLoading = true;
    this.storeService.getCurrentUserApplications().subscribe({
      next: (applications) => {
        this.storeApplications = applications;
        this.isLoading = false;
        console.log('Mağaza başvuruları yüklendi:', applications);
      },
      error: (error) => {
        // Hata durumunda boş liste göster
        this.storeApplications = [];
        this.isLoading = false;
        
        // Hata durumunu kontrol et ve yönet
        if (error.status === 401) {
          console.log('Kullanıcı oturumu geçersiz veya yetki eksik');
          // Hatayı sessizce geç, kullanıcıya boş başvuru listesi göster
        } else if (error.status === 403) {
          console.log('Bu işlem için yetkiniz yok');
          // Hatayı sessizce geç, kullanıcıya boş başvuru listesi göster
        } else {
          console.error('Mağaza başvuruları yüklenirken hata oluştu:', error);
          // Sadece kritik hatalarda kullanıcıya bildir
          this.snackBar.open('Mağaza başvurularınız yüklenirken bir hata oluştu', 'Tamam', { 
            duration: 3000 
          });
        }
      }
    });
  }

  // Aktif bölüm değiştiğinde ilgili verileri yükleme
  setActiveSection(section: 'personal' | 'addresses' | 'orders' | 'preferences' | 'applications') {
    this.activeSection = section;
    
    // Eğer mağaza başvuruları bölümü seçildiyse verileri yükle
    if (section === 'applications') {
      this.loadStoreApplications();
    }
  }

  // Başvuru durumunu Türkçe olarak gösterme
  getApplicationStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'withdrawn': return 'Geri Alındı';
      case 'banned': return 'Yasaklandı';
      case 'inactive': return 'Pasif';
      default: return 'Bilinmiyor';
    }
  }

  // Başvuru durumuna göre renk kodu döndürme
  getApplicationStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'withdrawn': return 'gray';
      case 'banned': return 'red';
      case 'inactive': return 'gray';
      default: return 'gray';
    }
  }

  // Yeni başvuru yapma sayfasına yönlendirme
  navigateToStoreApplication() {
    this.router.navigate(['/store-application']);
  }

  // Mağaza başvurusunu geri çek
  withdrawApplication(applicationId: string) {
    // Kullanıcı onayı al
    const confirmWithdraw = window.confirm('Mağaza başvurunuzu geri çekmek istediğinize emin misiniz?');
    
    if (confirmWithdraw) {
      this.isLoading = true;
      this.storeService.withdrawStoreApplication(applicationId).subscribe({
        next: (result) => {
          this.isLoading = false;
          this.snackBar.open('Mağaza başvurunuz başarıyla geri çekildi', 'Tamam', { duration: 3000 });
          // Başvuru listesini yenile
          this.loadStoreApplications();
        },
        error: (error) => {
          this.isLoading = false;
          this.snackBar.open('Başvuru geri çekilirken bir hata oluştu', 'Tamam', { duration: 3000 });
          console.error('Başvuru geri çekme hatası:', error);
        }
      });
    }
  }
} 