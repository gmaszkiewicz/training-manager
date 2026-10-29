# Timing: signed-in `/measurements` on production

## Method

`curl -w "%{time_total}"` against the signed-in production `/measurements`, with a session cookie copied from the browser, 5 runs per measurement:

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{time_total}\n" \
    -H "Cookie: <sb-...-auth-token cookie(s)>" \
    https://<production-host>/measurements
done
```

Median = 3rd value after sorting.

## Runs

| Run    | Date       | Worker version            | Values (s)                       | Median (s)     |
| ------ | ---------- | ------------------------- | -------------------------------- | -------------- |
| Before | 2026-10-29 | `main` before this change | min 0.359, max 1.20              | _not recorded_ |
| After  | 2026-10-29 | this change deployed      | mostly < 0.300, one outlier 1.20 | < 0.300        |

## Notes

- Hosted JWT signing keys: already on ES256 (checked 2026-10-29); no migration needed, so the after run already reflects local JWT verification.
- `/auth/v1/user` on a page load after deploy: none observed (2026-10-29)
- Smart Placement in the Cloudflare dashboard: Smart (2026-10-29)
- After vs before: the after median (< 0.300 s) is below the before minimum (0.359 s), so it is also below the before median. The single 1.20 s outlier matches the before maximum; likely causes are a Worker cold start, an access-token refresh (once per `jwt_expiry`, which still calls the auth server), or Smart Placement not yet settled.
