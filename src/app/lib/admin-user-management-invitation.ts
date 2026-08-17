import type { EmailNotificationService } from '../services/email-notification.service';

export async function sendAdminInvitationEmail(
  emailService: EmailNotificationService,
  email: string,
  name: string,
): Promise<void> {
  const template = await emailService.getTemplate('admin_invitation');
  const appUrl = emailService.getEmailBaseUrl();
  const adminLink = `${appUrl}/admin`;

  let subject: string;
  let htmlBody: string;
  let textBody: string;

  if (template) {
    const variables = { name, email, adminLink };
    subject = emailService.applyTemplateVariables(template.subject, variables);
    htmlBody = emailService.applyTemplateVariables(
      template.html_body,
      variables,
    );
    textBody = emailService.applyTemplateVariables(
      template.text_body,
      variables,
    );
  } else {
    console.warn(
      'admin_invitation template not found in database, using fallback',
    );
    subject = 'Admin Access Granted - Prayer App';
    htmlBody = buildFallbackInvitationHtml(name, email, adminLink);
    textBody = buildFallbackInvitationText(name, email, adminLink);
  }

  await emailService.sendEmail({
    to: email,
    subject,
    htmlBody,
    textBody,
  });
}

function buildFallbackInvitationHtml(
  name: string,
  email: string,
  adminLink: string,
): string {
  return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🙏 Prayer App</h1>
                  <p style="margin: 10px 0 0 0;">Admin Access Granted</p>
                </div>
                <div class="content">
                  <h2>Welcome, ${name}!</h2>
                  <p>You've been granted admin access to the Prayer App. As an admin, you can:</p>
                  <ul>
                    <li>Review and approve prayer requests</li>
                    <li>Manage prayer updates and deletions</li>
                    <li>Configure email settings and subscribers</li>
                    <li>Manage prayer prompts and types</li>
                    <li>Access the full admin portal</li>
                  </ul>
                  
                  <p>To sign in to the admin portal:</p>
                  <ol>
                    <li>Go to the admin login page link at the bottom of the main site</li>
                    <li>Enter your email address: <strong>${email}</strong></li>
                    <li>Click "Send Magic Link"</li>
                    <li>Check your email for the secure sign-in link</li>
                  </ol>
                  
                  <div style="text-align: center;">
                    <a href="${adminLink}" class="button">Go to Admin Portal</a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    <strong>Note:</strong> Prayer App uses passwordless authentication. You'll receive a magic link via email each time you sign in.
                  </p>
                </div>
                <div class="footer">
                  <p>Prayer App Admin Portal</p>
                </div>
              </div>
            </body>
          </html>
        `;
}

function buildFallbackInvitationText(
  name: string,
  email: string,
  adminLink: string,
): string {
  return `
Welcome to Prayer App Admin Portal!

Hi ${name},

You've been granted admin access to the Prayer App.

To sign in:
1. Go to ${adminLink}
2. Enter your email: ${email}
3. Click "Send Magic Link"
4. Check your email for the sign-in link

Prayer App uses passwordless authentication for security.

---
Prayer App Admin Portal
        `;
}
