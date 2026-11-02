import { Injectable } from '@angular/core';
import {
  ensureAdminCreatedEmailSubscriber,
  resolvePlanningCenterMetaForAdminCreatedSubscriber,
  type EnsureAdminCreatedEmailSubscriberOutcome,
} from '../lib/admin-created-email-subscriber';
import { validateSubscriberEmailFormat } from '../lib/subscriber-email-format';
import { PlanningCenterRestService } from './planning-center-rest.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AdminCreatedEmailSubscriberService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly planningCenterRest: PlanningCenterRestService,
  ) {}

  validateEmailFormat(email: string): string | null {
    return validateSubscriberEmailFormat(email);
  }

  async ensure(
    name: string,
    email: string,
  ): Promise<EnsureAdminCreatedEmailSubscriberOutcome> {
    const client = await this.supabase.getClientWhenReady();
    return ensureAdminCreatedEmailSubscriber(client, name, email, (normalizedEmail) =>
      resolvePlanningCenterMetaForAdminCreatedSubscriber(
        (lookupEmail, includePeople) =>
          this.planningCenterRest.lookupPersonByEmail(lookupEmail, includePeople),
        normalizedEmail,
      ),
    );
  }
}
