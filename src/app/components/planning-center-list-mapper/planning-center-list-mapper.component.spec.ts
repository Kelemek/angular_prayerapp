import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlanningCenterListMapperComponent } from './planning-center-list-mapper.component';
import { ChangeDetectorRef } from '@angular/core';

// Mock the fetchPlanningCenterLists function
vi.mock('../../../lib/planning-center', () => ({
  fetchPlanningCenterLists: vi.fn().mockResolvedValue({
    lists: [
      { id: 'list-1', name: 'Sunday Service', description: 'Main service attendees' },
      { id: 'list-2', name: 'Prayer Team', description: 'Prayer warriors' }
    ]
  })
}));

describe('PlanningCenterListMapperComponent', () => {
  let component: PlanningCenterListMapperComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockCdr: any;

  const createMockSupabaseClient = () => ({
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined },
              { id: '2', name: 'Jane Smith', email: 'jane@example.com', planning_center_list_id: 'list-1' }
            ],
            error: null
          })
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        }))
      }))
    }
  });

  beforeEach(() => {
    mockSupabaseService = createMockSupabaseClient();

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockCdr = {
      markForCheck: vi.fn()
    };

    component = new PlanningCenterListMapperComponent(
      mockSupabaseService,
      mockToastService,
      mockCdr as ChangeDetectorRef
    );
  });

  describe('ngOnInit', () => {
    it('should load subscribers and lists on init', async () => {
      const loadSubscribersAndListsSpy = vi.spyOn(component, 'loadSubscribersAndLists');

      component.ngOnInit();

      expect(loadSubscribersAndListsSpy).toHaveBeenCalled();
    });
  });

  describe('loadSubscribersAndLists', () => {
    it('should load lists before subscribers', async () => {
      const loadListsSpy = vi.spyOn(component, 'loadLists');
      const loadSubscribersSpy = vi.spyOn(component, 'loadSubscribers');

      await component.loadSubscribersAndLists();

      expect(loadListsSpy).toHaveBeenCalled();
      expect(loadSubscribersSpy).toHaveBeenCalled();
    });
  });

  describe('loadSubscribers', () => {
    it('should load subscribers successfully', async () => {
      await component.loadSubscribers();

      expect(component.subscribers).toHaveLength(2);
      expect(component.subscribers[0].name).toBe('John Doe');
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should load mappings after loading subscribers', async () => {
      const loadMappingsSpy = vi.spyOn(component, 'loadMappings');

      await component.loadSubscribers();

      expect(loadMappingsSpy).toHaveBeenCalled();
    });

    it('should handle error loading subscribers', async () => {
      mockSupabaseService.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error')
          })
        }))
      }));

      await component.loadSubscribers();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load subscribers');
    });
  });

  describe('loadLists', () => {
    it('should load planning center lists successfully', async () => {
      await component.loadLists();

      expect(component.allLists).toHaveLength(2);
      expect(component.filteredLists).toHaveLength(2);
      expect(component.loadingLists).toBe(false);
    });

    it('should set loading state during load', async () => {
      const promise = component.loadLists();
      expect(component.loadingLists).toBe(true);

      await promise;
      expect(component.loadingLists).toBe(false);
    });

    it('should handle error loading lists', async () => {
      const { fetchPlanningCenterLists } = await import('../../../lib/planning-center');
      vi.mocked(fetchPlanningCenterLists).mockResolvedValueOnce({
        error: 'Failed to fetch lists'
      } as any);

      await component.loadLists();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load Planning Center lists');
    });

    it('should call markForCheck during and after load', async () => {
      mockCdr.markForCheck.mockClear();
      await component.loadLists();

      expect(mockCdr.markForCheck).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadMappings', () => {
    it('should create mappings for subscribers with list assignments', async () => {
      component.subscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', planning_center_list_id: 'list-1' }
      ];
      component.allLists = [
        { id: 'list-1', name: 'Sunday Service', description: 'Main service' }
      ];

      component.loadMappings();

      expect(component.mappings).toHaveLength(1);
      expect(component.mappings[0].name).toBe('Jane Smith');
      expect(component.mappings[0].listName).toBe('Sunday Service');
    });

    it('should show "Unknown List" for unmapped list IDs', () => {
      component.subscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: 'missing-list' }
      ];
      component.allLists = [];

      component.loadMappings();

      expect(component.mappings[0].listName).toBe('Unknown List');
    });

    it('should filter out subscribers without list assignments', () => {
      component.subscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined }
      ];

      component.loadMappings();

      expect(component.mappings).toHaveLength(0);
    });
  });

  describe('filterSubscribers', () => {
    beforeEach(async () => {
      component.subscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', planning_center_list_id: undefined }
      ];
    });

    it('should filter subscribers by name', () => {
      component.subscriberSearch = 'John';
      component.filterSubscribers();

      expect(component.filteredSubscribers).toHaveLength(1);
      expect(component.filteredSubscribers[0].name).toBe('John Doe');
    });

    it('should filter subscribers by email', () => {
      component.subscriberSearch = 'jane@';
      component.filterSubscribers();

      expect(component.filteredSubscribers).toHaveLength(1);
      expect(component.filteredSubscribers[0].email).toBe('jane@example.com');
    });

    it('should be case-insensitive', () => {
      component.subscriberSearch = 'JOHN';
      component.filterSubscribers();

      expect(component.filteredSubscribers).toHaveLength(1);
    });

    it('should return empty array when no match', () => {
      component.subscriberSearch = 'nonexistent';
      component.filterSubscribers();

      expect(component.filteredSubscribers).toHaveLength(0);
    });

    it('should return all subscribers on empty search', () => {
      component.subscriberSearch = '';
      component.filterSubscribers();

      expect(component.filteredSubscribers).toHaveLength(2);
    });
  });

  describe('filterLists', () => {
    beforeEach(() => {
      component.allLists = [
        { id: 'list-1', name: 'Sunday Service', description: 'Main service' },
        { id: 'list-2', name: 'Prayer Team', description: 'Prayer warriors' }
      ];
    });

    it('should filter lists by name', () => {
      component.listSearch = 'Sunday';
      component.filterLists();

      expect(component.filteredLists).toHaveLength(1);
      expect(component.filteredLists[0].name).toBe('Sunday Service');
    });

    it('should filter lists by description', () => {
      component.listSearch = 'Prayer';
      component.filterLists();

      expect(component.filteredLists).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      component.listSearch = 'SUNDAY';
      component.filterLists();

      expect(component.filteredLists).toHaveLength(1);
    });

    it('should handle lists without description', () => {
      component.allLists = [
        { id: 'list-1', name: 'No Desc List', description: undefined }
      ];

      component.listSearch = 'something';
      component.filterLists();

      expect(component.filteredLists).toHaveLength(0);
    });

    it('should return all lists on empty search', () => {
      component.listSearch = '';
      component.filterLists();

      expect(component.filteredLists).toHaveLength(2);
    });
  });

  describe('selectSubscriber', () => {
    it('should select subscriber and clear filters', () => {
      const subscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedSubscriber = null;

      component.selectSubscriber(subscriber);

      expect(component.selectedSubscriber).toEqual(subscriber);
      expect(component.subscriberSearch).toBe('John Doe');
      expect(component.filteredSubscribers).toHaveLength(0);
    });

    it('should call markForCheck', () => {
      const subscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      mockCdr.markForCheck.mockClear();

      component.selectSubscriber(subscriber);

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  describe('selectList', () => {
    it('should select list and clear filters', () => {
      const list = { id: 'list-1', name: 'Sunday Service', description: 'Main service' };
      component.selectedList = null;

      component.selectList(list);

      expect(component.selectedList).toEqual(list);
      expect(component.listSearch).toBe('Sunday Service');
      expect(component.filteredLists).toHaveLength(0);
    });

    it('should call markForCheck', () => {
      const list = { id: 'list-1', name: 'Sunday Service', description: 'Main service' };
      mockCdr.markForCheck.mockClear();

      component.selectList(list);

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections and searches', () => {
      component.selectedSubscriber = { id: '1', name: 'John', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedList = { id: 'list-1', name: 'Sunday Service', description: '' };
      component.subscriberSearch = 'John';
      component.listSearch = 'Sunday';

      component.clearSelection();

      expect(component.selectedSubscriber).toBeNull();
      expect(component.selectedList).toBeNull();
      expect(component.subscriberSearch).toBe('');
      expect(component.listSearch).toBe('');
    });

    it('should call markForCheck', () => {
      mockCdr.markForCheck.mockClear();

      component.clearSelection();

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  describe('mapListToSubscriber', () => {
    it('should map list to subscriber successfully', async () => {
      component.selectedSubscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedList = { id: 'list-1', name: 'Sunday Service', description: '' };

      const loadSubscribersSpy = vi.spyOn(component, 'loadSubscribers').mockResolvedValue(undefined);
      const clearSelectionSpy = vi.spyOn(component, 'clearSelection');

      await component.mapListToSubscriber();

      expect(mockToastService.success).toHaveBeenCalled();
      expect(loadSubscribersSpy).toHaveBeenCalled();
      expect(clearSelectionSpy).toHaveBeenCalled();
    });

    it('should emit onSave event', async () => {
      const onSaveSpy = vi.spyOn(component.onSave, 'emit');
      component.selectedSubscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedList = { id: 'list-1', name: 'Sunday Service', description: '' };

      vi.spyOn(component, 'loadSubscribers').mockResolvedValue(undefined);

      await component.mapListToSubscriber();

      expect(onSaveSpy).toHaveBeenCalled();
    });

    it('should do nothing if subscriber is not selected', async () => {
      component.selectedSubscriber = null;
      component.selectedList = { id: 'list-1', name: 'Sunday Service', description: '' };

      await component.mapListToSubscriber();

      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
    });

    it('should do nothing if list is not selected', async () => {
      component.selectedSubscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedList = null;

      await component.mapListToSubscriber();

      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
    });

    it('should set and unset saving state', async () => {
      component.selectedSubscriber = { id: '1', name: 'John Doe', email: 'john@example.com', planning_center_list_id: undefined };
      component.selectedList = { id: 'list-1', name: 'Sunday Service', description: '' };

      vi.spyOn(component, 'loadSubscribers').mockImplementation(async () => {
        expect(component.saving).toBe(true);
      });

      await component.mapListToSubscriber();

      expect(component.saving).toBe(false);
    });
  });

  describe('removeMapping', () => {
    it('should remove mapping successfully', async () => {
      const loadSubscribersSpy = vi.spyOn(component, 'loadSubscribers').mockResolvedValue(undefined);

      await component.removeMapping('1');

      expect(mockToastService.success).toHaveBeenCalledWith('Mapping removed');
      expect(loadSubscribersSpy).toHaveBeenCalled();
    });

    it('should set and unset saving state', async () => {
      vi.spyOn(component, 'loadSubscribers').mockImplementation(async () => {
        expect(component.saving).toBe(true);
      });

      await component.removeMapping('1');

      expect(component.saving).toBe(false);
    });

    it('should call markForCheck during save', async () => {
      mockCdr.markForCheck.mockClear();

      await component.removeMapping('1');

      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });
});
