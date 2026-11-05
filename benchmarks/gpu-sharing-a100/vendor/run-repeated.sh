#!/usr/bin/env bash
# Run from inside the prepared AIPerf pod after copying common/ to /work/common.
set -euo pipefail

LABEL="${1:?Usage: run-repeated.sh <profile-experiment>}"
REPEATS="${REPEATS:-3}"
NUM_MODELS="${NUM_MODELS:?Set NUM_MODELS explicitly for the experiment}"
RESULTS_DIR="${RESULTS_DIR:-/work/results}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! [[ "$LABEL" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]] ||
   ! [[ "$REPEATS" =~ ^[1-9][0-9]*$ ]] ||
   ! [[ "$NUM_MODELS" =~ ^[1-9][0-9]*$ ]]; then
  echo "Invalid run label, repeat count, or model count" >&2
  exit 1
fi
export NUM_MODELS RESULTS_DIR
export ENDPOINT_MODE="${ENDPOINT_MODE:-dns}"

for ((trial=1; trial<=REPEATS; trial++)); do
  printf -v run '%s-r%02d' "$LABEL" "$trial"
  destination="${RESULTS_DIR}/${run}"
  if [ -e "$destination" ]; then
    echo "Results already exist: $destination; choose a new label" >&2
    exit 1
  fi
  mkdir -p "$destination"
  cp "$SCRIPT_DIR/benchmark-plan.json" "$destination/benchmark-plan.json"
  set +e
  BENCHMARK_TRIAL="$trial" bash "$SCRIPT_DIR/run-sweep.sh" "$run" >"$destination/sweep.log" 2>&1
  status=$?
  set -e
  printf '%s\n' "$status" >"$destination/sweep.exit"
  if [ "$status" -ne 0 ]; then
    echo "Failed: $destination/sweep.log" >&2
    exit "$status"
  fi
  echo "Completed $run"
done
