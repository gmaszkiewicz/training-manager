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

| Run                 | Date       | Worker version                  | Values (s)          | Median (s)     |
| ------------------- | ---------- | ------------------------------- | ------------------- | -------------- |
| Before              | 2026-10-29 | `main` before this change       | min 0.359, max 1.20 | _not recorded_ |
| After               | _pending_  | this change deployed            | _pending_           | _pending_      |
| After key migration | _pending_  | this change + ES256 signing key | _pending_           | _pending_      |

Drop the last row if the hosted project already signed with an asymmetric key.

## Notes

- Hosted JWT signing keys: _pending_ (legacy HS256 secret, or already on signing keys?)
- `/auth/v1/user` on a page load after deploy: _pending_
- Smart Placement in the Cloudflare dashboard: _pending_
