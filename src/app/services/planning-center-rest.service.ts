import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  batchLookupPlanningCenter,
  fetchListMembers,
  fetchPlanningCenterLists,
  lookupPersonByEmail,
  searchPlanningCenterByName,
  type BatchLookupOptions,
  type BatchLookupResult,
  type EmailLookupResult,
  type PlanningCenterList,
} from '../../lib/planning-center';
import { SupabaseService } from './supabase.service';

/**
 * Planning Center + subscriber-cache REST calls with JWT bearer and data-access gating.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanningCenterRestService {
  constructor(private readonly supabase: SupabaseService) {}

  private restConfig(): { url: string; anonKey: string } {
    return {
      url: environment.supabaseUrl,
      anonKey: environment.supabaseAnonKey,
    };
  }

  private authorizationBearer(): Promise<string> {
    return this.supabase.getRestAuthorizationBearer();
  }

  async lookupPersonByEmail(
    email: string,
    skipCache = false,
    authResumeToken?: string
  ): Promise<EmailLookupResult> {
    const bearer = await this.authorizationBearer();
    const { url, anonKey } = this.restConfig();
    return lookupPersonByEmail(
      email,
      url,
      anonKey,
      skipCache,
      bearer,
      authResumeToken
    );
  }

  async batchLookupPlanningCenter(
    emails: string[],
    options: Omit<BatchLookupOptions, 'authorizationBearer'> = {}
  ): Promise<BatchLookupResult[]> {
    const bearer = await this.authorizationBearer();
    const { url, anonKey } = this.restConfig();
    return batchLookupPlanningCenter(emails, url, anonKey, {
      ...options,
      authorizationBearer: bearer,
    });
  }

  async searchPlanningCenterByName(name: string): Promise<EmailLookupResult> {
    const bearer = await this.authorizationBearer();
    const { url, anonKey } = this.restConfig();
    return searchPlanningCenterByName(name, url, anonKey, bearer);
  }

  async fetchPlanningCenterLists(): Promise<{
    lists: PlanningCenterList[];
    error?: string;
  }> {
    const bearer = await this.authorizationBearer();
    const { url, anonKey } = this.restConfig();
    return fetchPlanningCenterLists(url, anonKey, bearer);
  }

  async fetchListMembers(
    listId: string
  ): Promise<Awaited<ReturnType<typeof fetchListMembers>>> {
    const bearer = await this.authorizationBearer();
    const { url, anonKey } = this.restConfig();
    return fetchListMembers(listId, url, anonKey, bearer);
  }
}
