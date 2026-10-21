import { describe, expect, it } from 'vitest';
import {
  buildGroupPrayerAppLink,
  buildSubscriberTemplateVariables,
  memberEmailsExceptActor,
  planEmailRecipients,
  planPushForKind,
  planPushRecipients,
  subscriberTemplateKeyForKind,
  updateContentForAnswered,
} from '../../supabase/functions/notify-group-activity/plan';

describe('group activity notify plan', () => {
  it('maps kinds to subscriber template keys', () => {
    expect(subscriberTemplateKeyForKind('prayer_added')).toBe('approved_prayer');
    expect(subscriberTemplateKeyForKind('prayer_update')).toBe('approved_update');
    expect(subscriberTemplateKeyForKind('prayer_answered')).toBe('prayer_answered');
  });

  it('builds group deep links with filter=groups', () => {
    const link = buildGroupPrayerAppLink('https://app.test', 'g1', 'p1');
    expect(link).toContain('filter=groups');
    expect(link).toContain('groupId=g1');
    expect(link).toContain('prayerId=p1');
  });

  it('excludes the actor from member recipients', () => {
    expect(
      memberEmailsExceptActor(['a@b.co', 'A@b.co', 'c@d.co'], 'a@b.co'),
    ).toEqual(['c@d.co']);
  });

  it('splits email vs push delivery by subscriber flags', () => {
    const rows = [
      {
        email: 'a@b.co',
        is_active: true,
        is_blocked: false,
        receive_push: true,
      },
      {
        email: 'c@d.co',
        is_active: false,
        is_blocked: false,
        receive_push: true,
      },
      {
        email: 'e@f.co',
        is_active: true,
        is_blocked: true,
        receive_push: true,
      },
    ];
    expect(planEmailRecipients(rows)).toEqual(['a@b.co']);
    expect(planPushRecipients(rows)).toEqual(['a@b.co', 'c@d.co']);
  });

  it('builds approved update variables with author and update html fields', () => {
    const vars = buildSubscriberTemplateVariables({
      kind: 'prayer_update',
      prayer: {
        id: 'p1',
        group_id: 'g1',
        title: 'Prayer for Jane',
        description: 'Please pray',
        prayer_for: 'Jane',
        requester: 'Bob',
        status: 'current',
      },
      appLink: 'https://app.test/?filter=groups',
      authorName: 'Alice',
      rendered: {
        prayerDescription: 'Please pray',
        prayerDescriptionText: 'Please pray',
        prayerDescriptionHtml: '<p>Please pray</p>',
        updateContent: 'Good news',
        updateContentText: 'Good news',
        updateContentHtml: '<p>Good news</p>',
      },
    });
    expect(vars.authorName).toBe('Alice');
    expect(vars.updateContentHtml).toBe('<p>Good news</p>');
    expect(vars.prayerStatus).toBe('current');
  });

  it('uses fallback update text when marking answered without an update row', () => {
    const answered = updateContentForAnswered(null, 'Mark');
    expect(answered.authorName).toBe('Mark');
    expect(answered.content).toContain('marked as answered');
  });

  it('plans push types for prayer, update, and answered', () => {
    const prayer = {
      id: 'p1',
      group_id: 'g1',
      title: 'Title',
      description: 'Desc',
      prayer_for: 'X',
      requester: 'R',
      status: 'current',
    };
    expect(planPushForKind('prayer_added', prayer, 'plain desc', '').pushType).toBe(
      'prayer_approved',
    );
    expect(planPushForKind('prayer_update', prayer, '', 'update text').pushType).toBe(
      'prayer_update',
    );
    expect(planPushForKind('prayer_answered', prayer, '', 'answered').pushType).toBe(
      'prayer_answered',
    );
  });
});
