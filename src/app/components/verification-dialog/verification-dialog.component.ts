import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-verification-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
      (click)="onClose.emit()">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
        (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Verify Your Email</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Code sent to {{ email }}</p>
            </div>
          </div>
          <button (click)="onClose.emit()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Timer -->
        <div *ngIf="timeRemaining > 0" class="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>Code expires in {{ formatTime(timeRemaining) }}</span>
        </div>

        <!-- Code Inputs -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Enter verification code
          </label>
          <div class="flex gap-2 justify-center" (paste)="handlePaste($event)">
            <input
              *ngFor="let digit of code; let i = index"
              #codeInput
              type="text"
              inputmode="numeric"
              [attr.maxlength]="codeLength"
              [value]="code[i]"
              (input)="handleCodeChange(i, $event)"
              (keydown)="handleKeyDown(i, $event)"
              [attr.autocomplete]="i === 0 ? 'one-time-code' : 'off'"
              [disabled]="isVerifying || timeRemaining === 0"
              class="w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                     disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <!-- Error Message -->
        <div *ngIf="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            (click)="handleVerify()"
            [disabled]="!isCodeComplete() || isVerifying || timeRemaining === 0"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ isVerifying ? 'Verifying...' : 'Verify Code' }}
          </button>
          <button
            (click)="handleResend()"
            [disabled]="isResending"
            class="w-full text-blue-600 dark:text-blue-400 hover:underline py-2 text-sm font-medium
                   disabled:opacity-50">
            {{ isResending ? 'Sending...' : 'Resend Code' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    input[type="text"]::-webkit-inner-spin-button,
    input[type="text"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `]
})
export class VerificationDialogComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() email = '';
  @Input() codeId = '';
  @Input() expiresAt = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() onVerified = new EventEmitter<any>();
  @Output() onResend = new EventEmitter<void>();

  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  codeLength = 6;
  code: string[] = [];
  isVerifying = false;
  isResending = false;
  error: string | null = null;
  timeRemaining = 0;
  private timerInterval: any;
  private previousCodeId = '';

  constructor(private verificationService: VerificationService) {}

  async ngOnInit() {
    await this.fetchCodeLength();
  }

  async ngOnChanges() {
    if (this.isOpen) {
      // Fetch code length when dialog opens or new code is generated
      if (this.codeId !== this.previousCodeId) {
        this.previousCodeId = this.codeId;
        await this.fetchCodeLength();
      }
      
      this.startTimer();
      document.body.style.overflow = 'hidden';
      
      // Focus first input after a short delay
      setTimeout(() => {
        this.focusInput(0);
      }, 100);
    } else {
      // Reset state when dialog closes
      this.code = new Array(this.codeLength).fill('');
      this.error = null;
      this.stopTimer();
      document.body.style.overflow = '';
    }
  }

  ngOnDestroy() {
    this.stopTimer();
    document.body.style.overflow = '';
  }

  private async fetchCodeLength() {
    try {
      this.codeLength = await this.verificationService.getCodeLength();
      this.code = new Array(this.codeLength).fill('');
    } catch (err) {
      console.error('Error fetching code length:', err);
      this.codeLength = 6;
      this.code = new Array(6).fill('');
    }
  }

  startTimer() {
    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateTimer() {
    const expires = new Date(this.expiresAt).getTime();
    const now = Date.now();
    this.timeRemaining = Math.max(0, Math.floor((expires - now) / 1000));

    if (this.timeRemaining === 0) {
      this.error = 'Code expired. Please request a new one.';
      this.stopTimer();
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  handleCodeChange(index: number, event: any): void {
    const target = event?.target;
    if (!target) return;
    
    const value = target.value;
    
    // Handle autofill on iOS/Chromium which pastes the full code into the first input
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, this.codeLength);
      if (digits.length >= this.codeLength) {
        this.code = digits.slice(0, this.codeLength).split('');
        this.error = null;
        // Reset the first input to show only its digit
        if (index === 0 && this.codeInputs?.first) {
          this.codeInputs.first.nativeElement.value = this.code[0];
        }
        this.focusInput(this.codeLength - 1);
        return;
      }
    }

    // Only allow digits
    if (/^\d$/.test(value)) {
      this.code[index] = value;
      this.error = null;
      if (index < this.codeLength - 1) {
        this.focusInput(index + 1);
      }
    } else {
      this.code[index] = '';
    }
  }

  handleKeyDown(index: number, event: any): void {
    const key = event?.key;
    if (!key) return;
    
    if (key === 'Backspace') {
      if (!this.code[index] && index > 0) {
        this.focusInput(index - 1);
      }
      this.code[index] = '';
    } else if (key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    } else if (key === 'ArrowRight' && index < this.codeLength - 1) {
      this.focusInput(index + 1);
    } else if (key === 'Enter' && this.isCodeComplete()) {
      // Verify on Enter if all digits are filled
      this.handleVerify();
    }
  }

  handlePaste(event: any): void {
    if (!event) return;
    
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').slice(0, this.codeLength);
    
    if (digits.length >= this.codeLength) {
      this.code = digits.slice(0, this.codeLength).split('');
      this.focusInput(this.codeLength - 1);
    }
  }

  focusInput(index: number) {
    setTimeout(() => {
      const inputs = this.codeInputs.toArray();
      if (inputs[index]) {
        inputs[index].nativeElement.focus();
      }
    }, 0);
  }

  isCodeComplete(): boolean {
    return this.code.every(digit => digit.length === 1);
  }

  async handleVerify() {
    if (!this.isCodeComplete()) return;

    this.isVerifying = true;
    this.error = null;

    try {
      const result = await this.verificationService.verifyCode(
        this.email,
        this.codeId,
        this.code.join('')
      );

      if (result.success) {
        this.onVerified.emit(result.actionData);
      }
    } catch (err: any) {
      this.error = err.message || 'Invalid code. Please try again.';
      this.code = new Array(this.codeLength).fill('');
      this.focusInput(0);
    } finally {
      this.isVerifying = false;
    }
  }

  async handleResend() {
    this.isResending = true;
    this.error = null;
    
    try {
      this.onResend.emit();
      this.code = new Array(this.codeLength).fill('');
      this.focusInput(0);
    } catch (err: any) {
      this.error = err.message || 'Failed to resend code';
    } finally {
      this.isResending = false;
    }
  }
}
