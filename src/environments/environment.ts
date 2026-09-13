export const environment = {
  production: false,
  supabaseUrl: 'https://jcdhajfqtzipltvfslhu.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGhhamZxdHppcGx0dmZzbGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTQ4NzQsImV4cCI6MjA4NDY3MDg3NH0.WCI8N1LWww5PKdotig0GtVWJ5H8KzZkTpvfgJaLu9zw',
  /** PostHog project API key (Project Settings). Leave empty to disable client analytics. */
  posthogKey: 'phc_yHQ8kxtRqbz2sdQXmcbh3rdoHyyoe9Ceco3BCT2Uu7H8',
  posthogHost: 'https://t.cp-church.org',
  posthogUiHost: 'https://us.posthog.com',
  /** Public URL for links in emails (e.g. https://yourdomain.com). Leave empty to use current origin. Required for native/Capacitor so links are not capacitor://localhost. */
  appUrl: 'http://localhost:4200',
  /** In-app Settings → Send Feedback (Notion via submit-feedback). False in prod until function + NOTION_TOKEN are deployed there. */
  inAppFeedbackEnabled: true,
};
