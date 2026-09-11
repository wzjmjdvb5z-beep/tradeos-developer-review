# TradeOS security review notes

This repository is a deliberately sanitised snapshot. It does not contain production credentials, customer/tester data, live environment configuration or the private production migration history.

## Intended security model

- The distributed Expo client receives only a Supabase **publishable** key.
- No service-role/server-secret credential belongs in the app.
- Native auth sessions are persisted with `expo-secure-store` rather than browser `localStorage`.
- RLS is the primary tenant boundary. Client-side `.eq('company_id', ...)` filtering is query correctness/defense-in-depth, not authorization.
- Role-based UI hiding is convenience only; privileged actions must be enforced in PostgreSQL/RLS and/or authenticated RPC/server boundaries.
- Operational roles are owner, admin, manager and employee.
- Managers may operate jobs/timesheets within intended permissions but must not be able to elevate membership roles.
- Sensitive workflow transitions are performed through controlled RPCs rather than unrestricted direct writes.

## Private production controls already implemented

The private production project now includes database controls for cross-company referential integrity, membership-role protection, last-owner protection, audit events, invitation acceptance boundaries, timesheet approval/revision rules, database-level overlap prevention, tenant-scoped beta feedback and authenticated account-deletion requests.

It also has automated database/integration tests for the core security and workflow invariants plus client/release secret-scanning checks. Those migrations, tests and live configuration are intentionally omitted here so this public review copy does not publish the production schema, identifiers or hardening history.

## Areas we specifically want challenged

- Is the SecureStore adapter/session lifecycle appropriate for Expo native?
- Are any client-side helpers accidentally being treated as authorization?
- Which operations should be Edge Functions/server-only rather than direct authenticated RLS/RPC access?
- Are owner/admin/manager/employee boundaries sensible?
- Are there likely IDOR/cross-tenant risks in the API surface shown here?
- Are SECURITY DEFINER RPCs an appropriate boundary where their bodies validate caller identity/tenant membership, and what additional safeguards should be required?
- Does invitation acceptance create any account-linking or email-ownership edge case?
- Are auth/deep-link flows likely to expose tokens or create replay problems?

## Known gates still open before real customer onboarding

- Independent human review of auth/RLS/SECURITY DEFINER boundaries.
- Hosted Supabase Auth callback configuration must be tested end-to-end on a signed physical-device build.
- Supabase leaked-password protection should be enabled when the production plan supports it.
- Signed release-build secret handling must be verified against the actual distributed binary.
- Wider production email delivery/rate limits should be configured before scaling beyond the founding cohort.

## Review instructions

Use `docs/SECOND_REVIEW_CHECKLIST.md` for the requested reviewer response format and severity levels. Report architecture/security findings only; do not request that production secrets, private database exports or customer/tester data be posted to this public repository.

## Important

A public publishable key is not a secret. Security must not depend on hiding it. A Supabase service-role key, secret API key, signing secret or other server credential must never be committed to or bundled in this client.
