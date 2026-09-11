# TradeOS independent security / architecture review checklist

This repository is intentionally sanitised. Please review the architecture and code patterns shown here without requesting or publishing production credentials, customer/tester data, service-role keys, private environment files or private Git history.

## Review objective

Give a second-developer opinion on whether the native auth/session model, tenant boundary assumptions and privileged workflow boundaries are appropriate for a small multi-tenant field-service SaaS before real customer onboarding.

## Please review

### Native auth/session handling

- Expo / React Native session persistence approach.
- SecureStore adapter/session lifecycle.
- Deep-link/auth callback handling assumptions.
- Sign-out/session invalidation edge cases.
- Whether any auth token could be persisted or logged unsafely.

### Tenant isolation

- Whether client-side company filters are clearly treated as query correctness only, never authorization.
- Whether the RLS-first design is appropriate for multi-company membership.
- Likely IDOR/cross-tenant failure modes a production test suite should cover.
- Whether worker visibility should be narrower than manager/owner visibility.

### Privileged workflows

- When authenticated RPC + RLS is sufficient versus when an Edge Function/server-only boundary is preferable.
- Risks around SECURITY DEFINER functions callable by authenticated users.
- Invitation/acceptance threat model.
- Timesheet create/submit/review state transitions.
- Role-escalation and ownership-transfer risks.

### Mobile-client secrets

- Confirm the architecture requires only a client-safe publishable Supabase key in the distributed app.
- Flag any pattern that could encourage a service-role/server secret to be bundled in the client.

## What the private production project already tests

The private project now has automated database/integration coverage for tenant isolation and core workflow boundaries, including invitation lifecycle, timesheet permissions, overlap prevention, profitability access, feedback scope, membership name updates and account-deletion request boundaries. Those production migrations/tests are not reproduced in this public repository.

The second review should therefore focus on architecture assumptions, missing threat cases and places where the public snapshot suggests a stronger server boundary would be safer.

## Reviewer response format

Please classify findings as:

- **Critical** — likely cross-tenant access, credential exposure or destructive authorization bypass.
- **High** — plausible privilege escalation or security boundary weakness before customer data.
- **Medium** — hardening issue that should be scheduled before public launch.
- **Low / suggestion** — maintainability, clarity or defense-in-depth improvement.

For each finding, include the file/function, attack/failure scenario, expected security boundary and recommended fix. If no material issue is found in an area, say so explicitly rather than leaving it ambiguous.

## Completion criteria

The independent-review release gate is satisfied only after a human reviewer has provided written feedback, material findings have been triaged in the private production repository, and any Critical/High issue is resolved and regression-tested before onboarding real customer data.
