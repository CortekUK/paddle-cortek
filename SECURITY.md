Production security notes

1) CORS for edge functions
- Current functions allow `Access-Control-Allow-Origin: *`. For production, restrict to approved domains.
- Example (Deno):
  - Maintain an allowlist array of origins and echo the matched origin instead of `*`.
  - Return 403 for disallowed origins.

2) Supabase RLS
- Ensure org-level RLS policies on: `message_templates`, `scheduled_sends_v2`, `send_logs_v2`, `wa_messages_log`, `social_post_renders`.
- Verify all SELECT/INSERT/UPDATE/DELETE statements are restricted by `org_id` and authenticated user role.

3) Service-role usage
- Functions using service role (no user JWT) must only perform scoped writes with explicit columns.
- Avoid returning sensitive data; return only what the client needs.

4) Secrets management
- Store keys in environment (Supabase dashboard), never in client.
- Rotate keys regularly.


