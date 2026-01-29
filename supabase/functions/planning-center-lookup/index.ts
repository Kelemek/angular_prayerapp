import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    
    // Add emails to people - use login_identifier which contains the email address
    const peopleData = (data.data || []).map((person: any) => {
      return {
        ...person,
        attributes: {
          ...person.attributes,
          primary_email_address: person.attributes?.login_identifier || null
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
