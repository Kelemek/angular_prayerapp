import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, listId } = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required (lists or members)' }),
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

    if (action === 'lists') {
      // Fetch all Planning Center lists
      return await fetchLists(authHeader, corsHeaders)
    } else if (action === 'members') {
      // Fetch members from a specific list
      if (!listId) {
        return new Response(
          JSON.stringify({ error: 'listId is required for members action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      return await fetchListMembers(listId, authHeader, corsHeaders)
    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  } catch (error) {
    console.error('Error in planning-center-lists:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchLists(authHeader: string, corsHeaders: Record<string, string>) {
  try {
    const response = await fetch(
      'https://api.planningcenteronline.com/people/v2/lists?per_page=100',
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Planning Center lists API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Planning Center lists', 
          details: errorText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    // Extract list data with id and name
    const lists = (data.data || []).map((list: any) => ({
      id: list.id,
      name: list.attributes?.name || 'Unnamed List',
      description: list.attributes?.description || '',
    }))
    
    return new Response(
      JSON.stringify({ 
        lists,
        count: lists.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error fetching Planning Center lists:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function fetchListMembers(listId: string, authHeader: string, corsHeaders: Record<string, string>) {
  try {
    const members: string[] = []
    let page = 1
    let hasMore = true

    // Paginate through all members in the list
    while (hasMore) {
      const response = await fetch(
        `https://api.planningcenteronline.com/people/v2/lists/${encodeURIComponent(listId)}/people?page=${page}&per_page=100`,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Planning Center list members API error:', response.status, errorText)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch Planning Center list members', 
            details: errorText 
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const data = await response.json()
      
      // Extract member data with id, name, and avatar
      const pageMembers = (data.data || []).map((person: any) => ({
        id: person.id,
        name: person.attributes?.name || '',
        avatar: person.attributes?.avatar || null
      }))
        .filter((member: any) => member.name.trim() !== '')
      
      members.push(...pageMembers)

      // Check if there's another page
      const meta = data.meta || {}
      const pagination = meta.pagination || {}
      hasMore = pagination.next_offset !== null && pagination.next_offset !== undefined
      page++
    }

    return new Response(
      JSON.stringify({ 
        members,
        count: members.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error fetching Planning Center list members:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}
