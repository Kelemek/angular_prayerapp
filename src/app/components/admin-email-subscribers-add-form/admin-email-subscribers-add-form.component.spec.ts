import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEmailSubscribersAddFormComponent } from './admin-email-subscribers-add-form.component';
import { PlanningCenterRestService } from '../../services/planning-center-rest.service';
import { AdminCreatedEmailSubscriberService } from '../../services/admin-created-email-subscriber.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, ApplicationRef } from '@angular/core';

describe('AdminEmailSubscribersAddFormComponent', () => {
  let component: AdminEmailSubscribersAddFormComponent;
  let mockAdminCreatedSubscriber: { ensure: ReturnType<typeof vi.fn> };
  let mockToast: { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn>; detectChanges: ReturnType<typeof vi.fn> };
  let mockAppRef: { tick: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAdminCreatedSubscriber = {
      ensure: vi.fn().mockResolvedValue({
        status: 'created',
        normalizedEmail: 'jane@example.com',
      }),
    };
    mockToast = { error: vi.fn(), info: vi.fn() };
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockAppRef = { tick: vi.fn() };

    const mockPlanningCenterRest = {
      lookupPersonByEmail: vi.fn().mockResolvedValue({ count: 0, people: [] }),
      searchPlanningCenterByName: vi.fn().mockResolvedValue({ people: [], count: 0 }),
    };

    component = new AdminEmailSubscribersAddFormComponent(
      mockPlanningCenterRest as unknown as PlanningCenterRestService,
      mockAdminCreatedSubscriber as unknown as AdminCreatedEmailSubscriberService,
      mockToast as unknown as ToastService,
      mockCdr as unknown as ChangeDetectorRef,
      mockAppRef as unknown as ApplicationRef,
    );
  });

  it('resetForm clears fields', () => {
    component.newName = 'Jane';
    component.resetForm();
    expect(component.newName).toBe('');
    expect(component.pcSearchTab).toBe(false);
  });

  it('handleAddSubscriber rejects empty form', async () => {
    const reportError = vi.fn();
    component.reportError.subscribe(reportError);
    await component.handleAddSubscriber();
    expect(reportError).toHaveBeenCalledWith('Name and email are required');
  });

  it('handleAddSubscriber emits success when subscriber is created', async () => {
    component.newName = 'Jane Doe';
    component.newEmail = 'jane@example.com';
    const subscriberAdded = vi.fn();
    component.subscriberAdded.subscribe(subscriberAdded);

    await component.handleAddSubscriber();

    expect(mockAdminCreatedSubscriber.ensure).toHaveBeenCalledWith('Jane Doe', 'jane@example.com');
    expect(subscriberAdded).toHaveBeenCalledWith({
      email: 'jane@example.com',
      successMessage: 'Subscriber added successfully!',
    });
  });

  it('handleAddSubscriber reports duplicate subscriber', async () => {
    mockAdminCreatedSubscriber.ensure.mockResolvedValue({
      status: 'exists',
      normalizedEmail: 'jane@example.com',
    });
    component.newName = 'Jane Doe';
    component.newEmail = 'jane@example.com';
    const reportError = vi.fn();
    component.reportError.subscribe(reportError);

    await component.handleAddSubscriber();

    expect(reportError).toHaveBeenCalledWith('This email address is already subscribed');
  });

  it('handleAddSubscriber reports invalid email from ensure', async () => {
    mockAdminCreatedSubscriber.ensure.mockResolvedValue({
      status: 'invalid',
      error: 'Please enter a valid email address',
    });
    component.newName = 'Jane Doe';
    component.newEmail = 'bad';
    const reportError = vi.fn();
    component.reportError.subscribe(reportError);

    await component.handleAddSubscriber();

    expect(reportError).toHaveBeenCalledWith('Please enter a valid email address');
  });
});
