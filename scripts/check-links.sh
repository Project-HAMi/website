#!/usr/bin/env bash

set -euo pipefail

host="${LINK_CHECK_HOST:-127.0.0.1}"
port="${LINK_CHECK_PORT:-3000}"
root_url="http://${host}:${port}"
tmpdir="$(mktemp -d)"
server_pid=""

cleanup() {
  if [[ -n "${server_pid}" ]]; then
    kill "${server_pid}" >/dev/null 2>&1 || true
    wait "${server_pid}" 2>/dev/null || true
  fi
  rm -rf "${tmpdir}"
}

trap cleanup EXIT INT TERM

python3 - "${host}" > "${tmpdir}/skip-args.txt" <<'PY'
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

host = sys.argv[1].lower()
pattern = re.compile(r"https?://[^\"'\s<>()]+")
internal_hosts = {host, "localhost"}
valid_host = re.compile(r"[a-z0-9.-]+")
hosts = set()

for path in Path("build").rglob("*.html"):
    text = path.read_text(errors="ignore")
    for match in pattern.finditer(text):
        url = match.group(0).rstrip(".,);")
        parsed_host = (urlparse(url).hostname or "").lower().rstrip(".")
        if not parsed_host or parsed_host in internal_hosts:
            continue
        if not valid_host.fullmatch(parsed_host):
            continue
        hosts.add(parsed_host)

for external_host in sorted(hosts):
    print("--skip")
    print(f"^https?://{re.escape(external_host)}(?:/|$)")
PY

npx --yes sirv-cli build -D -H "${host}" -p "${port}" > "${tmpdir}/sirv.log" 2>&1 &
server_pid=$!

for _ in $(seq 1 60); do
  if curl -fsS "${root_url}/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "${root_url}/" >/dev/null 2>&1 || {
  echo "Local server did not start within 60s. sirv log:"
  cat "${tmpdir}/sirv.log"
  exit 1
}

tmp_linkinator="${tmpdir}/linkinator.log"

set +e
xargs -d '\n' npx --yes linkinator "${root_url}" \
  --recurse \
  --concurrency 10 \
  --retry-errors \
  --retry-errors-count 2 \
  --verbosity error < "${tmpdir}/skip-args.txt" > "${tmp_linkinator}" 2>&1
linkinator_exit=$?
set -e

if [[ "${linkinator_exit}" -ne 0 ]]; then
  echo "Linkinator failed with exit code ${linkinator_exit}. Output:"
  cat "${tmp_linkinator}"
  echo "End of linkinator output. sirv log:"
  cat "${tmpdir}/sirv.log"
  exit "${linkinator_exit}"
fi
