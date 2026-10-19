import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import {
  escapeIlikeExactEmail,
  normalizeSubscriberEmailForQuery,
  normalizeSubscriberEmailsForQuery,
  type SubscriberNotifyRow,
} from '../shared/safe-subscriber-email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Kind = 'invite' | 'prayer_added' | 'prayer_update';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const kind = body.kind as Kind;
    const groupId = String(body.groupId ?? '');
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const adminForUser = createClient(url, serviceKey);
    const { data: userData, error: userError } = await adminForUser.auth.getUser(token);
    const actor = userData.user?.email?.trim().toLowerCase() ?? '';
    if (userError || !actor || !groupId) {
      return json({ error: 'Not authorized' }, 401);
    }

    const admin = createClient(url, serviceKey);
    const { data: group, error: groupError } = await admin
      .from('prayer_groups')
      .select('id, name')
      .eq('id', groupId)
      .maybeSingle();
    if (groupError) return json({ error: groupError.message }, 500);
    if (!group) return json({ error: 'Group not found' }, 404);

    const { data: members } = await admin
      .from('prayer_group_members')
      .select('user_email, role, is_active')
      .eq('group_id', groupId)
      .eq('is_active', true);
    const actorRow = (members ?? []).find(
      (member) => String(member.user_email).toLowerCase() === actor,
    );
    if (!actorRow) return json({ error: 'Not authorized' }, 403);
    if (kind === 'invite' && actorRow.role !== 'owner') {
      return json({ error: 'Only the owner can invite' }, 403);
    }

    const appLink =
      kind === 'invite'
        ? 'https://cpprayer.cp-church.org/login'
        : `https://cpprayer.cp-church.org/?filter=groups&groupId=${groupId}`;
    const title = String(body.title ?? 'a prayer');
    const inviteEmail = normalizeSubscriberEmailForQuery(String(body.email ?? ''));
    if (kind === 'invite' && !inviteEmail) {
      return json({ error: 'Invalid email address' }, 400);
    }
    const recipientEmails =
      kind === 'invite'
        ? [inviteEmail!]
        : normalizeSubscriberEmailsForQuery(
            (members ?? [])
              .map((member) => String(member.user_email))
              .filter((email) => email && email.toLowerCase() !== actor),
          );

    type DeliveryRow = { email: string; receive_push: boolean | null };
    let deliveryRows: DeliveryRow[] = [];

    if (kind === 'invite') {
      const subscriber = await lookupSubscriberByEmail(admin, inviteEmail!);
      if (
        subscriber &&
        (subscriber.is_blocked === true || subscriber.is_active === false)
      ) {
        return json({ error: 'That address cannot receive invitations.' }, 400);
      }
      deliveryRows = [
        {
          email: subscriber?.email ?? inviteEmail!,
          receive_push: subscriber?.receive_push ?? false,
        },
      ];
    } else if (recipientEmails.length > 0) {
      const subscribers = await lookupSubscribersByEmails(admin, recipientEmails);
      deliveryRows = subscribers
        .filter((row) => row.is_active !== false && row.is_blocked !== true)
        .map((row) => ({ email: row.email, receive_push: row.receive_push }));
    }

    const subject =
      kind === 'invite'
        ? `You are invited to ${group.name}`
        : kind === 'prayer_added'
          ? `New prayer in ${group.name}`
          : `Update in ${group.name}`;
    const text =
      kind === 'invite'
        ? `You have been invited to the prayer group ${group.name}. Sign in: ${appLink}`
        : `${subject}: ${title}. ${appLink}`;

    for (const row of deliveryRows) {
      const emailResponse = await fetch(`${url}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: row.email,
          subject,
          textBody: text,
          htmlBody: `<p>${text}</p>`,
        }),
      });
      if (!emailResponse.ok) {
        const detail = (await emailResponse.text()).slice(0, 300);
        return json({ error: `Invitation email could not be sent. ${detail}` }, 502);
      }
      if (row.receive_push === true) {
        await fetch(`${url}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emails: [row.email],
            title: subject,
            body: title,
          }),
        });
      }
    }

    return json({ success: true, notified: deliveryRows.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

async function lookupSubscriberByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<SubscriberNotifyRow | null> {
  const { data: exact, error: exactError } = await admin
    .from('email_subscribers')
    .select('email, is_active, is_blocked, receive_push, name')
    .eq('email', email)
    .maybeSingle();
  if (exactError) {
    throw exactError;
  }
  if (exact) {
    return exact as SubscriberNotifyRow;
  }
  const { data: matches, error: ilikeError } = await admin
    .from('email_subscribers')
    .select('email, is_active, is_blocked, receive_push, name')
    .ilike('email', escapeIlikeExactEmail(email))
    .limit(2);
  if (ilikeError) {
    throw ilikeError;
  }
  const rows = (matches ?? []) as SubscriberNotifyRow[];
  if (rows.length === 0) {
    return null;
  }
  const canonical = rows.find((row) => row.email.toLowerCase() === email);
  return canonical ?? (rows.length === 1 ? rows[0] : null);
}

async function lookupSubscribersByEmails(
  admin: ReturnType<typeof createClient>,
  emails: string[],
): Promise<SubscriberNotifyRow[]> {
  const rows: SubscriberNotifyRow[] = [];
  for (const email of emails) {
    const row = await lookupSubscriberByEmail(admin, email);
    if (row) {
      rows.push(row);
    }
  }
  return rows;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
