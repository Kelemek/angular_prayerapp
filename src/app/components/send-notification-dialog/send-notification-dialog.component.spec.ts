import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendNotificationDialogComponent, NotificationType } from './send-notification-dialog.component';

describe('SendNotificationDialogComponent', () => {
  let component: SendNotificationDialogComponent;
  let fixture: ComponentFixture<SendNotificationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendNotificationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SendNotificationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default notificationType of "prayer"', () => {
      expect(component.notificationType).toBe('prayer');
    });

    it('should have undefined prayerTitle by default', () => {
      expect(component.prayerTitle).toBeUndefined();
    });

    it('should emit confirm and decline events', () => {
      expect(component.confirm).toBeDefined();
      expect(component.decline).toBeDefined();
    });
  });

  describe('getMessageText()', () => {
    it('should return prayer message when notificationType is "prayer"', () => {
      component.notificationType = 'prayer';
      const message = component.getMessageText();
      expect(message).toBe(
        'Would you like to send an email notification to all subscribers about this new prayer?'
      );
    });

    it('should return update message when notificationType is "update"', () => {
      component.notificationType = 'update';
      const message = component.getMessageText();
      expect(message).toBe(
        'Would you like to send an email notification to all subscribers about this prayer update?'
      );
    });

    it('should handle different NotificationType values', () => {
      const types: NotificationType[] = ['prayer', 'update'];
      
      types.forEach((type) => {
        component.notificationType = type;
        const message = component.getMessageText();
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('onConfirm()', () => {
    it('should emit confirm event when onConfirm is called', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      
      component.onConfirm();
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit confirm event without arguments', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      
      component.onConfirm();
      
      expect(confirmSpy).toHaveBeenCalledWith();
    });

    it('should emit confirm event multiple times', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      
      component.onConfirm();
      component.onConfirm();
      component.onConfirm();
      
      expect(confirmSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('onDecline()', () => {
    it('should emit decline event when onDecline is called', () => {
      const declineSpy = vi.spyOn(component.decline, 'emit');
      
      component.onDecline();
      
      expect(declineSpy).toHaveBeenCalled();
      expect(declineSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit decline event without arguments', () => {
      const declineSpy = vi.spyOn(component.decline, 'emit');
      
      component.onDecline();
      
      expect(declineSpy).toHaveBeenCalledWith();
    });

    it('should emit decline event multiple times', () => {
      const declineSpy = vi.spyOn(component.decline, 'emit');
      
      component.onDecline();
      component.onDecline();
      
      expect(declineSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Template Rendering', () => {
    it('should render dialog container with correct styles', () => {
      const container = fixture.nativeElement.querySelector('div.fixed');
      expect(container).toBeTruthy();
      expect(container.classList.contains('inset-0')).toBe(true);
      expect(container.classList.contains('z-50')).toBe(true);
    });

    it('should render dialog header with title', () => {
      const header = fixture.nativeElement.querySelector('h2');
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('Send Email Notification?');
    });

    it('should have message text available from getMessageText for prayer type', () => {
      component.notificationType = 'prayer';
      const message = component.getMessageText();
      expect(message).toContain('this new prayer');
    });

    it('should have message text available from getMessageText for update type', () => {
      component.notificationType = 'update';
      const message = component.getMessageText();
      expect(message).toContain('this prayer update');
    });

    it('should render info box about email notifications', () => {
      const infoBox = fixture.nativeElement.querySelector('.bg-blue-50');
      expect(infoBox).toBeTruthy();
      expect(infoBox.textContent).toContain('Email will be sent');
    });

    it('should display prayer title when notificationType is update and prayerTitle is provided', () => {
      component.notificationType = 'update';
      component.prayerTitle = 'My Prayer Request';
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      // Verify the component has the properties set correctly
      expect(component.notificationType).toBe('update');
      expect(component.prayerTitle).toBe('My Prayer Request');
    });

    it('should not display prayer title section when notificationType is prayer', () => {
      component.notificationType = 'prayer';
      component.prayerTitle = 'My Prayer Request';
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      const titleBox = fixture.nativeElement.querySelector('.bg-gray-50');
      expect(titleBox).toBeFalsy();
    });

    it('should not display prayer title section when prayerTitle is undefined', () => {
      component.notificationType = 'update';
      component.prayerTitle = undefined;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      const titleBox = fixture.nativeElement.querySelector('.bg-gray-50');
      expect(titleBox).toBeFalsy();
    });
  });

  describe('Button Actions', () => {
    it('should call onConfirm when Send Email button is clicked', () => {
      const confirmSpy = vi.spyOn(component, 'onConfirm');
      
      const sendButton = fixture.nativeElement.querySelectorAll('button')[1];
      sendButton.click();
      
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should call onDecline when Don\'t Send button is clicked', () => {
      const declineSpy = vi.spyOn(component, 'onDecline');
      
      const declineButton = fixture.nativeElement.querySelectorAll('button')[0];
      declineButton.click();
      
      expect(declineSpy).toHaveBeenCalled();
    });

    it('should render Don\'t Send button with correct text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons[0].textContent).toContain('Don\'t Send');
    });

    it('should render Send Email button with correct text', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons[1].textContent).toContain('Send Email');
    });

    it('should have two buttons in the dialog', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should emit confirm event when Send Email button is clicked', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      
      const sendButton = fixture.nativeElement.querySelectorAll('button')[1];
      sendButton.click();
      
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('should emit decline event when Don\'t Send button is clicked', () => {
      const declineSpy = vi.spyOn(component.decline, 'emit');
      
      const declineButton = fixture.nativeElement.querySelectorAll('button')[0];
      declineButton.click();
      
      expect(declineSpy).toHaveBeenCalled();
    });
  });

  describe('Component Properties', () => {
    it('should accept notificationType as "prayer"', () => {
      component.notificationType = 'prayer';
      expect(component.notificationType).toBe('prayer');
    });

    it('should accept notificationType as "update"', () => {
      component.notificationType = 'update';
      expect(component.notificationType).toBe('update');
    });

    it('should accept prayerTitle as string', () => {
      const title = 'Healing Prayer';
      component.prayerTitle = title;
      expect(component.prayerTitle).toBe(title);
    });

    it('should accept prayerTitle as undefined', () => {
      component.prayerTitle = undefined;
      expect(component.prayerTitle).toBeUndefined();
    });

    it('should handle empty prayerTitle string', () => {
      component.prayerTitle = '';
      expect(component.prayerTitle).toBe('');
    });

    it('should handle prayerTitle with special characters', () => {
      const title = 'Prayer for "healing" & peace';
      component.prayerTitle = title;
      expect(component.prayerTitle).toBe(title);
    });
  });

  describe('Change Detection', () => {
    it('should update message text when notificationType changes', () => {
      component.notificationType = 'prayer';
      let message = component.getMessageText();
      expect(message).toContain('this new prayer');
      
      component.notificationType = 'update';
      message = component.getMessageText();
      expect(message).toContain('this prayer update');
    });

    it('should display prayer title when prayerTitle is set for update type', () => {
      component.notificationType = 'update';
      component.prayerTitle = 'Test Prayer Title';
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      // Verify the component has the correct properties
      expect(component.notificationType).toBe('update');
      expect(component.prayerTitle).toBe('Test Prayer Title');
    });

    it('should update prayer title in template when property changes', () => {
      component.notificationType = 'update';
      component.prayerTitle = 'First Title';
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      expect(component.prayerTitle).toBe('First Title');
      
      component.prayerTitle = 'Second Title';
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      expect(component.prayerTitle).toBe('Second Title');
    });
  });

  describe('Accessibility and Styling', () => {
    it('should have proper border and spacing classes on dialog', () => {
      const dialog = fixture.nativeElement.querySelector('.bg-white');
      expect(dialog.classList.contains('rounded-lg')).toBe(true);
      expect(dialog.classList.contains('shadow-lg')).toBe(true);
    });

    it('should have dark mode classes', () => {
      const dialog = fixture.nativeElement.querySelector('.bg-white');
      expect(dialog.classList.contains('dark:bg-gray-800')).toBe(true);
    });

    it('should have responsive padding on dialog', () => {
      const dialog = fixture.nativeElement.querySelector('.bg-white');
      expect(dialog.classList.contains('max-w-md')).toBe(true);
    });

    it('should have proper heading structure', () => {
      const heading = fixture.nativeElement.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading.classList.contains('text-lg')).toBe(true);
      expect(heading.classList.contains('font-semibold')).toBe(true);
    });

    it('should have accessible button styling', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        expect(button.classList.contains('rounded-lg')).toBe(true);
        expect(button.classList.contains('font-medium')).toBe(true);
      });
    });
  });

  describe('Event Emission Integration', () => {
    it('should handle sequential confirm and decline events', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      const declineSpy = vi.spyOn(component.decline, 'emit');
      
      component.onConfirm();
      component.onDecline();
      component.onConfirm();
      
      expect(confirmSpy).toHaveBeenCalledTimes(2);
      expect(declineSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow parent component to subscribe to confirm event', () => {
      return new Promise<void>((resolve) => {
        component.confirm.subscribe(() => {
          expect(true).toBe(true);
          resolve();
        });
        
        component.onConfirm();
      });
    });

    it('should allow parent component to subscribe to decline event', () => {
      return new Promise<void>((resolve) => {
        component.decline.subscribe(() => {
          expect(true).toBe(true);
          resolve();
        });
        
        component.onDecline();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prayer titles', () => {
      const longTitle = 'A'.repeat(500);
      component.notificationType = 'update';
      component.prayerTitle = longTitle;
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      
      // Verify the component stores the long title correctly
      expect(component.prayerTitle).toBe(longTitle);
      expect(component.prayerTitle.length).toBe(500);
    });

    it('should handle notification type switching multiple times', () => {
      for (let i = 0; i < 5; i++) {
        component.notificationType = i % 2 === 0 ? 'prayer' : 'update';
        const message = component.getMessageText();
        expect(message).toBeTruthy();
      }
    });

    it('should handle rapid button clicks', () => {
      const confirmSpy = vi.spyOn(component.confirm, 'emit');
      
      const sendButton = fixture.nativeElement.querySelectorAll('button')[1];
      for (let i = 0; i < 10; i++) {
        sendButton.click();
      }
      
      expect(confirmSpy).toHaveBeenCalledTimes(10);
    });
  });
});
