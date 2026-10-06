#!/bin/bash
set -e

# Empty/unset means same-origin (relative /api) - a valid default for a
# dashboard served behind the same reverse proxy/WAF as the control plane.
export ATLA_API_ORIGIN=${ATLA_API_ORIGIN:-}
# Empty/unset disables Sentry client-side error reporting.
export ATLA_SENTRY_DSN=${ATLA_SENTRY_DSN:-}

ENV_STR="\$\$ATLA_API_ORIGIN \$\$ATLA_SENTRY_DSN"
for f in $(grep -R -l -E 'ATLA_API_ORIGIN|ATLA_SENTRY_DSN' /usr/share/nginx/html 2>/dev/null); do
    cp "$f" "$f".copy
    envsubst "$ENV_STR" < "$f".copy > "$f"
    rm "$f".copy
done
