/**
 * Planning Center People API Integration
 * Used to validate email addresses against Planning Center member database
 */

export interface PlanningCenterAttributes {
  first_name: string;
  last_name: string;
  name: string;
  avatar: string;
  status: string;
  created_at: string;
  updated_at: string;
  primary_email_address?: string;
}

export interface PlanningCenterPerson {
  id: string;
  type: string;
  attributes: PlanningCenterAttributes;
}

export interface EmailLookupResult {
  people: PlanningCenterPerson[];
  count: number;
  error?: string;
  cached?: boolean;
}

/**
 * Check database for cached Planning Center status
 * Returns null if not cached, true if in Planning Center, false if not
 */
export async function checkCachedPlanningCenterStatus(email: string, supabaseUrl: string, supabaseKey: string): Promise<boolean | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}&select=in_planning_center,planning_center_checked_at`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to check cached Planning Center status:', response.status);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0 && data[0].in_planning_center !== null) {
      console.log(`[Planning Center] Using cached status for ${email}: ${data[0].in_planning_center}`);
      return data[0].in_planning_center;
    }

    return null;
  } catch (error) {
    console.error('Error checking cached Planning Center status:', error);
    return null;
  }
}

/**
 * Save Planning Center lookup result to database
 */
export async function savePlanningCenterStatus(email: string, isInPlanningCenter: boolean, supabaseUrl: string, supabaseKey: string): Promise<void> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          in_planning_center: isInPlanningCenter,
          planning_center_checked_at: new Date().toISOString()
        })
      }
    );

    if (!response.ok) {
      console.error('Failed to save Planning Center status:', response.status);
    } else {
      console.log(`[Planning Center] Saved status for ${email}: ${isInPlanningCenter}`);
    }
  } catch (error) {
    console.error('Error saving Planning Center status:', error);
  }
}

/**
 * Lookup a person by email in Planning Center
 * First checks database cache, then calls API if needed
 * Uses Supabase Edge Function to call Planning Center API with proper authentication
 */
export async function lookupPersonByEmail(email: string, supabaseUrl: string, supabaseKey: string, skipCache: boolean = false): Promise<EmailLookupResult> {
  if (!email || email.trim() === '') {
    return {
      people: [],
      count: 0,
      error: 'Email address is required'
    };
  }

  // Check cache first unless skipCache is true
  if (!skipCache) {
    const cachedStatus = await checkCachedPlanningCenterStatus(email, supabaseUrl, supabaseKey);
    if (cachedStatus !== null) {
      return {
        people: cachedStatus ? [{ id: 'cached', type: 'Person', attributes: { first_name: '', last_name: '', name: '', avatar: '', status: '', created_at: '', updated_at: '' } }] : [],
        count: cachedStatus ? 1 : 0,
        cached: true
      };
    }
  }

  // Cache miss or skipCache - make API call
  console.log(`[Planning Center] Cache miss for ${email}, calling API`);
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/planning-center-lookup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Planning Center lookup failed:', response.status, errorData);
      return {
        people: [],
        count: 0,
        error: errorData.error || 'Failed to lookup person in Planning Center'
      };
    }

    const data = await response.json();
    const result: EmailLookupResult = {
      people: data.people || [],
      count: data.count || 0
    };

    // Save result to database for future lookups
    const isInPlanningCenter = result.count > 0;
    await savePlanningCenterStatus(email, isInPlanningCenter, supabaseUrl, supabaseKey);

    return result;
  } catch (error) {
    console.error('Error in Planning Center lookup:', error);
    return {
      people: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batched Planning Center lookups with concurrency control and retry logic
 * Limits concurrent requests to avoid rate limiting and provides progress updates
 */
export interface BatchLookupOptions {
  concurrency?: number; // Max concurrent requests (default: 5)
  maxRetries?: number; // Max retry attempts per email (default: 3)
  retryDelayMs?: number; // Initial retry delay in ms (default: 1000)
  onProgress?: (completed: number, total: number) => void; // Progress callback
}

export interface BatchLookupResult {
  email: string;
  result: EmailLookupResult;
  retries: number;
  failed: boolean;
}

export async function batchLookupPlanningCenter(
  emails: string[],
  supabaseUrl: string,
  supabaseKey: string,
  options: BatchLookupOptions = {}
): Promise<BatchLookupResult[]> {
  const {
    concurrency = 5,
    maxRetries = 3,
    retryDelayMs = 1000,
    onProgress
  } = options;

  const results: BatchLookupResult[] = [];
  const queue = [...emails];
  let completed = 0;

  // Process emails in batches
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);

    const batchPromises = batch.map(async (email) => {
      let lastError: Error | null = null;

      // Retry logic with exponential backoff
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await lookupPersonByEmail(email, supabaseUrl, supabaseKey);
          completed++;
          onProgress?.(completed, emails.length);

          return {
            email,
            result,
            retries: attempt,
            failed: !!result.error
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // If not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const delay = retryDelayMs * Math.pow(2, attempt); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(
              `[Planning Center] Retry ${attempt + 1}/${maxRetries} for ${email} after ${delay}ms`
            );
          }
        }
      }

      // All retries failed
      completed++;
      onProgress?.(completed, emails.length);

      return {
        email,
        result: {
          people: [],
          count: 0,
          error: lastError?.message || 'Failed after all retries'
        },
        retries: maxRetries,
        failed: true
      };
    });

    results.push(...await Promise.all(batchPromises));
  }

  return results;
}

/**
 * Format a Planning Center person's name
 */
export function formatPersonName(person: PlanningCenterPerson): string {
  return person.attributes.name || `${person.attributes.first_name} ${person.attributes.last_name}`;
}
/**
 * Search for people by name in Planning Center
 * Uses Supabase Edge Function to call Planning Center API
 */
export async function searchPlanningCenterByName(name: string, supabaseUrl: string, supabaseKey: string): Promise<EmailLookupResult> {
  if (!name || name.trim() === '') {
    return {
      people: [],
      count: 0,
      error: 'Name search is required'
    };
  }

  try {
    // Use the same planning-center-lookup endpoint which supports name/email search
    // The endpoint uses 'email' parameter but actually searches by name or email
    const response = await fetch(
      `${supabaseUrl}/functions/v1/planning-center-lookup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: name.trim() })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Planning Center search failed:', response.status, errorData);
      return {
        people: [],
        count: 0,
        error: errorData.error || 'Failed to search Planning Center'
      };
    }

    const data = await response.json();
    return {
      people: data.people || [],
      count: data.count || 0
    };
  } catch (error) {
    console.error('Error in Planning Center search:', error);
    return {
      people: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Planning Center List interface
 */
export interface PlanningCenterList {
  id: string;
  name: string;
  description?: string;
}

/**
 * Fetch all Planning Center lists from the organization
 */
export async function fetchPlanningCenterLists(supabaseUrl: string, supabaseKey: string): Promise<{ lists: PlanningCenterList[]; error?: string }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/planning-center-lists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'lists' })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch Planning Center lists:', response.status, errorData);
      return {
        lists: [],
        error: errorData.error || 'Failed to fetch Planning Center lists'
      };
    }

    const data = await response.json();
    return {
      lists: data.lists || []
    };
  } catch (error) {
    console.error('Error in fetchPlanningCenterLists:', error);
    return {
      lists: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch member names from a specific Planning Center list
 */
export async function fetchListMembers(listId: string, supabaseUrl: string, supabaseKey: string): Promise<{ members: Array<{ id: string; name: string; avatar?: string | null }>; error?: string }> {
  if (!listId || listId.trim() === '') {
    return {
      members: [],
      error: 'List ID is required'
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/planning-center-lists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'members', listId })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to fetch Planning Center list members:', response.status, errorData);
      return {
        members: [],
        error: errorData.error || 'Failed to fetch Planning Center list members'
      };
    }

    const data = await response.json();
    return {
      members: data.members || []
    };
  } catch (error) {
    console.error('Error in fetchListMembers:', error);
    return {
      members: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}