import { environment } from '../../environments/environment';

/** Full app URL for feedback context (web or Capacitor + configured appUrl). */
export function getFeedbackPageUrl(pathname: string, href: string): string {
  const path = pathname || '/';
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  const base = (environment.appUrl || '').replace(/\/$/, '');
  if (base) {
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}
