# TradeOS — Sanitised Developer Review

This public repository is a **sanitised review snapshot** of the TradeOS production architecture.

It is intended for code/architecture review only. It contains **no live credentials, no Supabase project URL/key, no customer or tester data, no service-role secret, no private environment files, and no production Git history**.

## Review request

Start with `docs/SECOND_REVIEW_CHECKLIST.md`. The open review request is tracked in GitHub Issues so an independent developer can leave written findings without requiring access to the private production repository.

Please do not request or post production credentials, private database exports, customer/tester data or private environment files in this repository.

## Current architecture

- Expo / React Native
- TypeScript
- Supabase Auth + Postgres
- Native session persistence via `expo-secure-store`
- Multi-company membership model
- RLS is the tenant-security boundary
- Operational RPCs for timesheet workflow
- Owner/admin/manager/employee roles

## Included for review

- Native app shell and auth/session approach
- Workspace/company loading
- Job creation flow
- Timesheet operation wrappers
- Security notes and current review questions
- Independent review checklist and severity format

## Deliberately omitted

- Live environment variables
- Supabase project identifiers
- Real migration history and production data
- Tester/customer records
- Private repository metadata
- CI secrets

## Review focus

Please look especially at:

1. Auth/session handling on Expo/native.
2. Tenant isolation assumptions and RLS boundaries.
3. Role/permission design.
4. Timesheet create/submit/review workflow.
5. SECURITY DEFINER/authenticated RPC threat model.
6. Any place where client-side checks are being relied on too heavily.
7. Anything that should move to an Edge Function/server-side boundary.

This snapshot is not the production repository and should not be treated as deployable production code without the private schema/migrations and environment configuration.
