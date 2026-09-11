# TradeOS security review notes

This repository is a deliberately sanitised snapshot. It does not contain the production database migrations or live environment configuration.

## Intended security model

- The distributed Expo client only receives a Supabase **publishable** key.
- No service-role key belongs in the app.
- Native auth sessions are persisted with `expo-secure-store` rather than browser `localStorage`.
- RLS is the primary tenant boundary. Client-side `.eq('company_id', ...)` filtering is defense-in-depth and query correctness, not authorization.
- Role-based UI hiding is convenience only; privileged actions must be enforced by RLS and/or authenticated RPCs.
- Operational roles are owner, admin, manager and employee.
- Managers may operate jobs/timesheets but must not be able to elevate memberships.
- Timesheet state transitions are performed through RPCs rather than unrestricted direct writes.

## Production controls already designed in the private project

The private project has database controls for cross-company referential integrity, membership-role protection, last-owner protection, audit events and controlled timesheet approval/revision flows. Those migrations are intentionally omitted here so the public review copy does not publish the production schema and hardening history.

## Areas we specifically want challenged

- Is the SecureStore adapter/session lifecycle appropriate for Expo native?
- Are any client-side helpers accidentally being treated as authorization?
- Which operations should be Edge Functions rather than direct RLS/RPC access?
- Are owner/admin/manager boundaries sensible?
- Should job assignment and timesheet visibility be narrower for managers/employees?
- How should invitations be implemented without exposing privileged credentials?
- Any likely IDOR/cross-tenant risks in the API surface shown here?

## Known work still to complete before real customer data

- Convert rollback-only database security checks into committed automated integration tests.
- Verify release-build secret handling.
- Independent review of SECURITY DEFINER RPC boundaries.
- Enable Supabase Auth leaked-password protection.
- Add DB-level timesheet overlap/duplicate prevention and an explicit withdrawal flow.
- Pin dependency versions and commit a lockfile.

## Important

A public publishable key is not a secret. Security must not depend on hiding it. A Supabase service-role key, signing secret or any server credential must never be committed to or bundled in this client.
