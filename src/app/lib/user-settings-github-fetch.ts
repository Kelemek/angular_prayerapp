import type { UserSettingsFacade } from './user-settings-facade';

export async function runUserSettingsGitHubFeedbackLoad(
  host: UserSettingsFacade,
): Promise<void> {
  try {
    const config = await host.deps.githubFeedbackService.getGitHubConfig();
    host.githubFeedbackEnabled = config?.enabled || false;
    host.markForCheck();
  } catch (err) {
    console.error('Error loading GitHub feedback status:', err);
    host.githubFeedbackEnabled = false;
  }
}
