import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface CheckAdminRequest {
  email: string;
}

interface CheckAdminResponse {
  success: boolean;
  is_admin: boolean;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (has full access)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { email } = (await req.json()) as CheckAdminRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required", is_admin: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is an admin
    const { data, error } = await supabase
      .from("email_subscribers")
      .select("is_admin")
      .eq("email", email.toLowerCase().trim())
      .eq("is_admin", true)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          is_admin: false,
          error: "Database error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isAdmin = !!data;

    return new Response(
      JSON.stringify({
        success: true,
        is_admin: isAdmin,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in check-admin-status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        is_admin: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
