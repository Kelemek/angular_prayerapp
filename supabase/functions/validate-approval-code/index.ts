import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface ApprovalCodeRequest {
  code: string;
}

interface ApprovalCodeResponse {
  success: boolean;
  error?: string;
  user?: {
    email: string;
  };
  approval_type?: string;
  approval_id?: string;
  sessionToken?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (has full access, doesn't require auth)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { code } = (await req.json()) as ApprovalCodeRequest;

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: "Code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Look up the approval code
    const { data: approvalCode, error: lookupError } = await supabase
      .from("approval_codes")
      .select(
        "code, admin_email, approval_type, approval_id, created_at, expires_at, used_at"
      )
      .eq("code", code)
      .maybeSingle();

    if (lookupError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!approvalCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid approval code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if code is expired
    if (new Date(approvalCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Approval code has expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if code was already used
    if (approvalCode.used_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Approval code has already been used",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("approval_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code);

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to process code"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Clean up expired approval codes while we're here
    const cleanupError = await supabase.rpc("cleanup_expired_approval_codes");
    if (cleanupError) {
      console.warn("⚠️ Approval code cleanup failed (non-critical):", cleanupError);
      // Don't fail the request if cleanup fails - it's not critical
    } else {
      console.log("✅ Cleaned up expired approval codes");
    }

    // Code is valid! Return the approval details
    const response: ApprovalCodeResponse = {
      success: true,
      user: {
        email: approvalCode.admin_email,
      },
      approval_type: approvalCode.approval_type,
      approval_id: approvalCode.approval_id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in validate-approval-code:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
