#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:3000/api}"
EMAIL="${EMAIL:-avery.chen@northstar.example}"
PASSWORD="${PASSWORD:-AdminPass123!}"
POST_ID="${POST_ID:-11111111-1111-1111-1111-111111112101}"

echo "Checking liveness: ${API_URL}/health/live"
curl --fail --silent "${API_URL}/health/live" | python3 -m json.tool

echo "Checking readiness: ${API_URL}/health/ready"
curl --fail --silent "${API_URL}/health/ready" | python3 -m json.tool

echo "Logging in as ${EMAIL}"
TOKEN="$(
  curl --fail --silent \
    -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" |
    python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])'
)"

echo "Enqueueing metric sync for post ${POST_ID}"
curl --fail --silent \
  -X POST "${API_URL}/posts/${POST_ID}/metric-sync" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
