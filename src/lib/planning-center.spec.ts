import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupPersonByEmail, formatPersonName, PlanningCenterPerson } from './planning-center';

describe('planning-center', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock console.error to prevent noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('lookupPersonByEmail', () => {
    const supabaseUrl = 'https://test.supabase.co';
    const supabaseKey = 'test-key';

    it('should lookup person by email successfully', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: 'https://example.com/avatar.jpg',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
        count: 1,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(fetchMock).toHaveBeenCalledWith(
        `${supabaseUrl}/functions/v1/planning-center-lookup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'john.doe@example.com' }),
        }
      );

      expect(result).toEqual({
        people: mockResponse.people,
        count: 1,
      });
    });

    it('should trim whitespace from email before lookup', async () => {
      const mockResponse = {
        people: [],
        count: 0,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await lookupPersonByEmail('  john.doe@example.com  ', supabaseUrl, supabaseKey);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'john.doe@example.com' }),
        })
      );
    });

    it('should return error when email is empty', async () => {
      const result = await lookupPersonByEmail('', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Email address is required',
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return error when email is only whitespace', async () => {
      const result = await lookupPersonByEmail('   ', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Email address is required',
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      const errorData = {
        error: 'Person not found',
      };

      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorData,
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Person not found',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Planning Center lookup failed:',
        404,
        errorData
      );
    });

    it('should handle API error response without error message', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Failed to lookup person in Planning Center',
      });
    });

    it('should handle JSON parse error in API response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Failed to lookup person in Planning Center',
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      fetchMock.mockRejectedValue(networkError);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Network error',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in Planning Center lookup:',
        networkError
      );
    });

    it('should handle non-Error exceptions', async () => {
      fetchMock.mockRejectedValue('String error');

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Unknown error',
      });
    });

    it('should handle successful response with multiple people', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          {
            id: '456',
            type: 'Person',
            attributes: {
              first_name: 'Jane',
              last_name: 'Doe',
              name: 'Jane Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
        count: 2,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await lookupPersonByEmail('doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: mockResponse.people,
        count: 2,
      });
    });

    it('should handle response without people array', async () => {
      const mockResponse = {
        count: 0,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
      });
    });

    it('should handle response without count', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: mockResponse.people,
        count: 0,
      });
    });
  });

  describe('formatPersonName', () => {
    it('should return name attribute when present', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });

    it('should construct name from first and last name when name is empty', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });

    it('should handle person with only first name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: '',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John ');
    });

    it('should handle person with only last name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: '',
          last_name: 'Doe',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe(' Doe');
    });

    it('should prefer name attribute over constructed name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'Jonathan',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });
  });
});
