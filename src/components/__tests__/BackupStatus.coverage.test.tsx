import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock Supabase
vi.mock('../../lib/supabase', async () => {
  return {
    supabase: { from: vi.fn() },
    directQuery: vi.fn(),
    directMutation: vi.fn()
  };
});

// Import mocked functions after mock definition
import { directQuery, directMutation } from '../../lib/supabase';

// Import component after mocks
import BackupStatus, { resetBackupCache } from '../BackupStatus';

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('BackupStatus - Additional Coverage Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    resetBackupCache();
    mockConfirm.mockReturnValue(true);
    
    // Default mock: successful backup logs fetch
    (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null
    });
    
    (directMutation as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null
    });
  });

  afterEach(async () => {
    await waitFor(() => {});
  });

  describe('Show Less Button Functionality', () => {
    it('collapses full list when Show Less button is clicked', async () => {
      // Create 8 backups (more than the 5 shown by default)
      const mockBackups = Array.from({ length: 8 }, (_, i) => ({
        id: `backup-${i}`,
        backup_date: new Date(Date.now() - i * 86400000).toISOString(),
        status: 'success' as const,
        tables_backed_up: { prayers: 10 },
        total_records: 50,
        duration_seconds: 30,
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }));

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockBackups,
        error: null
      });

      render(<BackupStatus />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/Recent Backups/i)).toBeInTheDocument();
      });

      // Initially shows only 5 backups
      await waitFor(() => {
        expect(screen.getAllByText(/50 records/)).toHaveLength(5);
      });

      // Click Show More to expand
      const showMoreButton = screen.getByText(/Show More/i);
      await user.click(showMoreButton);

      // All 8 backups should be visible
      await waitFor(() => {
        expect(screen.getAllByText(/50 records/)).toHaveLength(8);
        expect(screen.getByText(/Show Less/i)).toBeInTheDocument();
      });

      // Click Show Less to collapse
      const showLessButton = screen.getByText(/Show Less/i);
      await user.click(showLessButton);

      // Should show only 5 backups again
      await waitFor(() => {
        expect(screen.getAllByText(/50 records/)).toHaveLength(5);
        expect(screen.queryByText(/Show Less/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Show More/i)).toBeInTheDocument();
      });
    });

    it('collapses expanded backup details when Show Less is clicked', async () => {
      // Create 8 backups
      const mockBackups = Array.from({ length: 8 }, (_, i) => ({
        id: `backup-${i}`,
        backup_date: new Date(Date.now() - i * 86400000).toISOString(),
        status: 'success' as const,
        tables_backed_up: { prayers: 10 },
        total_records: 50,
        duration_seconds: 30,
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }));

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockBackups,
        error: null
      });

      render(<BackupStatus />);

      await waitFor(() => {
        expect(screen.getByText(/Recent Backups/i)).toBeInTheDocument();
      });

      // Click Show More
      const showMoreButton = screen.getByText(/Show More/i);
      await user.click(showMoreButton);

      await waitFor(() => {
        expect(screen.getByText(/Show Less/i)).toBeInTheDocument();
      });

      // Expand a backup's details
      const backupRows = screen.getAllByText(/50 records/);
      await user.click(backupRows[6]); // Click one of the later backups

      // Verify details are expanded
      await waitFor(() => {
        expect(screen.getByText(/Backup ID/i)).toBeInTheDocument();
      });

      // Click Show Less - should collapse both the list and any expanded details
      const showLessButton = screen.getByText(/Show Less/i);
      await user.click(showLessButton);

      // Expanded details should be gone
      await waitFor(() => {
        expect(screen.queryByText(/Backup ID/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/50 records/)).toHaveLength(5);
      });
    });
  });

  describe('Restore File Selection Cancellation', () => {
    it('clears file input when user cancels restore confirmation', async () => {
      // Need at least one backup so the restore button is visible
      const mockBackup = {
        id: 'backup-1',
        backup_date: new Date().toISOString(),
        status: 'success' as const,
        tables_backed_up: { prayers: 10 },
        total_records: 50,
        duration_seconds: 30,
        created_at: new Date().toISOString()
      };

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockBackup],
        error: null
      });

      render(<BackupStatus />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/Database Backup Status/i)).toBeInTheDocument();
      });

      // Click the Restore button to open the dialog
      const restoreButton = screen.getByRole('button', { name: /Restore/i });
      await user.click(restoreButton);

      // Wait for the restore dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Restore Database from Backup/i)).toBeInTheDocument();
      });

      // Mock confirm to return false (user cancels)
      mockConfirm.mockReturnValue(false);

      // Find the file input
      const fileInput = screen.getByLabelText(/Select backup file/i) as HTMLInputElement;

      // Create a mock file
      const mockFile = new File(['{"data": "test"}'], 'backup.json', { type: 'application/json' });

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true,
        configurable: true
      });

      // Trigger the change event
      fireEvent.change(fileInput);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
      });

      // File input value should be cleared
      expect(fileInput.value).toBe('');
    });
  });

  describe('Failed Backup Status Display', () => {
    it('displays failed status with red styling', async () => {
      const failedBackup = {
        id: 'failed-backup-1',
        backup_date: new Date().toISOString(),
        status: 'failed' as const,
        tables_backed_up: {},
        total_records: 0,
        error_message: 'Database connection failed',
        duration_seconds: 5,
        created_at: new Date().toISOString()
      };

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [failedBackup],
        error: null
      });

      render(<BackupStatus />);

      // Wait for the backup to be displayed
      await waitFor(() => {
        expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
      });

      // Verify the status badge has the red/error styling
      const statusBadge = screen.getByText(/FAILED/i);
      expect(statusBadge.className).toContain('text-red');
    });

    it('displays error message when failed backup is expanded', async () => {
      const failedBackup = {
        id: 'failed-backup-1',
        backup_date: new Date().toISOString(),
        status: 'failed' as const,
        tables_backed_up: {},
        total_records: 0,
        error_message: 'Database connection failed',
        duration_seconds: 5,
        created_at: new Date().toISOString()
      };

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [failedBackup],
        error: null
      });

      render(<BackupStatus />);

      await waitFor(() => {
        expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
      });

      // Click to expand the backup details
      const failedText = screen.getByText(/FAILED/i);
      await user.click(failedText);

      // Error message heading should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Error Message/i)).toBeInTheDocument();
      });

      // And the error box should contain the error message text
      const errorBox = screen.getByText(/Error Message/i).parentElement;
      expect(errorBox).not.toBeNull();
      expect(errorBox!.textContent).toContain('Database connection failed');
    });
  });

  describe('In-Progress Backup Status', () => {
    it('displays in-progress status with yellow styling', async () => {
      const inProgressBackup = {
        id: 'in-progress-backup-1',
        backup_date: new Date().toISOString(),
        status: 'in_progress' as const,
        tables_backed_up: {},
        total_records: 0,
        created_at: new Date().toISOString()
      };

      (directQuery as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [inProgressBackup],
        error: null
      });

      render(<BackupStatus />);

      // Wait for the backup to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Database Backup Status/i)).toBeInTheDocument();
      });

      // Click to expand the backup details to see the status badge
      const backupRow = screen.getByText(/0 records/);
      await user.click(backupRow);

      // Status badge should be displayed in expanded view
      await waitFor(() => {
        expect(screen.getByText(/IN_PROGRESS/i)).toBeInTheDocument();
      });

      // Verify the status badge has yellow/warning styling
      const statusBadge = screen.getByText(/IN_PROGRESS/i);
      expect(statusBadge.className).toContain('yellow');
    });
  });
});
