import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <a routerLink="/" class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium mb-8">
          ← Back to app
        </a>

        <h1 class="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 2026</p>

        <div class="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">1. Introduction</h2>
            <p>
              This Privacy Policy describes how the Prayer App ("we," "our," or "the app") collects, uses, and protects
              your information when you use our mobile and web application. The app is used by faith communities to
              manage prayer requests and stay connected. By using the app, you agree to this policy.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">2. Information We Collect</h2>
            <p class="mb-2">We collect the following types of information:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Account and identity:</strong> Email address, name (or display name), and verification codes sent to your email for sign-in.</li>
              <li><strong>Prayer content:</strong> Prayer requests (who or what the prayer is for, details), updates you add, and whether you chose to make a request anonymous.</li>
              <li><strong>Preferences:</strong> Notification settings (email and push), theme preference, and default prayer view.</li>
              <li><strong>Push notifications (mobile app):</strong> If you enable push notifications, we store a device token and your email so we can send you notifications. You can turn this off in Settings.</li>
              <li><strong>Usage:</strong> We record page views and last activity date (for logged-in users) to support basic analytics and activity tracking within the app.</li>
              <li><strong>Optional:</strong> If your organization uses Planning Center, we may link your app account to Planning Center for list mapping; that is configured by your administrators.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">3. How We Use Your Information</h2>
            <p>We use the information to:</p>
            <ul class="list-disc pl-6 space-y-1 mt-2">
              <li>Provide the prayer app (display prayers, manage requests, send notifications).</li>
              <li>Authenticate you and manage your account and preferences.</li>
              <li>Send email and push notifications you have opted into (e.g., new prayers, approvals, admin messages).</li>
              <li>Improve the app (e.g., error reporting and usage analytics—see Third-Party Services below).</li>
              <li>Comply with legal obligations where required.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">4. Who Has Access</h2>
            <p>
              Your prayer content and account information are stored in our database. Administrators of your
              organization (e.g., church staff) can access the data needed to run the app (approve prayers, manage
              subscribers, send notifications). Public prayers you submit (after approval) are visible to other
              logged-in users in your community. Personal prayers are visible only to you. We do not sell your
              personal information.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">5. Third-Party Services</h2>
            <p class="mb-2">The app uses the following third-party services that may process data:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Hosting and database:</strong> Data is stored and processed by our hosting and database provider (e.g., Supabase) in accordance with their privacy and security practices.</li>
              <li><strong>Email:</strong> Email notifications are sent via a trusted email provider (e.g., Microsoft 365).</li>
              <li><strong>Push notifications:</strong> Delivered via Apple (APNs) and Google (FCM) when you use the mobile app.</li>
              <li><strong>Error and analytics:</strong> We may use Sentry for error reporting and Microsoft Clarity or similar tools for usage analytics (e.g., session replay, page usage). These may collect identifiers and usage data to help us fix bugs and improve the app.</li>
            </ul>
            <p class="mt-2">
              Each of these providers has its own privacy policy. We choose providers that are committed to
              protecting user data.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">6. Data Retention and Security</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the service and
              comply with legal obligations. You can ask your organization’s administrators to delete your account
              and associated data. We use industry-standard security measures (e.g., encryption in transit and at
              rest, access controls) to protect your data.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">7. Your Choices</h2>
            <ul class="list-disc pl-6 space-y-1">
              <li>You can turn off <strong>email notifications</strong> and <strong>push notifications</strong> in the app Settings.</li>
              <li>You can choose to make a prayer request <strong>anonymous</strong> so your name is not shown publicly.</li>
              <li>You can use <strong>personal prayers</strong> for private requests that are not shared with the community.</li>
              <li>For access, correction, or deletion of your data, contact your organization’s administrators or the contact below.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">8. Children</h2>
            <p>
              The app is not directed at children under 13. We do not knowingly collect personal information from
              children under 13. If you believe we have collected such information, please contact us so we can
              delete it.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated policy in the app and
              update the "Last updated" date. Continued use of the app after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold mt-6 mb-2">10. Contact</h2>
            <p>
              For privacy-related questions or requests, contact the organization that operates this Prayer App
              (e.g., your church or ministry). You can also reach out through the contact information provided in
              the app or on your organization’s website.
            </p>
          </section>
        </div>

        <a routerLink="/" class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium mt-10">
          ← Back to app
        </a>
      </div>
    </div>
  `,
  styles: []
})
export class PrivacyComponent {}
