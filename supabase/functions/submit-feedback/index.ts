import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
};

const DEFAULT_DATA_SOURCE_ID = '53537498-ea76-4f4c-b7f6-38116d48419b';
const NOTION_VERSION = '2025-09-03';

type FeedbackType = 'bug' | 'feature' | 'suggestion';

interface SubmitFeedbackBody {
  title?: string;
  description?: string;
  type?: FeedbackType;
  userEmail?: string;
  userName?: string;
  pageUrl?: string;
}

const TYPE_TO_NOTION: Record<FeedbackType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  suggestion: 'Suggestion',
};

async function isKnownSubscriber(
  adminClient: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data: subscriber, error } = await adminClient
    .from('email_subscribers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('email_subscribers lookup failed:', error);
    return false;
  }

  return !!subscriber;
}

async function resolveAuthenticatedEmail(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  bodyUserEmail: string | undefined
): Promise<string | null> {
  const { data: userData } = await userClient.auth.getUser();
  const jwtEmail = userData?.user?.email?.toLowerCase().trim();
  if (jwtEmail) {
    if (!(await isKnownSubscriber(adminClient, jwtEmail))) return null;
    return jwtEmail;
  }

  const email = String(bodyUserEmail ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return null;

  if (!(await isKnownSubscriber(adminClient, email))) return null;

  return email;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const notionToken = Deno.env.get('NOTION_TOKEN');
  const dataSourceId =
    Deno.env.get('NOTION_SITE_ISSUES_DATA_SOURCE_ID')?.trim() || DEFAULT_DATA_SOURCE_ID;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: 'Server configuration error' }, 500);
  }

  if (!notionToken) {
    return jsonResponse(
      { success: false, error: 'Feedback is not configured on the server.' },
      503
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const body = (await req.json()) as SubmitFeedbackBody;

    const authenticatedEmail = await resolveAuthenticatedEmail(
      userClient,
      adminClient,
      body.userEmail
    );
    if (!authenticatedEmail) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const type = body.type;

    if (!title || !description) {
      return jsonResponse({ success: false, error: 'Title and description are required' }, 400);
    }

    if (title.length > 100) {
      return jsonResponse({ success: false, error: 'Title is too long' }, 400);
    }

    if (description.length > 1000) {
      return jsonResponse({ success: false, error: 'Description is too long' }, 400);
    }

    if (type !== 'bug' && type !== 'feature' && type !== 'suggestion') {
      return jsonResponse({ success: false, error: 'Invalid feedback type' }, 400);
    }

    const userName = String(body.userName ?? '').trim();
    const pageUrl = String(body.pageUrl ?? '').trim();

    const notionProperties: Record<string, unknown> = {
      'Task name': {
        title: [{ type: 'text', text: { content: title } }],
      },
      Description: {
        rich_text: [{ type: 'text', text: { content: description } }],
      },
      Type: {
        select: { name: TYPE_TO_NOTION[type] },
      },
      Email: {
        email: authenticatedEmail,
      },
      Status: {
        status: { name: 'Not started' },
      },
      Priority: {
        select: { name: 'Medium' },
      },
    };

    if (userName) {
      notionProperties['User name'] = {
        rich_text: [{ type: 'text', text: { content: userName.slice(0, 2000) } }],
      };
    }

    if (pageUrl && pageUrl.length <= 2000) {
      notionProperties['Page URL'] = { url: pageUrl };
    }

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties: notionProperties,
      }),
    });

    const notionPayload = await notionRes.json();
    if (!notionRes.ok) {
      console.error('Notion API error:', notionPayload);
      return jsonResponse(
        {
          success: false,
          error: 'Failed to submit feedback',
          details: notionPayload?.message,
        },
        502
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('submit-feedback error:', err);
    return jsonResponse({ success: false, error: 'Failed to submit feedback' }, 500);
  }
});
