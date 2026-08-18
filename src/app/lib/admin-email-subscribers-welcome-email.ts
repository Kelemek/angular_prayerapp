export interface EmailSubscriberWelcomeEmailHost {
  closeWelcomeEmailDialog(): void;
}

export async function sendEmailSubscriberWelcomeEmail(
  adminDataService: {
    sendSubscriberWelcomeEmail(email: string): Promise<void>;
  },
  toast: { success(message: string): void; error(message: string): void },
  host: EmailSubscriberWelcomeEmailHost | undefined,
  pendingEmail: string,
): Promise<{ sent: boolean; clearPending: boolean; hideAddForm: boolean }> {
  if (!pendingEmail) {
    return { sent: false, clearPending: false, hideAddForm: false };
  }

  try {
    await adminDataService.sendSubscriberWelcomeEmail(pendingEmail);
    toast.success('Welcome email sent to subscriber');
    host?.closeWelcomeEmailDialog();
    return { sent: true, clearPending: true, hideAddForm: true };
  } catch (error: unknown) {
    console.error('Error sending welcome email:', error);
    toast.error('Failed to send welcome email');
    return { sent: false, clearPending: false, hideAddForm: false };
  }
}

export function declineEmailSubscriberWelcomeEmail(
  host: EmailSubscriberWelcomeEmailHost | undefined,
): { clearPending: true; hideAddForm: true } {
  host?.closeWelcomeEmailDialog();
  return { clearPending: true, hideAddForm: true };
}
