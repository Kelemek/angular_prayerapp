import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0'
import { requireChurchMemberCaller } from '../shared/reject-group-only-caller.ts'
import { verifyAuthResumeToken } from '../shared/auth-resume-token.ts'
import { planningCenterPeopleIncludeEmail } from '../shared/planning-center-email-match.ts'
import { consumeRateLimit, policyErrorToResponse } from '../shared/policy-rpc.ts'
import {
  decidePlanningCenterLookupMode,
  loginLookupBooleanResult,
  parsePlanningCenterLookupBody,
  trustedClientAddress,
} from './login-lookup-gate.ts'

const EMAIL_FETCH_CONCURRENCY = 5

/**
 * Fetch the primary email for a person from the Planning Center Emails resource.
 * Returns the address where primary === true, or the first address if none marked primary.
 * Returns null on 404, empty list, or other errors (fail gracefully).
 */
async function fetchPrimaryEmailForPerson(
  personId: string,
  authHeader: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.planningcenteronline.com/people/v2/people/${encodeURIComponent(personId)}/emails`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) return null
      console.debug(`[planning-center-lookup] Emails API error for person ${personId}:`, response.status)
      return null
    }

    const data = await response.json()
    const emails = data.data || []

    if (emails.length === 0) return null

    const primary = emails.find((e: any) => e.attributes?.primary === true)
    const first = emails[0]
    const address = primary?.attributes?.address ?? first?.attributes?.address ?? null
    return typeof address === 'string' && address.trim() ? address.trim() : null
  } catch (e) {
    console.debug(`[planning-center-lookup] Error fetching emails for person ${personId}:`, e)
    return null
  }
}

/**
 * Process items with a concurrency limit to avoid rate limiting.
 */
async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
}

async function emailIsInPlanningCenter(email: string): Promise<boolean> {
  const PC_APP_ID = Deno.env.get('PLANNING_CENTER_APP_ID')
  const PC_SECRET = Deno.env.get('PLANNING_CENTER_SECRET')
  if (!PC_APP_ID || !PC_SECRET) {
    throw new Error('Planning Center not configured')
  }
  const authHeader = 'Basic ' + btoa(`${PC_APP_ID}:${PC_SECRET}`)
  const searchUrl =
    `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(email)}`
  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error('Failed to search Planning Center')
  }
  const data = await response.json()
  const people = data.data || []
  const peopleData = await mapWithConcurrency(people, EMAIL_FETCH_CONCURRENCY, async (person: any) => {
    const loginId = person.attributes?.login_identifier
    const emailFromLogin = loginId && String(loginId).trim() ? String(loginId).trim() : null
    const primaryEmail = emailFromLogin ?? await fetchPrimaryEmailForPerson(person.id, authHeader)
    return {
      attributes: {
        login_identifier: emailFromLogin,
        primary_email_address: primaryEmail || null,
      },
    }
  })
  return planningCenterPeopleIncludeEmail(peopleData, email)
}

function json(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function serviceAdmin() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceKey) {
    return null
  }
  return createClient(url, serviceKey)
}

async function consumeLookupBudget(
  bucket: string,
  subject: string,
): Promise<Response | null> {
  const admin = serviceAdmin()
  if (!admin) {
    return json({ error: 'Server is not configured' }, 500)
  }
  try {
    if (!(await consumeRateLimit(admin, bucket, subject, 10))) {
      return json({ error: 'Too many attempts. Try again later.' }, 429)
    }
    return null
  } catch (error) {
    return policyErrorToResponse(error)
  }
}

async function signedInCallerEmail(req: Request): Promise<string | null> {
  const admin = serviceAdmin()
  if (!admin) {
    return null
  }
  const header = req.headers.get('Authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return null
  }
  const { data, error } = await admin.auth.getUser(token)
  const email = data.user?.email?.trim().toLowerCase() ?? ''
  if (error || !email) {
    return null
  }
  return email
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const parsed = parsePlanningCenterLookupBody(await req.json().catch(() => null))
    if ('kind' in parsed) {
      return json({ error: 'Email address is required' }, 400)
    }
    const mode = decidePlanningCenterLookupMode(parsed)
    const email = mode.kind === 'invalid' ? parsed.email : mode.email

    if (mode.kind === 'login') {
      const tokenCheck = await verifyAuthResumeToken(mode.resumeToken, mode.email)
      if (!tokenCheck.ok) {
        return json({ error: 'Not authorized' }, 401)
      }
      const limited = await consumeLookupBudget(
        'pc_lookup',
        `${trustedClientAddress(req)}:${mode.email}`,
      )
      if (limited) return limited
      const matched = await emailIsInPlanningCenter(mode.email)
      return json(loginLookupBooleanResult(matched))
    }

    const denied = await requireChurchMemberCaller(req)
    if (denied) return denied
    const callerEmail = await signedInCallerEmail(req)
    if (!callerEmail) {
      return json({ error: 'Not authorized' }, 401)
    }
    const churchLimited = await consumeLookupBudget(
      'pc_lookup_church',
      `${callerEmail}:${trustedClientAddress(req)}`,
    )
    if (churchLimited) return churchLimited

    // Get Planning Center credentials from environment
    const PC_APP_ID = Deno.env.get('PLANNING_CENTER_APP_ID')
    const PC_SECRET = Deno.env.get('PLANNING_CENTER_SECRET')

    if (!PC_APP_ID || !PC_SECRET) {
      console.error('Planning Center credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Planning Center not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(`${PC_APP_ID}:${PC_SECRET}`)

    // Search for people by email using Planning Center People API
    const searchUrl = `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(email)}`
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Planning Center API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to search Planning Center', 
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    const people = data.data || []

    // Add emails to people: use login_identifier when present, otherwise fetch from Emails resource
    const peopleData = await mapWithConcurrency(people, EMAIL_FETCH_CONCURRENCY, async (person: any) => {
      const loginId = person.attributes?.login_identifier
      const emailFromLogin = loginId && String(loginId).trim() ? String(loginId).trim() : null
      const primaryEmail = emailFromLogin ?? await fetchPrimaryEmailForPerson(person.id, authHeader)
      return {
        ...person,
        attributes: {
          ...person.attributes,
          primary_email_address: primaryEmail || null
        }
      }
    })
    
    // Return the results
    return new Response(
      JSON.stringify({ 
        people: peopleData,
        count: peopleData.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in planning-center-lookup:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
