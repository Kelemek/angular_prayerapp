import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.0";
import { jwtRole } from "../send-email/access.ts";
import {
  accountApprovalClientBody,
  callerOwnsApprovalRequest,
  parseAccountApprovalEnqueue,
  planAccountApprovalPush,
} from "./plan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase not configured" }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = typeof body["email"] === "string" ? body["email"].trim() : "";
  if (!email) {
    return json({ error: "email is required" }, 400);
  }

  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (jwtRole(token) !== "authenticated") {
    return json({ error: "Not authorized" }, 403);
  }

  const userClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") || serviceKey,
    { global: { headers: { Authorization: header } } }
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!callerOwnsApprovalRequest(userData?.user?.email, email)) {
    return json({ error: "Not authorized" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.rpc(
    "enqueue_account_approval_admin_emails",
    {
      p_email: email,
      p_first_name: typeof body["firstName"] === "string" ? body["firstName"] : "",
      p_last_name: typeof body["lastName"] === "string" ? body["lastName"] : "",
      p_affiliation_reason:
        typeof body["affiliationReason"] === "string"
          ? body["affiliationReason"]
          : "",
      p_admin_link: typeof body["adminLink"] === "string" ? body["adminLink"] : "",
      p_requested_date:
        typeof body["requestedDate"] === "string" ? body["requestedDate"] : "",
    }
  );

  if (error) {
    console.error("enqueue_account_approval_admin_emails failed:", error);
    return json({ error: "Failed to queue account approval notice" }, 500);
  }

  const parsed = parseAccountApprovalEnqueue(data);
  const push = planAccountApprovalPush(parsed);
  if (push) {
    const { error: pushError } = await supabase.functions.invoke(
      "send-push-notification",
      { body: push }
    );
    if (pushError) {
      console.error("Account approval push failed:", pushError);
    }
  }

  return json(accountApprovalClientBody(parsed), 200);
});
