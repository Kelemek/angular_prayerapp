export const environment = {
  production: true,
  supabaseUrl: 'https://eqiafsygvfaifhoaewxi.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWFmc3lndmZhaWZob2Fld3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODEzOTgsImV4cCI6MjA3NTk1NzM5OH0.76MX5dp6f1nWb6svjFAKVaSNh_dMdJYasSSsta-j3ys',
  /** PostHog project API key (Project Settings). Set in deployment env (VITE_POSTHOG_KEY). */
  posthogKey: 'phc_yHQ8kxtRqbz2sdQXmcbh3rdoHyyoe9Ceco3BCT2Uu7H8',
  /** First-party reverse proxy for ingestion (see docs/SETUP.md). */
  posthogHost: 'https://t.cp-church.org',
  /** PostHog app URL for toolbar / session replay UI (not proxied). */
  posthogUiHost: 'https://us.posthog.com',
  /** Public URL for links in emails. Set to your deployed web app URL (e.g. https://prayer.yourchurch.org) so email links work from native app and mail clients. */
  appUrl: 'https://cpprayer.cp-church.org',
  /** Set true after deploy submit-feedback + NOTION_TOKEN on the production Supabase project. */
  inAppFeedbackEnabled: false,
};
