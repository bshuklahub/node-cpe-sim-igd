#!/usr/bin/env bash
#
# build-cpe-image.sh — build & run the CPE simulator container image with podman.
#
# The image is named <DEVICE_OUI>-<DEVICE_PRODUCT_CLASS> (e.g. 00259E-HG8145V5),
# where the OUI and product class are read from acscoll.env
# (DEFAULT_CPE_OUI / DEFAULT_CPE_PRODUCTCLASS).
#
# The container has NO DNS, so the speedtest-server-gweu.onrender.com hostname
# is injected into the container's /etc/hosts via --add-host (the IP is
# resolved on the host at run time; override with CR_HOST_IP if needed).
#
# Usage:
#   ./build-cpe-image.sh [command]
#
# Commands:
#   build           Build the image (default)
#   run [--force]   Run the image (detached) with --add-host + --env-file
#                   (--force removes an existing container first)
#   build-and-run   Build, then run (existing container is removed first)
#   info            Print the resolved image name and CR host IP, then exit
#
# Env overrides:
#   CPE_ENV_FILE   env file to read (default: acscoll.env)
#   CR_HOST        hostname to add to /etc/hosts (default: speedtest-server-gweu.onrender.com)
#   CR_HOST_IP     manual IP for --add-host (auto-resolved if unset)
#   CPSIM_PORT     host port mapped to container port 5000 (default: 5000)
#   IMAGE_TAG      image tag (default: latest)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${CPE_ENV_FILE:-acscoll.env}"
CR_HOST="${CR_HOST:-speedtest-server-gweu.onrender.com}"
CR_HOST_IP="${CR_HOST_IP:-}"
HOST_PORT="${CPSIM_PORT:-5000}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

command -v podman >/dev/null 2>&1 || { echo "ERROR: podman not found in PATH" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE not found in $(pwd)" >&2; exit 1; }

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

# Read a KEY from an env file.
# Tolerates: leading whitespace, optional "export" prefix, spaces around '=',
# quoted values, inline-comment-free values. Last occurrence wins.
read_env_value() {
  local key="$1" file="$2" line
  line="$(grep -vE '^[[:space:]]*(#|$)' "$file" \
    | grep -E "^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=" \
    | tail -n 1)"
  [[ -n "$line" ]] || return 1
  printf '%s' "$line" \
    | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*//" \
    | sed -E "s/^[\"']//; s/[\"'][[:space:]]*$//"
}

# Write a podman/docker-compatible copy of the env file:
# "KEY = value" -> "KEY=value", comments/blank lines preserved.
normalize_env_file() {
  local dest="$1"
  awk '{
      if ($0 ~ /^[[:space:]]*#/ || $0 ~ /^[[:space:]]*$/) { print; next }
      line = $0
      sub(/^[[:space:]]*/, "", line)
      sub(/^export[[:space:]]+/, "", line)
      n = index(line, "=")
      if (n > 0) {
        key = substr(line, 1, n - 1)
        val = substr(line, n + 1)
        gsub(/[[:space:]]+$/, "", key)
        sub(/^[[:space:]]*/, "", val)
        sub(/[[:space:]]+$/, "", val)
        print key "=" val
      } else {
        print line
      }
    }' "$ENV_FILE" > "$dest"
}

resolve_cr_ip() {
  local ip=""
  ip="$(getent ahostsv4 "$CR_HOST" 2>/dev/null | awk 'NR==1 {print $1; exit}')"
  if [[ -z "$ip" ]]; then
    ip="$(getent ahosts "$CR_HOST" 2>/dev/null | awk 'NR==1 {print $1; exit}')"
  fi
  if [[ -z "$ip" ]] && command -v dig >/dev/null 2>&1; then
    ip="$(dig +short A "$CR_HOST" 2>/dev/null | head -n1)"
  fi
  printf '%s' "$ip"
}

# ---------------------------------------------------------------- parse env
OUI="$(read_env_value DEFAULT_CPE_OUI "$ENV_FILE" || true)"
PRODUCT_CLASS="$(read_env_value DEFAULT_CPE_PRODUCTCLASS "$ENV_FILE" || true)"
if [[ -z "$OUI" || -z "$PRODUCT_CLASS" ]]; then
  echo "ERROR: could not read DEFAULT_CPE_OUI / DEFAULT_CPE_PRODUCTCLASS from $ENV_FILE" >&2
  grep -nE 'DEFAULT_CPE_(OUI|PRODUCTCLASS)' "$ENV_FILE" || true
  exit 1
fi
if ! [[ "$OUI" =~ ^[A-Za-z0-9_.-]+$ && "$PRODUCT_CLASS" =~ ^[A-Za-z0-9_.-]+$ ]]; then
  echo "ERROR: OUI/ProductClass contain characters not allowed in an image name: '$OUI' / '$PRODUCT_CLASS'" >&2
  exit 1
fi

# Podman (like Docker/OCI) requires repository names to be lower-case, so the
# image name is the lower-cased OUI-PRODUCT_CLASS while the container name
# keeps the readable original case, e.g.:
#   image:     00259e-hg8145v5:latest
#   container: 00259E-HG8145V5
IMAGE_NAME_RAW="${OUI}-${PRODUCT_CLASS}"
IMAGE_NAME="$(printf '%s' "$IMAGE_NAME_RAW" | tr '[:upper:]' '[:lower:]')"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
CONTAINER_NAME="${IMAGE_NAME_RAW}"

# ---------------------------------------------------------------- commands
cmd_info() {
  echo "env file      : $ENV_FILE"
  echo "device OUI    : $OUI"
  echo "product class : $PRODUCT_CLASS"
  echo "image name    : $FULL_IMAGE (lower-cased per OCI rules)"
  echo "container name: $CONTAINER_NAME"
  local ip="${CR_HOST_IP:-$(resolve_cr_ip)}"
  echo "CR host       : $CR_HOST -> ${ip:-UNRESOLVED (set CR_HOST_IP)}"
}

cmd_build() {
  echo "==> Building image: $FULL_IMAGE"
  podman build -t "$FULL_IMAGE" .
  echo "==> Built. Run it with: $0 run"
}

cmd_run() {
  # Parse optional flags (e.g. --force to remove an existing container).
  local force=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--force|--rm-existing) force=1; shift ;;
      *) echo "ERROR: unknown option for 'run': $1" >&2; usage 1 ;;
    esac
  done

  tmp_env="$(mktemp)"
  # tmp_env is intentionally NOT local so the EXIT trap can clean it up safely
  # even after cmd_run has returned (guarded against set -u).
  trap 'if [[ -n "${tmp_env:-}" ]]; then rm -f "$tmp_env"; fi' EXIT
  normalize_env_file "$tmp_env"

  local ip="${CR_HOST_IP:-}"
  if [[ -z "$ip" ]]; then
    ip="$(resolve_cr_ip)"
  fi

  local add_host=()
  if [[ -n "$ip" ]]; then
    echo "==> Injecting /etc/hosts entry: $CR_HOST -> $ip (container has no DNS)"
    add_host=(--add-host "$CR_HOST:$ip")
  else
    echo "WARNING: could not resolve '$CR_HOST' on this host; CR registration/status will fail." >&2
    echo "         Set CR_HOST_IP to an IP for '$CR_HOST'." >&2
  fi

  if podman container exists "$CONTAINER_NAME" 2>/dev/null; then
    if [[ $force -eq 1 ]]; then
      echo "==> Removing existing container '$CONTAINER_NAME' (this deletes its writable layer/DB)"
      podman rm -f "$CONTAINER_NAME"
    else
      echo "ERROR: a container named '$CONTAINER_NAME' already exists." >&2
      echo "       Remove it first (careful: this deletes its writable layer/DB):" >&2
      echo "         podman rm -f $CONTAINER_NAME" >&2
      echo "       or re-run with: $0 run --force" >&2
      exit 1
    fi
  fi

  echo "==> Starting container '$CONTAINER_NAME' from $FULL_IMAGE"
  echo "    env-file: $ENV_FILE (normalized) | port: ${HOST_PORT}:5000"
  podman run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$tmp_env" \
    -p "${HOST_PORT}:5000" \
    "${add_host[@]}" \
    "$FULL_IMAGE"

  echo "==> Container started."
  echo "    UI:      http://localhost:${HOST_PORT}"
  echo "    logs:    podman logs -f $CONTAINER_NAME"
  echo "    stop:    podman stop $CONTAINER_NAME"
}

# ---------------------------------------------------------------- dispatch
CMD="${1:-build}"
case "$CMD" in
  build)          cmd_build ;;
  run)            shift; cmd_run "$@" ;;
  build-and-run)  cmd_build; cmd_run --force ;;
  info)           cmd_info ;;
  -h|--help|help) usage 0 ;;
  *)              echo "Unknown command: $CMD" >&2; usage 1 ;;
esac