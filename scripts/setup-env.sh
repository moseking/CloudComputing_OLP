#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
TEMPLATE="$ROOT_DIR/.env.example"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required to generate secrets and RS256 keys." >&2
  exit 1
fi
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: .env.example is missing from $ROOT_DIR." >&2
  exit 1
fi

umask 077
if [[ ! -e "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=CHANGE_ME.*$ ]]; then
      key="${BASH_REMATCH[1]}"
      line="$key=$(openssl rand -hex 32)"
    fi
    printf '%s\n' "$line"
  done < "$TEMPLATE" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created .env from .env.example with random local passwords and tokens."
else
  echo "Kept existing .env; it was not overwritten."
fi

secret_rel="$(sed -n 's/^OELP_SECRET_DIR=//p' "$ENV_FILE" | tr -d '\r' | tail -n 1)"
secret_rel="${secret_rel:-.secrets}"
case "$secret_rel" in
  .secrets|.secrets/*) ;;
  *) echo "Error: OELP_SECRET_DIR must be .secrets or a subdirectory of it." >&2; exit 1 ;;
esac
if [[ "$secret_rel" == *".."* ]]; then
  echo "Error: OELP_SECRET_DIR cannot contain parent-directory segments." >&2
  exit 1
fi
SECRET_DIR="$ROOT_DIR/$secret_rel"
PRIVATE_KEY="$SECRET_DIR/jwt-private.pem"
PUBLIC_KEY="$SECRET_DIR/jwt-public.pem"
mkdir -p "$SECRET_DIR"
chmod 700 "$SECRET_DIR"

if [[ -e "$PRIVATE_KEY" || -e "$PUBLIC_KEY" ]]; then
  if [[ ! -f "$PRIVATE_KEY" || ! -f "$PUBLIC_KEY" ]]; then
    echo "Error: found only one key file; preserve it and repair the key pair manually." >&2
    exit 1
  fi
  if ! openssl pkey -in "$PRIVATE_KEY" -pubout 2>/dev/null | cmp -s - "$PUBLIC_KEY"; then
    echo "Error: JWT public/private keys do not match." >&2
    exit 1
  fi
  # The host directory is 0700; the Compose file-secret mount must be readable
  # by the non-root appuser inside the service container.
  chmod 644 "$PRIVATE_KEY"
  chmod 644 "$PUBLIC_KEY"
  echo "Kept and verified the existing RS256 key pair."
else
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_KEY" 2>/dev/null
  openssl pkey -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"
  # The host directory is 0700; the Compose file-secret mount must be readable
  # by the non-root appuser inside the service container.
  chmod 644 "$PRIVATE_KEY"
  chmod 644 "$PUBLIC_KEY"
  echo "Generated a new RS256 key pair in $secret_rel/."
fi

echo "Environment is ready. Review .env before setting NGINX_BIND_ADDRESS for a cloud VM."
