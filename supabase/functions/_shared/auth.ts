// Shared auth guards for Supabase Edge Functions.
//
// Mirrors the inline pattern already used by ai-route / approve-hq / manage-seal:
//   1. Bearer token required, verified with auth.getClaims (role must be "authenticated")
//   2. Admin role verified server-side against user_roles with the service-role client
//
// Helpers return a discriminated result instead of a Response so each function
// keeps control of its own CORS headers and JSON envelope.

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.97.0";

export type AuthFailure = { ok: false; status: 401 | 403 | 500; error: string };

export type UserSession = { ok: true; sub: string; authHeader: string };

export type AdminContext = { ok: true; adminClient: SupabaseClient };

export async function requireUserSession(
  req: Request,
): Promise<UserSession | AuthFailure> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase environment not configured" };
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub || claims.role !== "authenticated") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, sub: claims.sub as string, authHeader };
}

export async function requireAdmin(sub: string): Promise<AdminContext | AuthFailure> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, status: 500, error: "Supabase environment not configured" };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleRow, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", sub)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    console.error("requireAdmin role check failed", roleError);
    return { ok: false, status: 500, error: "Admin role check failed" };
  }

  if (!roleRow) {
    return { ok: false, status: 403, error: "Forbidden — admin role required" };
  }

  return { ok: true, adminClient };
}
