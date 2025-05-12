import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.css',
  standalone: false
})
export class AccountSettingsComponent {
  verificationCodeArray: string[] = ['', '', '', '', '', '']; // 6 haneli kod için array

  constructor(
    public dialogRef: MatDialogRef<AccountSettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { type: 'current' | 'new' }
  ) {}

  onKeyPress(event: KeyboardEvent, index: number) {
    // Sadece rakam girişine izin ver
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    this.verificationCodeArray[index] = event.key;

    // Bir tick bekleyip sonraki input'a geç
    setTimeout(() => {
      if (index < 5) {
        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }, 0);
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    // Backspace tuşu kontrolü
    if (event.key === 'Backspace') {
      event.preventDefault();
      
      // Mevcut input boşsa ve önceki input varsa
      if (index > 0 && !this.verificationCodeArray[index]) {
        this.verificationCodeArray[index - 1] = '';
        // Önceki input'a git
        setTimeout(() => {
          const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
          if (prevInput) {
            prevInput.focus();
          }
        }, 0);
      } else {
        this.verificationCodeArray[index] = '';
      }
    }
  }

  onVerificationCodePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text');
    
    if (!pastedText || !/^\d{6}$/.test(pastedText)) {
      return;
    }

    // Her bir rakamı ilgili input'a yerleştir
    const digits = pastedText.split('');
    digits.forEach((digit, index) => {
      this.verificationCodeArray[index] = digit;
    });

    // Son input'a focus
    setTimeout(() => {
      const lastInput = document.querySelector(`input[data-index="5"]`) as HTMLInputElement;
      if (lastInput) {
        lastInput.focus();
      }
    }, 0);
  }

  onSubmit() {
    const code = this.verificationCodeArray.join('');
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      this.dialogRef.close(code);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}