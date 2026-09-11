# TradeOS database review snapshot

This folder exposes sanitised database-side logic for external technical review.

Included:
- representative RPCs used by the app for timesheet lifecycle changes
- assignment checks used before workers can create or edit time
- audit trigger functions for security-sensitive state changes
- RLS/grant notes showing the intended security boundary

Excluded on purpose:
- live project identifiers or credentials
- customer/tester data
- service-role secrets
- production-only operational history
- exact live migration history where it could reveal unnecessary environment details

The production database remains the source of truth. These files are review copies intended to make the server-side design inspectable without exposing live data or secrets.
