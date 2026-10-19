import { rejectGroupOnlyCaller } from '../shared/reject-group-only-caller.ts'

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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const groupOnly = await rejectGroupOnlyCaller(req)
  if (groupOnly) return groupOnly

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
