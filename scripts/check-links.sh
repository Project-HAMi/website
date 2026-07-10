#!/usr/bin/env bash

set -euo pipefail

host="${LINK_CHECK_HOST:-127.0.0.1}"
port="${LINK_CHECK_PORT:-3000}"
root_url="http://${host}:${port}"
sirv_package="${SIRV_PACKAGE:-sirv-cli@3.0.1}"
linkinator_package="${LINKINATOR_PACKAGE:-linkinator@7.6.1}"
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

resolve_npx_bin() {
  local package="$1"
  local bin_name="$2"
  npx --yes --package "${package}" bash -lc "readlink -f \"\$(command -v ${bin_name})\""
}

print_linkinator_summary() {
  python3 - "${tmpdir}/linkinator.json" "${tmpdir}/linkinator.stderr" <<'PY'
import json
import sys
from pathlib import Path

stdout_path = Path(sys.argv[1])
stderr_path = Path(sys.argv[2])
stdout_text = stdout_path.read_text(errors="replace")
stderr_text = stderr_path.read_text(errors="replace").strip()

if not stdout_text.strip():
    print("Linkinator did not emit a JSON payload.")
    if stderr_text:
        print("linkinator stderr:")
        print(stderr_text)
    sys.exit(0)

try:
    payload = json.loads(stdout_text)
except json.JSONDecodeError as exc:
    print(f"Failed to parse linkinator JSON output: {exc}")
    print("Raw linkinator stdout:")
    print(stdout_text.rstrip())
    if stderr_text:
        print("linkinator stderr:")
        print(stderr_text)
    sys.exit(0)

links = payload.get("links") or []
problematic = []

for entry in links:
    state = str(entry.get("state") or "").upper()
    status = entry.get("status")
    http_error = status == 0 or (isinstance(status, int) and (status < 200 or status >= 400))
    if state in {"OK", "SKIPPED"} and not http_error:
        continue
    problematic.append(entry)

if problematic:
    print(f"Actionable link entries ({len(problematic)} total, showing up to 50):")
    for entry in problematic[:50]:
        status = entry.get("status", "<none>")
        state = entry.get("state", "<none>")
        url = entry.get("url") or "<missing url>"
        print(f"- status={status} state={state} url={url}")

        parent = entry.get("parent")
        parents = parent if isinstance(parent, list) else ([parent] if parent else [])
        for item in parents[:5]:
            print(f"  parent={item}")
        if len(parents) > 5:
            print(f"  parent=... {len(parents) - 5} more")

        failure = entry.get("failureDetails")
        if failure:
            if not isinstance(failure, str):
                failure = json.dumps(failure, ensure_ascii=False)
            print(f"  failureDetails={failure}")
else:
    print("Linkinator returned a non-zero exit code but no actionable link entries were present in the JSON payload.")
    print("Raw linkinator JSON:")
    print(json.dumps(payload, ensure_ascii=False))
    print("Check the sirv summary below for concrete missing paths.")

if stderr_text:
    print("linkinator stderr:")
    print(stderr_text)
PY
}

print_sirv_summary() {
  python3 - "${tmpdir}/sirv.log" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
pattern = re.compile(r"\[\d{2}:\d{2}:\d{2}\]\s+(\d{3})\s+.*\s+─\s+(.+)$")
offenders = []

for line in path.read_text(errors="replace").splitlines():
    match = pattern.search(line)
    if not match:
        continue
    status = int(match.group(1))
    if 200 <= status < 400:
        continue
    offenders.append(line)

if offenders:
    print("\n".join(offenders[:100]))
    if len(offenders) > 100:
        print(f"... truncated {len(offenders) - 100} additional sirv lines")
else:
    print("No non-2xx/3xx sirv responses captured.")
PY
}

sirv_bin="$(resolve_npx_bin "${sirv_package}" sirv)"
linkinator_cli="$(resolve_npx_bin "${linkinator_package}" linkinator)"

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

"${sirv_bin}" build -D -H "${host}" -p "${port}" > "${tmpdir}/sirv.log" 2>&1 &
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

skip_args=()
while IFS= read -r line; do
  skip_args+=("${line}")
done < "${tmpdir}/skip-args.txt"

set +e
# The human-readable formatter can fail without surfacing the offender URL under Node 20.
# Use the direct CLI + JSON path and print our own summary instead.
node "${linkinator_cli}" "${root_url}" \
  --recurse \
  --concurrency 10 \
  --retry-errors \
  --retry-errors-count 2 \
  --verbosity none \
  --format json \
  "${skip_args[@]}" > "${tmpdir}/linkinator.json" 2> "${tmpdir}/linkinator.stderr"
linkinator_exit=$?
set -e

if [[ "${linkinator_exit}" -ne 0 ]]; then
  echo "Linkinator failed with exit code ${linkinator_exit}. Summary:"
  print_linkinator_summary
  echo "End of linkinator summary. sirv non-2xx/3xx responses:"
  print_sirv_summary
  exit "${linkinator_exit}"
fi
