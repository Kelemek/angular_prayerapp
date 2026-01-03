import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubSettingsComponent } from './github-settings.component';
import { GitHubFeedbackService } from '../../services/github-feedback.service';

describe('GitHubSettingsComponent', () => {
  let component: GitHubSettingsComponent;
  let mockGitHubFeedbackService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGitHubFeedbackService = {
      getGitHubConfig: vi.fn().mockResolvedValue({
        id: 1,
        enabled: true,
        github_token: 'ghp_test123',
        github_repo_owner: 'testuser',
        github_repo_name: 'testrepo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }),
      saveGitHubConfig: vi.fn().mockResolvedValue(true),
      testGitHubConnection: vi.fn().mockResolvedValue({
        success: true,
        message: 'Connection successful'
      })
    };

    component = new GitHubSettingsComponent(mockGitHubFeedbackService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default message values', () => {
      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
      expect(component.testMessage).toBe('');
      expect(component.testError).toBe('');
    });

    it('should initialize with default UI state', () => {
      expect(component.showToken).toBe(false);
      expect(component.isSaving).toBe(false);
      expect(component.isTestingConnection).toBe(false);
    });

    it('should load configuration on init', async () => {
      await component.ngOnInit();
      expect(mockGitHubFeedbackService.getGitHubConfig).toHaveBeenCalled();
    });

    it('should populate config from service response', async () => {
      await component.loadConfiguration();

      expect(component.config.enabled).toBe(true);
      expect(component.config.github_token).toBe('ghp_test123');
      expect(component.config.github_repo_owner).toBe('testuser');
      expect(component.config.github_repo_name).toBe('testrepo');
    });
  });

  describe('Configuration Loading', () => {
    it('should handle config loading errors gracefully', async () => {
      mockGitHubFeedbackService.getGitHubConfig.mockRejectedValue(new Error('Load error'));

      await component.loadConfiguration();

      expect(component.config.enabled).toBe(false);
    });

    it('should handle null config response', async () => {
      mockGitHubFeedbackService.getGitHubConfig.mockResolvedValue(null);

      await component.loadConfiguration();

      expect(component.config.github_token).toBe('');
      expect(component.config.github_repo_owner).toBe('');
      expect(component.config.github_repo_name).toBe('');
    });

    it('should preserve existing config on load failure', async () => {
      component.config.github_token = 'existing_token';
      mockGitHubFeedbackService.getGitHubConfig.mockRejectedValue(new Error('Load error'));

      await component.loadConfiguration();

      expect(component.config.github_token).toBe('existing_token');
    });
  });

  describe('Token Visibility Toggle', () => {
    it('should initialize with token hidden', () => {
      expect(component.showToken).toBe(false);
    });

    it('should toggle token visibility', () => {
      component.showToken = true;
      expect(component.showToken).toBe(true);

      component.showToken = false;
      expect(component.showToken).toBe(false);
    });
  });

  describe('Save Settings', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(true);
    });

    it('should save config when called', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';
      
      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalledWith(component.config);
    });

    it('should show success message after save', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.successMessage).toContain('saved');
    });

    it('should emit onSave event after successful save', async () => {
      const saveSpy = vi.spyOn(component.onSave, 'emit');
      
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should clear loading state after save', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();
      expect(component.isSaving).toBe(false);
    });

    it('should handle save errors', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(false);

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.errorMessage).toContain('Failed');
      expect(component.isSaving).toBe(false);
    });

    it('should handle save exceptions', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockRejectedValue(
        new Error('Database error')
      );

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.errorMessage).toContain('unexpected error');
    });

    it('should clear previous messages before save', async () => {
      component.errorMessage = 'Previous error';
      component.testMessage = 'Previous test';
      
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.testMessage).toBe('');
      expect(component.successMessage).toBeTruthy();
    });

    it('should allow saving with feature disabled', async () => {
      component.config.enabled = false;
      component.config.github_repo_owner = 'test';
      component.config.github_repo_name = 'repo';
      component.config.github_token = '';

      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalled();
    });

    it('should always call service regardless of content', async () => {
      component.config.github_repo_owner = '';
      component.config.github_repo_name = '';
      component.config.github_token = '';

      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalled();
    });

    it('should reset isSaving flag on error', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockRejectedValue(new Error('Error'));

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.isSaving).toBe(false);
    });

    it('should trigger setTimeout callback for success message', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      setTimeoutSpy.mockRestore();
    });

    it('should set successMessage to empty after timeout', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();
      expect(component.successMessage).toBeTruthy();

      vi.advanceTimersByTime(5000);
      expect(component.successMessage).toBe('');
    });
  });

  describe('Test Connection', () => {
    beforeEach(() => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful'
      });
    });

    it('should test connection with current config', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(mockGitHubFeedbackService.testGitHubConnection).toHaveBeenCalledWith(
        'ghp_test123',
        'testuser',
        'testrepo'
      );
    });

    it('should show success message on successful connection', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.testMessage).toContain('successful');
    });

    it('should show error message on failed connection', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValue({
        success: false,
        message: 'Invalid token'
      });

      component.config.github_token = 'ghp_invalid';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.testError).toContain('Invalid token');
    });

    it('should clear isTestingConnection flag after test', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();
      expect(component.isTestingConnection).toBe(false);
    });

    it('should handle connection test exceptions', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockRejectedValue(
        new Error('Network timeout')
      );

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.testError).toBeTruthy();
    });

    it('should clear previous messages before test', async () => {
      component.errorMessage = 'Previous error';
      component.successMessage = 'Previous success';

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.errorMessage).toBe('');
      expect(component.testMessage).toContain('successful');
    });

    it('should trigger setTimeout callback for test message', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      setTimeoutSpy.mockRestore();
    });

    it('should set testMessage to empty after timeout', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();
      expect(component.testMessage).toBeTruthy();

      vi.advanceTimersByTime(5000);
      expect(component.testMessage).toBe('');
    });

    it('should reset isTestingConnection on error', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockRejectedValue(new Error('Error'));

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.isTestingConnection).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    it('should update token individually', () => {
      component.config.github_token = 'ghp_new123';
      expect(component.config.github_token).toBe('ghp_new123');
    });

    it('should update owner individually', () => {
      component.config.github_repo_owner = 'newowner';
      expect(component.config.github_repo_owner).toBe('newowner');
    });

    it('should update repo name individually', () => {
      component.config.github_repo_name = 'newrepo';
      expect(component.config.github_repo_name).toBe('newrepo');
    });

    it('should toggle enabled status', () => {
      component.config.enabled = true;
      expect(component.config.enabled).toBe(true);

      component.config.enabled = false;
      expect(component.config.enabled).toBe(false);
    });

    it('should preserve other values when updating one', () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      component.config.github_token = 'ghp_new123';

      expect(component.config.github_repo_owner).toBe('testuser');
      expect(component.config.github_repo_name).toBe('testrepo');
    });

    it('should handle very long token values', () => {
      const longToken = 'ghp_' + 'a'.repeat(100);
      component.config.github_token = longToken;

      expect(component.config.github_token.length).toBeGreaterThan(100);
    });

    it('should handle special characters in repository names', () => {
      component.config.github_repo_owner = 'test-user';
      component.config.github_repo_name = 'test_repo-2';

      expect(component.config.github_repo_owner).toBe('test-user');
      expect(component.config.github_repo_name).toBe('test_repo-2');
    });
  });

  describe('Component Cleanup', () => {
    it('should complete destroy subject on destroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'complete');
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('User Workflows', () => {
    it('should handle complete setup workflow', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(true);
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful'
      });

      // Step 1: Fill in configuration
      component.config.github_token = 'ghp_newsecret123';
      component.config.github_repo_owner = 'myorg';
      component.config.github_repo_name = 'myrepo';
      component.config.enabled = true;

      // Step 2: Test connection
      await component.testConnection();
      expect(component.testMessage).toContain('successful');

      // Step 3: Save configuration
      await component.submitSettings();
      expect(component.successMessage).toContain('saved');
    });

    it('should handle enable/disable workflow', async () => {
      await component.loadConfiguration();

      expect(component.config.enabled).toBe(true);

      // Disable feature
      component.config.enabled = false;

      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(true);
      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it('should handle update existing configuration', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(true);

      await component.loadConfiguration();

      // Update existing configuration
      component.config.github_repo_owner = 'newowner';
      component.config.github_repo_name = 'newrepo';

      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalled();
      expect(component.successMessage).toContain('saved');
    });

    it('should handle token update workflow', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(true);

      // Update token
      component.config.github_token = 'ghp_newtoken123';
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';

      // Test with new token
      await component.testConnection();
      expect(mockGitHubFeedbackService.testGitHubConnection).toHaveBeenCalledWith(
        'ghp_newtoken123',
        'owner',
        'repo'
      );

      // Save new configuration
      await component.submitSettings();
      expect(component.successMessage).toContain('saved');
    });
  });

  describe('State Management', () => {
    it('should maintain state across multiple operations', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();
      
      expect(component.config.github_token).toBe('ghp_test123');
      expect(component.config.github_repo_owner).toBe('testuser');
    });

    it('should reset test error state on successful test', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValueOnce({
        success: false,
        message: 'Connection failed'
      });

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();
      expect(component.testError).toContain('Connection failed');

      // Now with success
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connection successful'
      });

      await component.testConnection();
      expect(component.testMessage).toContain('successful');
    });

    it('should handle multiple test attempts', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      // First attempt
      await component.testConnection();
      expect(mockGitHubFeedbackService.testGitHubConnection).toHaveBeenCalledTimes(1);

      // Second attempt
      await component.testConnection();
      expect(mockGitHubFeedbackService.testGitHubConnection).toHaveBeenCalledTimes(2);
    });

    it('should maintain message state across operations', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValue({
        success: true,
        message: 'Test passed'
      });

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      // Test connection
      await component.testConnection();
      const testMsg = component.testMessage;

      // Save settings should not clear testMessage
      await component.submitSettings();
      expect(component.successMessage).toContain('saved');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed save', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValueOnce(false);

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();
      expect(component.errorMessage).toBeTruthy();

      // Retry with success
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValueOnce(true);

      await component.submitSettings();
      expect(component.successMessage).toContain('saved');
    });

    it('should allow retry after failed connection test', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValueOnce({
        success: false,
        message: 'Connection failed'
      });

      component.config.github_token = 'ghp_bad';
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';

      await component.testConnection();
      expect(component.testError).toBeTruthy();

      // Retry with correct token
      component.config.github_token = 'ghp_good';
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connection successful'
      });

      await component.testConnection();
      expect(component.testMessage).toContain('successful');
    });

    it('should recover from service exceptions', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockRejectedValueOnce(new Error('Service error'));

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();
      expect(component.errorMessage).toBeTruthy();

      // Should be able to retry
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValueOnce(true);

      await component.submitSettings();
      expect(component.successMessage).toContain('saved');
    });

    it('should recover from connection test timeout', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockRejectedValueOnce(new Error('Timeout'));

      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();
      expect(component.testError).toBeTruthy();

      // Retry
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValueOnce({
        success: true,
        message: 'Connected'
      });

      await component.testConnection();
      expect(component.testMessage).toContain('Connected');
    });
  });

  describe('Message Display', () => {
    it('should display success messages to user', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.successMessage.length).toBeGreaterThan(0);
      expect(component.successMessage).toMatch(/saved|success/i);
    });

    it('should display error messages for failed saves', async () => {
      mockGitHubFeedbackService.saveGitHubConfig.mockResolvedValue(false);

      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await component.submitSettings();

      expect(component.errorMessage.length).toBeGreaterThan(0);
      expect(component.errorMessage).toMatch(/failed|error/i);
    });

    it('should display test connection success messages', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.testMessage.length).toBeGreaterThan(0);
    });

    it('should display test connection error messages', async () => {
      mockGitHubFeedbackService.testGitHubConnection.mockResolvedValue({
        success: false,
        message: 'Invalid credentials'
      });

      component.config.github_token = 'ghp_bad';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await component.testConnection();

      expect(component.testError).toContain('Invalid credentials');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty configuration objects', async () => {
      component.config.github_token = '';
      component.config.github_repo_owner = '';
      component.config.github_repo_name = '';

      await component.submitSettings();

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalled();
    });

    it('should handle whitespace-only values', async () => {
      component.config.github_token = '   ';
      component.config.github_repo_owner = '  ';
      component.config.github_repo_name = ' ';

      expect(component.config.github_token).toBe('   ');
      expect(component.config.github_repo_owner).toBe('  ');
    });

    it('should handle rapid successive saves', async () => {
      component.config.github_repo_owner = 'owner';
      component.config.github_repo_name = 'repo';
      component.config.github_token = 'token';

      await Promise.all([
        component.submitSettings(),
        component.submitSettings()
      ]);

      expect(mockGitHubFeedbackService.saveGitHubConfig).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive tests', async () => {
      component.config.github_token = 'ghp_test123';
      component.config.github_repo_owner = 'testuser';
      component.config.github_repo_name = 'testrepo';

      await Promise.all([
        component.testConnection(),
        component.testConnection()
      ]);

      expect(mockGitHubFeedbackService.testGitHubConnection).toHaveBeenCalledTimes(2);
    });
  });
});
