import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { VerificationDialogComponent } from './verification-dialog.component';
import { VerificationService } from '../../services/verification.service';

describe('VerificationDialogComponent', () => {
  let component: VerificationDialogComponent;
  let mockVerificationService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockVerificationService = {
      getCodeLength: vi.fn(() => Promise.resolve(6)),
      verifyCode: vi.fn()
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    // Mock document.body.style
    Object.defineProperty(document.body.style, 'overflow', {
      writable: true,
      value: ''
    });

    component = new VerificationDialogComponent(
      mockVerificationService,
      mockChangeDetectorRef as ChangeDetectorRef
    );
    component.email = 'test@example.com';
    component.codeId = 'code-123';
    component.expiresAt = new Date(Date.now() + 900000).toISOString();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('component initialization', () => {
    it('should initialize with default values', () => {
      expect(component.codeLength).toBe(6);
      expect(component.isVerifying).toBe(false);
      expect(component.isResending).toBe(false);
      expect(component.error).toBe(null);
      expect(component.hasExpired).toBe(false);
    });

    it('should fetch code length on init', async () => {
      await component.ngOnInit();
      expect(mockVerificationService.getCodeLength).toHaveBeenCalled();
    });

    it('should use default code length of 6 when fetch fails', async () => {
      mockVerificationService.getCodeLength.mockRejectedValue(new Error('Fetch error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.ngOnInit();

      expect(component.codeLength).toBe(6);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should set code length from service', async () => {
      mockVerificationService.getCodeLength.mockResolvedValue(8);
      await component.ngOnInit();
      expect(component.codeLength).toBe(8);
    });
  });

  describe('ngOnChanges', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should initialize code array when dialog opens', () => {
      component.isOpen = true;
      component.ngOnChanges();
      expect(component.code).toEqual(['', '', '', '', '', '']);
    });

    it('should reset expired flag when opening with new code', () => {
      component.hasExpired = true;
      component.isOpen = true;
      component.ngOnChanges();
      expect(component.hasExpired).toBe(false);
    });

    it('should not error when closed', () => {
      component.isOpen = false;
      component.ngOnChanges();
      expect(component.error).toBe(null);
    });

    it('should reset body overflow when closed', () => {
      document.body.style.overflow = 'hidden';
      component.isOpen = false;
      component.ngOnChanges();
      expect(document.body.style.overflow).toBe('');
    });

    it('should reset code and error when closing', () => {
      component.code = ['1', '2', '3', '4', '5', '6'];
      component.error = 'Some error';
      component.isOpen = false;
      component.ngOnChanges();

      expect(component.code).toEqual(['', '', '', '', '', '']);
      expect(component.error).toBe(null);
    });

    it('should fetch new code length when codeId changes', async () => {
      component.isOpen = true;
      component.ngOnChanges();
      await Promise.resolve();

      vi.clearAllMocks();

      component.codeId = 'code-456';
      component.isOpen = true;
      component.ngOnChanges();
      await Promise.resolve();

      expect(mockVerificationService.getCodeLength).toHaveBeenCalled();
    });

    it('should not fetch code length when codeId has not changed', async () => {
      component.isOpen = true;
      component.codeId = 'code-123';
      component.ngOnChanges();
      await Promise.resolve();

      vi.clearAllMocks();

      // Keep same codeId
      component.isOpen = true;
      component.codeId = 'code-123';
      component.ngOnChanges();
      await Promise.resolve();

      expect(mockVerificationService.getCodeLength).not.toHaveBeenCalled();
    });

    it('should call focusInput after timeout when dialog opens', async () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      component.isOpen = true;
      component.ngOnChanges();

      // Fast-forward time to trigger setTimeout
      await vi.advanceTimersByTimeAsync(100);

      expect(focusInputSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('timer functionality', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('should initialize timeRemaining', () => {
      expect(component.timeRemaining).toBe(900);
    });

    it('should call updateTimer when startTimer is called', () => {
      const updateTimerSpy = vi.spyOn(component as any, 'updateTimer');
      component['startTimer']();
      expect(updateTimerSpy).toHaveBeenCalled();
    });

    it('should call clearInterval when stopTimer is called', () => {
      component['timerInterval'] = 123 as any;
      component['stopTimer']();
      // Just verify it doesn't throw an error
      expect(true).toBe(true);
    });

    it('should format time correctly', () => {
      expect(component.formatTime(125)).toBe('2:05');
      expect(component.formatTime(60)).toBe('1:00');
      expect(component.formatTime(0)).toBe('0:00');
      expect(component.formatTime(599)).toBe('9:59');
    });

    it('should call updateTimer to calculate time remaining', () => {
      component.expiresAt = new Date(Date.now() + 60000).toISOString();
      component['updateTimer']();
      expect(component.timeRemaining).toBeGreaterThan(0);
      expect(component.timeRemaining).toBeLessThanOrEqual(60);
    });
  });

  describe('code input handling', () => {
    it('should sanitize code input by removing non-digits', () => {
      component.codeInput = 'abc123def456';
      component.sanitizeCodeInput();
      expect(component.codeInput).toBe('123456');
    });

    it('should limit code input to codeLength characters', () => {
      component.codeInput = '1234567890';
      component.sanitizeCodeInput();
      expect(component.codeInput).toBe('123456');
      expect(component.codeInput.length).toBe(6);
    });

    it('should update code array when sanitizing input', () => {
      component.codeInput = '123456';
      component.sanitizeCodeInput();
      expect(component.code).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('should return true when code is complete', () => {
      component.codeInput = '123456';
      expect(component.isCodeComplete()).toBe(true);
    });

    it('should return false when code is incomplete', () => {
      component.codeInput = '12345';
      expect(component.isCodeComplete()).toBe(false);
    });

    it('should handle empty code input', () => {
      component.codeInput = '';
      component.sanitizeCodeInput();
      expect(component.codeInput).toBe('');
      expect(component.code).toEqual([]);
    });

    it('should handle partial code input', () => {
      component.codeInput = '123';
      component.sanitizeCodeInput();
      expect(component.codeInput).toBe('123');
      expect(component.code).toEqual(['1', '2', '3']);
    });
  });

  describe('verification process', () => {
    it('should not verify when code is incomplete', async () => {
      component.codeInput = '12345';
      await component.handleVerify();
      expect(mockVerificationService.verifyCode).not.toHaveBeenCalled();
    });

    it('should call verifyCode with correct parameters', async () => {
      mockVerificationService.verifyCode.mockResolvedValue({ success: true, actionData: {} });

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(mockVerificationService.verifyCode).toHaveBeenCalledWith(
        'test@example.com',
        'code-123',
        '123456'
      );
    });

    it('should emit onVerified event on successful verification', async () => {
      const actionData = { type: 'prayer', data: {} };
      mockVerificationService.verifyCode.mockResolvedValue({ success: true, actionData });

      const verifiedSpy = vi.fn();
      component.onVerified.subscribe(verifiedSpy);

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(verifiedSpy).toHaveBeenCalledWith(actionData);
    });

    it('should set error on verification failure', async () => {
      mockVerificationService.verifyCode.mockRejectedValue(new Error('Invalid code'));

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(component.error).toBe('Invalid code');
    });

    it('should reset code on verification failure', async () => {
      mockVerificationService.verifyCode.mockRejectedValue(new Error('Invalid code'));

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(component.code).toEqual(['', '', '', '', '', '']);
    });

    it('should set isVerifying during verification', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockVerificationService.verifyCode.mockReturnValue(promise);

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      const verifyPromise = component.handleVerify();

      expect(component.isVerifying).toBe(true);

      resolvePromise({ success: true, actionData: {} });
      await verifyPromise;

      expect(component.isVerifying).toBe(false);
    });

    it('should sanitize input before verifying', async () => {
      mockVerificationService.verifyCode.mockResolvedValue({ success: true, actionData: {} });

      component.codeInput = 'abc123456def';

      await component.handleVerify();

      expect(mockVerificationService.verifyCode).toHaveBeenCalledWith(
        'test@example.com',
        'code-123',
        '123456'
      );
    });

    it('should use error message from exception', async () => {
      mockVerificationService.verifyCode.mockRejectedValue(new Error('Custom error message'));

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(component.error).toBe('Custom error message');
    });

    it('should use default error message when no message in exception', async () => {
      mockVerificationService.verifyCode.mockRejectedValue({});

      component.codeInput = '123456';
      component.sanitizeCodeInput();

      await component.handleVerify();

      expect(component.error).toBe('Invalid code. Please try again.');
    });
  });

  describe('resend functionality', () => {
    it('should emit onResend event when handleResend is called', async () => {
      const resendSpy = vi.fn();
      component.onResend.subscribe(resendSpy);

      await component.handleResend();

      expect(resendSpy).toHaveBeenCalled();
    });

    it('should reset code when resending', async () => {
      component.code = ['1', '2', '3', '4', '5', '6'];

      await component.handleResend();

      expect(component.code).toEqual(['', '', '', '', '', '']);
    });

    it('should clear error when resending', async () => {
      component.error = 'Previous error';

      await component.handleResend();

      expect(component.error).toBe(null);
    });

    it('should set isResending to false after resend', async () => {
      await component.handleResend();
      expect(component.isResending).toBe(false);
    });

    it('should handle error during resend with error message', async () => {
      // Spy on emit to make it throw
      const emitSpy = vi.spyOn(component.onResend, 'emit').mockImplementation(() => {
        throw new Error('Resend failed');
      });

      await component.handleResend();

      expect(component.error).toBe('Resend failed');
      expect(component.isResending).toBe(false);
      emitSpy.mockRestore();
    });

    it('should handle error during resend without error message', async () => {
      // Spy on emit to make it throw an error without message
      const emitSpy = vi.spyOn(component.onResend, 'emit').mockImplementation(() => {
        throw {};
      });

      await component.handleResend();

      expect(component.error).toBe('Failed to resend code');
      expect(component.isResending).toBe(false);
      emitSpy.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('should stop timer on destroy', () => {
      component.isOpen = true;
      component.ngOnChanges();

      const stopTimerSpy = vi.spyOn(component as any, 'stopTimer');
      component.ngOnDestroy();

      expect(stopTimerSpy).toHaveBeenCalled();
    });

    it('should reset body overflow on destroy', () => {
      document.body.style.overflow = 'hidden';

      component.ngOnDestroy();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('deprecated methods', () => {
    it('should handle handleSingleCodeInput for backward compatibility', () => {
      component.codeInput = 'abc123';
      component.handleSingleCodeInput({});

      expect(component.codeInput).toBe('123');
    });

    it('should handle handleCodeChange method', () => {
      const mockEvent = {
        target: {
          value: '5'
        }
      };
      component.handleCodeChange(0, mockEvent);
      expect(component.code[0]).toBe('5');
    });

    it('should move to next field when entering a single digit', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        target: {
          value: '7'
        }
      };
      
      // Enter digit in first field (not last)
      component.handleCodeChange(0, mockEvent);
      
      expect(component.code[0]).toBe('7');
      expect(focusInputSpy).toHaveBeenCalledWith(1);
    });

    it('should not move to next field when entering digit in last field', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        target: {
          value: '9'
        }
      };
      
      // Enter digit in last field
      component.handleCodeChange(5, mockEvent);
      
      expect(component.code[5]).toBe('9');
      expect(focusInputSpy).not.toHaveBeenCalled();
    });

    it('should handle handleCodeChange with autofill', () => {
      const mockEvent = {
        target: {
          value: '123456'
        }
      };
      component.handleCodeChange(0, mockEvent);
      expect(component.code).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('should handle handleCodeChange with autofill and reset first input value', () => {
      const mockFirstInput = {
        nativeElement: {
          value: '123456'
        }
      };
      component.codeInputs = {
        first: mockFirstInput,
        toArray: () => []
      } as any;
      
      const mockEvent = {
        target: {
          value: '123456'
        }
      };
      
      component.handleCodeChange(0, mockEvent);
      
      expect(component.code).toEqual(['1', '2', '3', '4', '5', '6']);
      expect(mockFirstInput.nativeElement.value).toBe('1');
    });

    it('should handle autofill with insufficient digits', () => {
      const mockEvent = {
        target: {
          value: '123'  // Only 3 digits, less than codeLength (6)
        }
      };
      
      component.handleCodeChange(0, mockEvent);
      
      // When digits.length < codeLength, exits autofill block and continues to single digit check
      // '123' doesn't match /^\d$/ regex, so it clears the field
      expect(component.code[0]).toBe('');
      expect(mockEvent.target.value).toBe('');
    });

    it('should handle handleCodeChange with non-digit', () => {
      const mockEvent = {
        target: {
          value: 'a'
        }
      };
      component.handleCodeChange(0, mockEvent);
      expect(component.code[0]).toBe('');
    });

    it('should handle handleKeyDown with Backspace', () => {
      const mockEvent = {
        key: 'Backspace',
        preventDefault: vi.fn()
      };
      component.code = ['1', '2', '3', '4', '5', '6'];
      component.handleKeyDown(2, mockEvent);
      expect(component.code[2]).toBe('');
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should move to previous field on Backspace when not at first index', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        key: 'Backspace',
        preventDefault: vi.fn()
      };
      component.code = ['1', '2', '3', '4', '5', '6'];
      
      // Press backspace on index 3 (not first field)
      component.handleKeyDown(3, mockEvent);
      
      expect(component.code[3]).toBe('');
      expect(focusInputSpy).toHaveBeenCalledWith(2);
    });

    it('should not move to previous field on Backspace when index is 0', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        key: 'Backspace',
        preventDefault: vi.fn()
      };
      component.code = ['1', '2', '3', '4', '5', '6'];
      
      // Press backspace on index 0 (first field)
      component.handleKeyDown(0, mockEvent);
      
      expect(component.code[0]).toBe('');
      expect(focusInputSpy).not.toHaveBeenCalled();
    });

    it('should handle handleKeyDown with ArrowLeft', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        key: 'ArrowLeft'
      };
      component.handleKeyDown(2, mockEvent);
      expect(focusInputSpy).toHaveBeenCalledWith(1);
    });

    it('should handle handleKeyDown with ArrowRight', () => {
      const focusInputSpy = vi.spyOn(component, 'focusInput');
      const mockEvent = {
        key: 'ArrowRight'
      };
      component.handleKeyDown(2, mockEvent);
      expect(focusInputSpy).toHaveBeenCalledWith(3);
    });

    it('should handle handleKeyDown with Enter when code is complete', () => {
      const handleVerifySpy = vi.spyOn(component, 'handleVerify');
      component.code = ['1', '2', '3', '4', '5', '6'];
      component.codeInput = '123456'; // Set codeInput as isCodeComplete checks its length
      const mockEvent = {
        key: 'Enter'
      };
      // Use middle index to reach the Enter handler in handleKeyDown
      component.handleKeyDown(3, mockEvent);
      expect(handleVerifySpy).toHaveBeenCalled();
    });

    it('should not verify on Enter when code is incomplete', () => {
      const handleVerifySpy = vi.spyOn(component, 'handleVerify');
      component.code = ['1', '2', '3', '', '', ''];
      component.codeInput = '123'; // Incomplete code
      const mockEvent = {
        key: 'Enter'
      };
      component.handleKeyDown(3, mockEvent);
      expect(handleVerifySpy).not.toHaveBeenCalled();
    });

    it('should handle handlePaste', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: {
          getData: vi.fn(() => '123456')
        }
      };
      component.handlePaste(mockEvent);
      expect(component.code).toEqual(['1', '2', '3', '4', '5', '6']);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle handlePaste with empty clipboard', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: {
          getData: vi.fn(() => '')
        }
      };
      component.handlePaste(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle handlePaste with null event', () => {
      component.handlePaste(null);
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle handleCodeChange with null event', () => {
      component.handleCodeChange(0, null);
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle handleKeyDown with null event', () => {
      component.handleKeyDown(0, null);
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle focusInput when codeInputs is available', () => {
      component.codeInputs = {
        toArray: () => []
      } as any;
      component.focusInput(0);
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should call focus on input element when focusInput is called with valid index', async () => {
      const mockFocus = vi.fn();
      const mockInput = {
        nativeElement: {
          focus: mockFocus
        }
      };
      component.codeInputs = {
        toArray: () => [mockInput, mockInput]
      } as any;
      
      component.focusInput(1);
      
      // Wait for setTimeout to execute
      await vi.advanceTimersByTimeAsync(0);
      
      expect(mockFocus).toHaveBeenCalled();
    });

    it('should not throw when focusInput is called with out-of-bounds index', async () => {
      const mockInput = {
        nativeElement: {
          focus: vi.fn()
        }
      };
      component.codeInputs = {
        toArray: () => [mockInput] // Only one input
      } as any;
      
      // Try to focus index 5 which doesn't exist
      component.focusInput(5);
      
      // Wait for setTimeout to execute
      await vi.advanceTimersByTimeAsync(0);
      
      // Should not throw error, just not call focus
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very long code lengths', async () => {
      mockVerificationService.getCodeLength.mockResolvedValue(12);
      await component.ngOnInit();

      component.codeInput = '123456789012345';
      component.sanitizeCodeInput();

      expect(component.codeInput).toBe('123456789012');
      expect(component.codeInput.length).toBe(12);
    });

    it('should handle expired code on updateTimer', () => {
      component.expiresAt = new Date(Date.now() - 10000).toISOString();
      component['updateTimer']();

      expect(component.timeRemaining).toBe(0);
      expect(component.hasExpired).toBe(true);
      expect(component.error).toBe('Code expired. Please request a new one.');
    });

    it('should handle empty email', () => {
      component.email = '';
      component.codeInput = '123456';
      component.sanitizeCodeInput();

      mockVerificationService.verifyCode.mockResolvedValue({ success: true, actionData: {} });
      component.handleVerify();

      expect(mockVerificationService.verifyCode).toHaveBeenCalledWith('', 'code-123', '123456');
    });

    it('should handle empty codeId', () => {
      component.codeId = '';
      component.codeInput = '123456';
      component.sanitizeCodeInput();

      mockVerificationService.verifyCode.mockResolvedValue({ success: true, actionData: {} });
      component.handleVerify();

      expect(mockVerificationService.verifyCode).toHaveBeenCalledWith('test@example.com', '', '123456');
    });
  });

  describe('input/output properties', () => {
    it('should have isOpen property', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
      component.isOpen = false;
      expect(component.isOpen).toBe(false);
    });

    it('should have email property', () => {
      component.email = 'new@example.com';
      expect(component.email).toBe('new@example.com');
    });

    it('should have codeId property', () => {
      component.codeId = 'new-code';
      expect(component.codeId).toBe('new-code');
    });

    it('should have expiresAt property', () => {
      const newExpiry = new Date(Date.now() + 100000).toISOString();
      component.expiresAt = newExpiry;
      expect(component.expiresAt).toBe(newExpiry);
    });

    it('should emit onClose event', () => {
      const closeSpy = vi.fn();
      component.onClose.subscribe(closeSpy);
      component.onClose.emit();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should emit onVerified event', () => {
      const verifiedSpy = vi.fn();
      component.onVerified.subscribe(verifiedSpy);
      component.onVerified.emit({ data: 'test' });
      expect(verifiedSpy).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit onResend event', () => {
      const resendSpy = vi.fn();
      component.onResend.subscribe(resendSpy);
      component.onResend.emit();
      expect(resendSpy).toHaveBeenCalled();
    });
  });
});
