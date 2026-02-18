import { Injectable } from '@angular/core';
import { Capacitor, CapacitorException } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { ToastService } from './toast.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class CapacitorService {
  private pushTokenSubject = new BehaviorSubject<PushNotificationToken | null>(null);
  public pushToken$ = this.pushTokenSubject.asObservable();

  private isNativeApp = Capacitor.isNativePlatform();
  private currentPlatform = Capacitor.getPlatform();

  constructor(private toastService: ToastService) {
    if (this.isNativeApp) {
      this.initializeCapacitor();
    }
  }

  /**
   * Initialize Capacitor and platform-specific features
   */
  async initializeCapacitor(): Promise<void> {
    try {
      console.log(`Initializing Capacitor on ${this.currentPlatform}`);
      
      if (this.currentPlatform === 'ios' || this.currentPlatform === 'android') {
        await this.setupPushNotifications();
      }
    } catch (error) {
      console.error('Error initializing Capacitor:', error);
      this.toastService.error('Failed to initialize push notifications');
    }
  }

  /**
   * Set up push notifications for the app
   */
  private async setupPushNotifications(): Promise<void> {
    try {
      // Request notification permissions
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register with push notifications
        await PushNotifications.register();

        // Listen for the registration token
        PushNotifications.addListener(
          'registration',
          (token) => {
            const pushToken: PushNotificationToken = {
              token: token.value,
              platform: this.currentPlatform as 'ios' | 'android'
            };
            this.pushTokenSubject.next(pushToken);
            console.log('Push token received:', token.value);
            
            // You would typically send this token to your backend
            // to store it for sending push notifications to this device
            this.storePushToken(pushToken);
          }
        );

        // Listen for push notifications when the app is in the foreground
        PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            console.log('Push notification received:', notification);
            
            // Handle the notification
            this.handlePushNotification(notification);
          }
        );

        // Listen for push notifications when the app is opened from a notification
        PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action: ActionPerformed) => {
            console.log('Push notification action performed:', action);
            
            // Handle notification tap/action
            this.handlePushNotificationAction(action);
          }
        );

        // Create notification channels for Android
        if (this.currentPlatform === 'android') {
          await this.createAndroidNotificationChannels();
        }
      } else {
        console.warn('Notification permissions not granted');
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }

  /**
   * Create Android notification channels (required for Android 8+)
   */
  private async createAndroidNotificationChannels(): Promise<void> {
    try {
      // Create channels by calling createChannel for each
      const prayersChannel = {
        id: 'prayers',
        name: 'Prayer Updates',
        description: 'Notifications about prayer updates',
        importance: 2,
        sound: 'default',
        vibration: true,
        lightColor: '#39704D'
      };

      const remindersChannel = {
        id: 'reminders',
        name: 'Reminders',
        description: 'Prayer reminders and notifications',
        importance: 4,
        sound: 'default',
        vibration: true,
        lightColor: '#39704D'
      };

      await PushNotifications.createChannel(prayersChannel as any);
      await PushNotifications.createChannel(remindersChannel as any);
      
      console.log('Android notification channels created');
    } catch (error) {
      console.error('Error creating Android notification channels:', error);
    }
  }

  /**
   * Handle incoming push notification when app is in foreground
   */
  private handlePushNotification(notification: PushNotificationSchema): void {
    const title = notification.title || 'Prayer App';
    const body = notification.body || 'You have a new notification';
    
    // Show toast notification
    this.toastService.success(body);

    // You can emit events or navigate based on notification data
    if (notification.data) {
      console.log('Notification data:', notification.data);
    }
  }

  /**
   * Handle push notification action (when user taps the notification)
   */
  private handlePushNotificationAction(action: ActionPerformed): void {
    console.log('User interacted with push notification:', action);

    const notification = action.notification;
    
    // Navigate based on notification data
    if (notification.data?.type === 'prayer_update') {
      // Navigate to prayer details
      console.log('Navigate to prayer:', notification.data.prayerId);
    } else if (notification.data?.type === 'reminder') {
      // Handle reminder
      console.log('Handle reminder:', notification.data.reminderId);
    }
  }

  /**
   * Store push token locally and send to backend
   */
  private storePushToken(pushToken: PushNotificationToken): void {
    // Store in localStorage for reference
    localStorage.setItem(
      'push_notification_token',
      JSON.stringify(pushToken)
    );

    // TODO: Send to your backend to store for this device
    // This would be done via your push-notification service
  }

  /**
   * Get the current push notification token
   */
  getPushToken(): PushNotificationToken | null {
    return this.pushTokenSubject.value;
  }

  /**
   * Check if running as a native app
   */
  isNative(): boolean {
    return this.isNativeApp;
  }

  /**
   * Get current platform ('ios', 'android', 'web', etc.)
   */
  getPlatform(): string {
    return this.currentPlatform;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    PushNotifications.removeAllListeners();
  }
}
