import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { PromptService } from './prompt.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

describe('PromptService', () => {
  let service: PromptService;
  let mockSupabaseService: any;
  let mockToastService: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock ToastService
    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    // Mock SupabaseService with default responses
    mockSupabaseService = {
      client: {
        from: vi.fn((table: string) => {
          if (table === 'prayer_types') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: [
                      { name: 'Healing', display_order: 1 },
                      { name: 'Guidance', display_order: 2 },
                    ],
                    error: null
                  }))
                }))
              }))
            };
          } else if (table === 'prayer_prompts') {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    { id: '1', type: 'Healing', title: 'Test Prompt', created_at: '2024-01-01' },
                    { id: '2', type: 'Guidance', title: 'Test Prompt 2', created_at: '2024-01-02' },
                  ],
                  error: null
                }))
              })),
              insert: vi.fn(() => Promise.resolve({ error: null })),
              update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
              })),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
              }))
            };
          }
          return {
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
            delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
          };
        })
      }
    };

    service = new PromptService(mockSupabaseService, mockToastService);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call loadPrompts on construction', () => {
    expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_types');
    expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
  });

  describe('observables', () => {
    it('should expose prompts$ observable', () => {
      expect(service.prompts$).toBeDefined();
    });

    it('should expose loading$ observable', () => {
      expect(service.loading$).toBeDefined();
    });

    it('should expose error$ observable', () => {
      expect(service.error$).toBeDefined();
    });
  });

  describe('loadPrompts', () => {
    it('should load prompts from database', async () => {
      const mockPrompts = [
        { id: '1', type: 'Healing', title: 'Test 1', created_at: '2024-01-01' },
        { id: '2', type: 'Guidance', title: 'Test 2', created_at: '2024-01-02' },
      ];

      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    { name: 'Healing', display_order: 1 },
                    { name: 'Guidance', display_order: 2 },
                  ],
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockPrompts, error: null }))
          }))
        };
      });

      await service.loadPrompts();

      const prompts = await firstValueFrom(service.prompts$);
      expect(prompts).toHaveLength(2);
      expect(prompts[0].type).toBe('Healing');
      expect(prompts[1].type).toBe('Guidance');
    });

    it('should filter out prompts with inactive types', async () => {
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [{ name: 'Healing', display_order: 1 }],
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', type: 'Healing', title: 'Active' },
                { id: '2', type: 'Inactive', title: 'Should be filtered' },
              ],
              error: null
            }))
          }))
        };
      });

      await service.loadPrompts();

      const prompts = await firstValueFrom(service.prompts$);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].type).toBe('Healing');
    });

    it('should sort prompts by prayer type display order', async () => {
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    { name: 'Guidance', display_order: 1 },
                    { name: 'Healing', display_order: 2 },
                  ],
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', type: 'Healing', title: 'Should be second', created_at: '2024-01-01' },
                { id: '2', type: 'Guidance', title: 'Should be first', created_at: '2024-01-02' },
              ],
              error: null
            }))
          }))
        };
      });

      await service.loadPrompts();

      const prompts = await firstValueFrom(service.prompts$);
      expect(prompts[0].type).toBe('Guidance');
      expect(prompts[1].type).toBe('Healing');
    });

    it('should handle prompts with types that have no display_order', async () => {
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    { name: 'Healing', display_order: 1 },
                    { name: 'Unknown', display_order: undefined },
                  ],
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', type: 'Unknown', title: 'No order' },
                { id: '2', type: 'Healing', title: 'Has order' },
              ],
              error: null
            }))
          }))
        };
      });

      await service.loadPrompts();

      const prompts = await firstValueFrom(service.prompts$);
      expect(prompts).toHaveLength(2);
      // 'Healing' should come first (order 1), 'Unknown' last (order 999)
      expect(prompts[0].type).toBe('Healing');
      expect(prompts[1].type).toBe('Unknown');
    });

    it('should set loading to true during load', async () => {
      let loadingValues: boolean[] = [];
      service.loading$.subscribe(loading => loadingValues.push(loading));

      await service.loadPrompts();

      expect(loadingValues).toContain(true);
      expect(loadingValues[loadingValues.length - 1]).toBe(false);
    });

    it('should clear error on successful load', async () => {
      await service.loadPrompts();

      const error = await firstValueFrom(service.error$);
      expect(error).toBeNull();
    });

    it('should handle prayer_types fetch error', async () => {
      const mockError = new Error('Types fetch error');
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      });

      await service.loadPrompts();

      const error = await firstValueFrom(service.error$);
      expect(error).toBe('Types fetch error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load prompts:', mockError);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load prompts');
    });

    it('should handle prayer_prompts fetch error', async () => {
      const mockError = new Error('Prompts fetch error');
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        };
      });

      await service.loadPrompts();

      const error = await firstValueFrom(service.error$);
      expect(error).toBe('Prompts fetch error');
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load prompts');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw 'String error';
      });

      await service.loadPrompts();

      const error = await firstValueFrom(service.error$);
      expect(error).toBe('Failed to load prompts');
    });

    it('should always set loading to false after load', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Test error');
      });

      await service.loadPrompts();

      const loading = await firstValueFrom(service.loading$);
      expect(loading).toBe(false);
    });
  });

  describe('addPrompt', () => {
    it('should add a new prompt', async () => {
      const newPrompt = {
        title: 'New Prompt',
        type: 'Healing' as any,
        description: 'Test description'
      };

      const result = await service.addPrompt(newPrompt);

      expect(result).toBe(true);
      expect(mockToastService.success).toHaveBeenCalledWith('Prompt added successfully');
    });

    it('should call insert with correct data', async () => {
      let insertedData: any;
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            insert: vi.fn((data: any) => {
              insertedData = data;
              return Promise.resolve({ error: null });
            }),
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      const newPrompt = {
        title: 'New Prompt',
        type: 'Healing' as any,
        description: 'Test description'
      };

      await service.addPrompt(newPrompt);

      expect(insertedData).toEqual({
        title: 'New Prompt',
        type: 'Healing',
        description: 'Test description'
      });
    });

    it('should reload prompts after adding', async () => {
      const fromSpy = vi.spyOn(mockSupabaseService.client, 'from');

      await service.addPrompt({
        title: 'Test',
        type: 'Healing' as any,
        description: 'Test'
      });

      // Should be called during addPrompt (insert) and during loadPrompts (types + prompts)
      expect(fromSpy.mock.calls.filter(call => call[0] === 'prayer_prompts').length).toBeGreaterThan(1);
    });

    it('should handle insert error', async () => {
      const mockError = new Error('Insert failed');
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: mockError })),
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      const result = await service.addPrompt({
        title: 'Test',
        type: 'Healing' as any,
        description: 'Test'
      });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding prompt:', mockError);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to add prompt');
    });

    it('should handle exception during add', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      const result = await service.addPrompt({
        title: 'Test',
        type: 'Healing' as any,
        description: 'Test'
      });

      expect(result).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to add prompt');
    });
  });

  describe('updatePrompt', () => {
    it('should update a prompt', async () => {
      const result = await service.updatePrompt('prompt-123', {
        title: 'Updated Title'
      });

      expect(result).toBe(true);
      expect(mockToastService.success).toHaveBeenCalledWith('Prompt updated successfully');
    });

    it('should call update with correct data', async () => {
      let updateData: any;
      let updateId: string = '';
      
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            update: vi.fn((data: any) => {
              updateData = data;
              return {
                eq: vi.fn((field: string, value: string) => {
                  if (field === 'id') updateId = value;
                  return Promise.resolve({ error: null });
                })
              };
            }),
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      await service.updatePrompt('test-id', { title: 'New Title' });

      expect(updateData).toEqual({ title: 'New Title' });
      expect(updateId).toBe('test-id');
    });

    it('should reload prompts after updating', async () => {
      const fromSpy = vi.spyOn(mockSupabaseService.client, 'from');

      await service.updatePrompt('test-id', { title: 'Updated' });

      // Should be called for update and for reload
      expect(fromSpy).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      const mockError = new Error('Update failed');
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: mockError }))
            })),
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      const result = await service.updatePrompt('test-id', { title: 'Updated' });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating prompt:', mockError);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to update prompt');
    });

    it('should handle exception during update', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      const result = await service.updatePrompt('test-id', { title: 'Updated' });

      expect(result).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to update prompt');
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', async () => {
      const result = await service.deletePrompt('prompt-123');

      expect(result).toBe(true);
      expect(mockToastService.success).toHaveBeenCalledWith('Prompt deleted successfully');
    });

    it('should call delete with correct id', async () => {
      let deleteId: string = '';
      
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => {
                if (field === 'id') deleteId = value;
                return Promise.resolve({ error: null });
              })
            })),
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      await service.deletePrompt('test-delete-id');

      expect(deleteId).toBe('test-delete-id');
    });

    it('should reload prompts after deleting', async () => {
      const fromSpy = vi.spyOn(mockSupabaseService.client, 'from');

      await service.deletePrompt('test-id');

      // Should be called for delete and for reload
      expect(fromSpy).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const mockError = new Error('Delete failed');
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: mockError }))
            })),
            select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      const result = await service.deletePrompt('test-id');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting prompt:', mockError);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to delete prompt');
    });

    it('should handle exception during delete', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      const result = await service.deletePrompt('test-id');

      expect(result).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to delete prompt');
    });
  });

  describe('filterByType', () => {
    beforeEach(async () => {
      mockSupabaseService.client.from = vi.fn((table: string) => {
        if (table === 'prayer_types') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({
                  data: [
                    { name: 'Healing', display_order: 1 },
                    { name: 'Guidance', display_order: 2 },
                  ],
                  error: null
                }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { id: '1', type: 'Healing', title: 'Healing Prompt' },
                { id: '2', type: 'Guidance', title: 'Guidance Prompt' },
                { id: '3', type: 'Healing', title: 'Another Healing' },
              ],
              error: null
            }))
          }))
        };
      });

      await service.loadPrompts();
    });

    it('should return all prompts when type is null', () => {
      const filtered = service.filterByType(null);
      expect(filtered).toHaveLength(3);
    });

    it('should filter prompts by type', () => {
      const filtered = service.filterByType('Healing');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.type === 'Healing')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      const filtered = service.filterByType('NonExistent');
      expect(filtered).toHaveLength(0);
    });

    it('should filter Guidance type correctly', () => {
      const filtered = service.filterByType('Guidance');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('Guidance');
    });
  });
});
