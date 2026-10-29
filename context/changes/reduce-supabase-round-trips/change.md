---
change_id: reduce-supabase-round-trips
title: Reduce sequential Supabase round trips per request
status: planned
created: 2026-10-29
updated: 2026-10-29
archived_at: null
---

## Notes

— Reduce sequential Supabase round trips per request: enable Cloudflare Smart Placement in wrangler.jsonc, switch middleware from auth.getUser() to auth.getClaims() (local JWT verification), and parallelize independent queries on /measurements (readPreviousMeasurement, getMeasurement, readMeasurementDays). Context: free-tier Supabase answers ~300ms per call; /measurements does ~7-8 sequential round trips (~2s+).
