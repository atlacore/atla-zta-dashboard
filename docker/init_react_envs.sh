#!/bin/bash
set -e

# Empty/unset means same-origin (relative /api) - a valid default for a
# dashboard served behind the same reverse proxy/WAF as the control plane.
export ATLA_API_ORIGIN=${ATLA_API_ORIGIN:-}
# Empty/unset disables Sentry client-side error reporting.
export ATLA_SENTRY_DSN=${ATLA_SENTRY_DSN:-}
# Empty/unset falls back to the default docs site baked into the dashboard.
export ATLA_DOCS_URL=${ATLA_DOCS_URL:-}
# The main (production) host shown in the client install commands; empty falls back to the built-in default.
export ATLA_PUBLIC_URL=${ATLA_PUBLIC_URL:-}

ENV_STR="\$\$ATLA_API_ORIGIN \$\$ATLA_SENTRY_DSN \$\$ATLA_DOCS_URL \$\$ATLA_PUBLIC_URL"
for f in $(grep -R -l -E 'ATLA_API_ORIGIN|ATLA_SENTRY_DSN|ATLA_DOCS_URL|ATLA_PUBLIC_URL' /usr/share/nginx/html 2>/dev/null); do
    cp "$f" "$f".copy
    envsubst "$ENV_STR" < "$f".copy > "$f"
    rm "$f".copy
done
