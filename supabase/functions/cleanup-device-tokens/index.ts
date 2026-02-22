import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

const CLEANUP_DAYS = 30

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - CLEANUP_DAYS)
    const cutoffIso = cutoff.toISOString()

    const { data: deleted, error } = await supabaseClient
      .from('device_tokens')
      .delete()
      .lt('last_seen_at', cutoffIso)
      .select('id')

    if (error) {
      console.error('Error cleaning up device tokens:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to cleanup device tokens', details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const deletedCount = Array.isArray(deleted) ? deleted.length : 0
    console.log(`Cleaned up ${deletedCount} device token(s) older than ${CLEANUP_DAYS} days`)

    return new Response(
      JSON.stringify({ deleted: deletedCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Cleanup device tokens failed:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
