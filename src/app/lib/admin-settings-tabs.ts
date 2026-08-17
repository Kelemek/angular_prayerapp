export type AdminSettingsTab = 'analytics' | 'email' | 'content' | 'tools' | 'security';

export interface AdminSettingsTabDef {
  id: AdminSettingsTab;
  label: string;
  /** Stable id for help tours / driver.js anchors. */
  domId?: string;
}

export const ADMIN_SETTINGS_TABS: readonly AdminSettingsTabDef[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'content', label: 'Content', domId: 'admin-settings-tab-content' },
  { id: 'email', label: 'Email', domId: 'admin-settings-tab-email' },
  { id: 'tools', label: 'Tools', domId: 'admin-settings-tab-tools' },
  { id: 'security', label: 'Security' },
];
