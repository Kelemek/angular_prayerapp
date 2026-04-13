import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { AdminHelpContentService } from './admin-help-content.service';

describe('AdminHelpContentService', () => {
  let service: AdminHelpContentService;

  beforeEach(() => {
    service = new AdminHelpContentService();
  });

  it('getSections emits default sections including email subscribers overview', async () => {
    const sections = await firstValueFrom(service.getSections());
    const ids = sections.map((s) => s.id);
    expect(ids).toContain('admin_help_email_subscribers_overview');
    expect(ids).toContain('admin_help_email_subscribers');
    expect(ids).toContain('admin_help_prompts_and_types');
    const overview = sections.find((s) => s.id === 'admin_help_email_subscribers_overview');
    expect(overview?.title).toContain('Email Subscribers');
    expect(overview?.order).toBe(1);
  });
});
