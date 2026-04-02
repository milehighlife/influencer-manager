#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FLOW_TEMPLATE="$ROOT_DIR/apps/mobile/maestro/creator-workspace-smoke.yaml"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
JAVA_HOME_DEFAULT="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
ANDROID_SDK_ROOT_DEFAULT="$HOME/Library/Android/sdk"

export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
EXPO_URL="${EXPO_URL:-exp://127.0.0.1:8081}"
CREATOR_EMAIL="${CREATOR_EMAIL:-nina@creatormail.example}"
CREATOR_PASSWORD="${CREATOR_PASSWORD:-CreatorPass123!}"
RESET_CREATOR_RUNTIME_SEED="${RESET_CREATOR_RUNTIME_SEED:-1}"
MOBILE_RUNTIME_PLATFORM="${MOBILE_RUNTIME_PLATFORM:-ios}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$ANDROID_SDK_ROOT_DEFAULT}}"
ADB_BIN="${ADB_BIN:-}"
SIMULATOR_UDID="${SIMULATOR_UDID:-}"
ANDROID_SERIAL="${ANDROID_SERIAL:-}"
MAESTRO_DEVICE=""
EXPO_GO_APP_ID=""
FLOW_FILE="$(mktemp "${TMPDIR:-/tmp}/creator-workspace-smoke.XXXXXX").yaml"

trap 'rm -f "$FLOW_FILE"' EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

cleanup_stale_maestro_port_listener() {
  local pid
  pid="$(lsof -tiTCP:7001 -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"

  if [[ -z "$pid" ]]; then
    return
  fi

  local command
  command="$(ps -p "$pid" -o command= 2>/dev/null || true)"

  if [[ "$command" == *maestro* ]] || [[ "$command" == *xcodebuild* ]]; then
    kill "$pid" >/dev/null 2>&1 || true
    sleep 2
  fi
}

resolve_adb() {
  if [[ -n "$ADB_BIN" && -x "$ADB_BIN" ]]; then
    printf '%s\n' "$ADB_BIN"
    return
  fi

  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return
  fi

  if [[ -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]]; then
    printf '%s\n' "$ANDROID_SDK_ROOT/platform-tools/adb"
    return
  fi

  return 1
}

prepare_flow_file() {
  sed "s/^appId: .*/appId: $EXPO_GO_APP_ID/" "$FLOW_TEMPLATE" >"$FLOW_FILE"
}

prepare_ios_runtime() {
  require_command xcrun

  if [[ -z "$SIMULATOR_UDID" ]]; then
    SIMULATOR_UDID="$(
      xcrun simctl list devices booted -j | node -e 'const fs=require("fs");const data=JSON.parse(fs.readFileSync(0,"utf8"));const booted=Object.values(data.devices).flat().find((device)=>device.state==="Booted");if(!booted){process.exit(1)}process.stdout.write(booted.udid)'
    )"
  fi

  MAESTRO_DEVICE="$SIMULATOR_UDID"
  EXPO_GO_APP_ID="host.exp.Exponent"

  if ! xcrun simctl listapps "$SIMULATOR_UDID" | grep -q "host.exp.Exponent"; then
    echo "Expo Go is not installed on the booted simulator." >&2
    exit 1
  fi

  EXPO_DATA_DIR="$(xcrun simctl get_app_container "$SIMULATOR_UDID" host.exp.Exponent data)"
  EXPERIENCE_DIR="$(find "$EXPO_DATA_DIR/Documents/ExponentExperienceData/@anonymous" -maxdepth 1 -type d -name 'influencer-campaign-manager-*' | head -n 1)"

  if [[ -z "$EXPERIENCE_DIR" ]]; then
    cat >&2 <<'EOF'
Creator runtime smoke requires the mobile project to already be loaded in Expo Go once.

Start the app in another terminal first:
  cd apps/mobile
  npx expo start --ios --host localhost

Then re-run this smoke command.
EOF
    exit 1
  fi

  xcrun simctl terminate "$SIMULATOR_UDID" host.exp.Exponent >/dev/null 2>&1 || true
  rm -rf "$EXPERIENCE_DIR/RCTAsyncLocalStorage"
  mkdir -p "$EXPERIENCE_DIR/RCTAsyncLocalStorage"
  xcrun simctl launch "$SIMULATOR_UDID" host.exp.Exponent >/dev/null
  sleep 2
  xcrun simctl openurl "$SIMULATOR_UDID" "$EXPO_URL" >/dev/null
}

prepare_android_runtime() {
  local adb_path
  adb_path="$(resolve_adb)" || {
    cat >&2 <<EOF
Android runtime smoke requires adb.

Install Android platform tools or set ADB_BIN/ANDROID_SDK_ROOT, then re-run:
  npm run test:runtime:creator:android --workspace @influencer-manager/mobile
EOF
    exit 1
  }
  ADB_BIN="$adb_path"

  if [[ -z "$ANDROID_SERIAL" ]]; then
    ANDROID_SERIAL="$("$ADB_BIN" devices | awk '$2 == "device" { print $1; exit }')"
  fi

  if [[ -z "$ANDROID_SERIAL" ]]; then
    cat >&2 <<'EOF'
Android runtime smoke requires a booted Android emulator or connected Android device with USB debugging enabled.

Start Expo and open the app on Android first:
  cd apps/mobile
  npx expo start --android --host localhost

Then re-run this smoke command.
EOF
    exit 1
  fi

  MAESTRO_DEVICE="$ANDROID_SERIAL"
  EXPO_GO_APP_ID="host.exp.exponent"

  if ! "$ADB_BIN" -s "$ANDROID_SERIAL" shell pm list packages | tr -d '\r' | grep -q '^package:host.exp.exponent$'; then
    echo "Expo Go is not installed on the connected Android runtime target." >&2
    exit 1
  fi

  "$ADB_BIN" -s "$ANDROID_SERIAL" reverse tcp:8081 tcp:8081 >/dev/null
  "$ADB_BIN" -s "$ANDROID_SERIAL" reverse tcp:3000 tcp:3000 >/dev/null
  "$ADB_BIN" -s "$ANDROID_SERIAL" shell pm clear host.exp.exponent >/dev/null
  "$ADB_BIN" -s "$ANDROID_SERIAL" shell am start -W -a android.intent.action.VIEW -d "$EXPO_URL" host.exp.exponent >/dev/null
  sleep 3
  "$ADB_BIN" -s "$ANDROID_SERIAL" shell am start -W -a android.intent.action.VIEW -d "$EXPO_URL" host.exp.exponent >/dev/null
  sleep 15
}

if [[ ! -x "$MAESTRO_BIN" ]]; then
  echo "Maestro CLI not found at $MAESTRO_BIN" >&2
  exit 1
fi

require_command curl
require_command node
require_command npm

curl -sf "$API_BASE_URL/health/live" >/dev/null
curl -sf "http://127.0.0.1:8081" >/dev/null

if [[ "$RESET_CREATOR_RUNTIME_SEED" == "1" ]]; then
  (
    cd "$ROOT_DIR"
    npm run db:seed >/dev/null
  )
  curl -sf "$API_BASE_URL/health/live" >/dev/null
fi

case "$MOBILE_RUNTIME_PLATFORM" in
  ios)
    prepare_ios_runtime
    ;;
  android)
    prepare_android_runtime
    ;;
  *)
    echo "Unsupported MOBILE_RUNTIME_PLATFORM: $MOBILE_RUNTIME_PLATFORM" >&2
    exit 1
    ;;
esac

prepare_flow_file

cleanup_stale_maestro_port_listener

RUNTIME_ENV="$(
  API_BASE_URL="$API_BASE_URL" \
  CREATOR_EMAIL="$CREATOR_EMAIL" \
  CREATOR_PASSWORD="$CREATOR_PASSWORD" \
  node <<'NODE'
const apiBaseUrl = process.env.API_BASE_URL;
const email = process.env.CREATOR_EMAIL;
const password = process.env.CREATOR_PASSWORD;

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return body;
}

function quote(value) {
  return JSON.stringify(String(value));
}

const login = await request("/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

const token = login.access_token;
const headers = {
  Authorization: `Bearer ${token}`,
};

const [digest, assignments, posts] = await Promise.all([
  request("/influencer/status-digest?limit=20", { headers }),
  request("/influencer/assignments?page=1&limit=25&sort_by=updated_at", { headers }),
  request("/influencer/posts?page=1&limit=25", { headers }),
]);

if (!digest.items?.length) {
  throw new Error("Creator status digest returned no items. Seeded creator signals are required for runtime smoke.");
}

if (!assignments.data?.length) {
  throw new Error("Creator assignments returned no rows. Seeded creator assignments are required for runtime smoke.");
}

if (!posts.data?.length) {
  throw new Error("Creator posts returned no rows. Seeded creator posts are required for runtime smoke.");
}

const approvedAssignment = assignments.data.find((assignment) => assignment.assignment_status === "approved");
const submitAssignment = assignments.data.find(
  (assignment) =>
    assignment.assignment_status === "in_progress" &&
    assignment.deliverable_count_submitted === 0,
);
const rejectedAssignment = assignments.data.find(
  (assignment) => assignment.assignment_status === "rejected",
);
const trackedPost = posts.data.find((post) => Boolean(post.performance_snapshots[0]));

if (!approvedAssignment || !submitAssignment || !rejectedAssignment || !trackedPost) {
  throw new Error(
    "Runtime smoke requires one approved assignment, one in-progress assignment, one rejected assignment, and one tracked post in the seeded creator dataset.",
  );
}

const [approvedDetail, rejectedDetail, performance] = await Promise.all([
  request(`/influencer/assignments/${approvedAssignment.id}`, { headers }),
  request(`/influencer/assignments/${rejectedAssignment.id}`, { headers }),
  request(`/influencer/posts/${trackedPost.id}/performance`, { headers }),
]);

const linkDeliverable = approvedDetail.deliverables.find(
  (deliverable) => deliverable.status === "approved",
);

if (!linkDeliverable) {
  throw new Error(
    "Runtime smoke requires one approved deliverable on the approved creator assignment for link-post coverage.",
  );
}

const firstStatusDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date(digest.items[0].updated_at));
const firstStatusRowText = [
  digest.items[0].title,
  `Last updated ${firstStatusDate}`,
  digest.items[0].description,
  digest.items[0].badge_label,
].join(" ");

function formatStatus(status) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAssignmentStatus(status) {
  switch (status) {
    case "submitted":
      return "Awaiting Review";
    case "rejected":
      return "Changes Requested";
    case "approved":
      return "Approved";
    default:
      return formatStatus(status);
  }
}

function getAssignmentPrompt(status) {
  switch (status) {
    case "assigned":
      return "Needs your confirmation";
    case "accepted":
      return "Ready to move into production";
    case "in_progress":
      return "Prepare your deliverable for review";
    case "submitted":
      return "Waiting on reviewer feedback";
    case "approved":
      return "Link the published post next";
    case "rejected":
      return "Review notes and resubmit";
    case "completed":
      return "No further action needed";
    default:
      return "Check the latest assignment update";
  }
}

function formatPlatform(value) {
  if (!value) {
    return "Unknown";
  }

  if (value === "x") {
    return "X";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildAssignmentRowText(assignment, assignmentStatus = assignment.assignment_status) {
  return [
    assignment.action.title,
    `${assignment.action.mission.campaign.name} • ${formatPlatform(assignment.action.platform)}`,
    `Due ${formatDate(assignment.due_date)} • ${assignment.action.mission.name} • ${getAssignmentPrompt(assignmentStatus)}`,
    formatAssignmentStatus(assignmentStatus),
  ].join(" ");
}

const approvedAssignmentRowText = buildAssignmentRowText(approvedAssignment);
const submitAssignmentRowText = buildAssignmentRowText(submitAssignment);
const submitResultRowText = buildAssignmentRowText(submitAssignment, "submitted");
const rejectedAssignmentRowText = buildAssignmentRowText(rejectedAssignment);
const rejectedResultRowText = buildAssignmentRowText(rejectedAssignment, "submitted");

function buildStatusRowId(type, scope) {
  return `creator-status-row-${type}-${scope}`;
}

const linkPostUrl = "https://instagram.com/p/runtime_smoke_link";
const linkPostExternalId = "runtime_smoke_link";
const linkPostPostedAt = "2026-03-15T18:00:00.000Z";
const linkPostCaption = `${approvedAssignment.action.title} runtime smoke linked post`;
const linkPostRowText = [
  linkPostUrl,
  `Instagram • Posted ${formatDate(linkPostPostedAt)}`,
  "Awaiting first metric snapshot. The post is linked and ready for tracking.",
  "Pending",
].join(" ");

const postDescription = trackedPost.performance_snapshots[0]
  ? `Latest impressions ${new Intl.NumberFormat("en-US").format(trackedPost.performance_snapshots[0].impressions)} • Latest likes ${new Intl.NumberFormat("en-US").format(trackedPost.performance_snapshots[0].likes)} • Captured ${formatDate(trackedPost.performance_snapshots[0].captured_at)}`
  : "Awaiting first metric snapshot. The post is linked and ready for tracking.";
const postRowText = [
  trackedPost.post_url,
  `${formatPlatform(trackedPost.platform)} • Posted ${formatDate(trackedPost.posted_at)}`,
  postDescription,
  trackedPost.performance_snapshots[0] ? "Tracked" : "Pending",
].join(" ");

const revisionFeedback =
  rejectedDetail.deliverables.find((deliverable) => deliverable.status === "rejected")
    ?.rejection_reason ?? "A reviewer requested changes before this work can be approved.";

const env = {
  STATUS_ROW_TEXT: firstStatusRowText,
  APPROVED_ASSIGNMENT_ID: approvedAssignment.id,
  APPROVED_ASSIGNMENT_TITLE: approvedAssignment.action.title,
  APPROVED_ASSIGNMENT_ROW_TEXT: approvedAssignmentRowText,
  APPROVED_ASSIGNMENT_SEARCH: approvedAssignment.action.title,
  LINK_POST_DELIVERABLE_ID: linkDeliverable.id,
  LINK_POST_URL: linkPostUrl,
  LINK_POST_URL_TOKEN: "runtime_smoke_link",
  LINK_POST_EXTERNAL_ID: linkPostExternalId,
  LINK_POST_POSTED_AT: linkPostPostedAt,
  LINK_POST_POSTED_DATE: formatDate(linkPostPostedAt),
  LINK_POST_CAPTION: linkPostCaption,
  LINK_POST_DETAIL_STATUS: "Awaiting Metrics",
  LINK_POST_ROW_TEXT: linkPostRowText,
  LINK_POST_STATUS_ROW_ID: buildStatusRowId("post_linked", linkPostExternalId),
  SUBMIT_ASSIGNMENT_ID: submitAssignment.id,
  SUBMIT_ASSIGNMENT_TITLE: submitAssignment.action.title,
  SUBMIT_ASSIGNMENT_ROW_TEXT: submitAssignmentRowText,
  SUBMIT_ASSIGNMENT_RESULT_ROW_TEXT: submitResultRowText,
  SUBMIT_STATUS_ROW_ID: buildStatusRowId(
    "submission_in_review",
    submitAssignment.id,
  ),
  SUBMIT_ASSIGNMENT_SEARCH: submitAssignment.action.title,
  SUBMIT_DELIVERABLE_NOTES: `${submitAssignment.action.title} runtime smoke draft note`,
  SUBMIT_DELIVERABLE_LINK: "https://drive.example.com/runtime-smoke-submit",
  REJECTED_ASSIGNMENT_ID: rejectedAssignment.id,
  REJECTED_ASSIGNMENT_TITLE: rejectedAssignment.action.title,
  REJECTED_ASSIGNMENT_ROW_TEXT: rejectedAssignmentRowText,
  REJECTED_ASSIGNMENT_RESULT_ROW_TEXT: rejectedResultRowText,
  REJECTED_STATUS_ROW_ID: buildStatusRowId(
    "submission_in_review",
    rejectedAssignment.id,
  ),
  REJECTED_ASSIGNMENT_SEARCH: rejectedAssignment.action.title,
  REJECTED_REVISION_FEEDBACK: revisionFeedback,
  REJECTED_DELIVERABLE_NOTES: `${rejectedAssignment.action.title} revised runtime smoke note`,
  REJECTED_DELIVERABLE_LINK: "https://drive.example.com/runtime-smoke-resubmit",
  POST_ID: trackedPost.id,
  POST_ROW_TEXT: postRowText,
  POST_URL: trackedPost.post_url,
  POST_PERFORMANCE_IMPRESSIONS: new Intl.NumberFormat("en-US").format(
    performance.summary.total_impressions,
  ),
  POST_PERFORMANCE_LIKES: new Intl.NumberFormat("en-US").format(
    performance.latest_snapshot?.likes ?? 0,
  ),
  TOTAL_POSTS: String(posts.summary.total_posts),
  TOTAL_POSTS_AFTER_LINK: String(posts.summary.total_posts + 1),
  TRACKED_POSTS: String(posts.summary.tracked_posts),
  TRACKED_POSTS_AFTER_LINK: String(posts.summary.tracked_posts),
  PENDING_SYNC_POSTS: String(posts.summary.pending_sync_posts),
  PENDING_SYNC_POSTS_AFTER_LINK: String(posts.summary.pending_sync_posts + 1),
  DIGEST_SCOPE_COPY: `This screen shows the latest ${digest.limit} creator workflow signals by update time. The badge shows items that still need action, not a read or unread count.`,
};

for (const [key, value] of Object.entries(env)) {
  console.log(`${key}=${quote(value)}`);
}
NODE
)"

while IFS='=' read -r key value; do
  [[ -z "$key" ]] && continue
  export "$key=${value:1:${#value}-2}"
done <<< "$RUNTIME_ENV"

"$MAESTRO_BIN" test "$FLOW_FILE" \
  --device "$MAESTRO_DEVICE" \
  -e MOBILE_RUNTIME_PLATFORM="$MOBILE_RUNTIME_PLATFORM" \
  -e EXPO_URL="$EXPO_URL" \
  -e CREATOR_EMAIL="$CREATOR_EMAIL" \
  -e CREATOR_PASSWORD="$CREATOR_PASSWORD" \
  -e STATUS_ROW_TEXT="$STATUS_ROW_TEXT" \
  -e APPROVED_ASSIGNMENT_ID="$APPROVED_ASSIGNMENT_ID" \
  -e APPROVED_ASSIGNMENT_TITLE="$APPROVED_ASSIGNMENT_TITLE" \
  -e APPROVED_ASSIGNMENT_ROW_TEXT="$APPROVED_ASSIGNMENT_ROW_TEXT" \
  -e APPROVED_ASSIGNMENT_SEARCH="$APPROVED_ASSIGNMENT_SEARCH" \
  -e LINK_POST_DELIVERABLE_ID="$LINK_POST_DELIVERABLE_ID" \
  -e LINK_POST_URL="$LINK_POST_URL" \
  -e LINK_POST_URL_TOKEN="$LINK_POST_URL_TOKEN" \
  -e LINK_POST_EXTERNAL_ID="$LINK_POST_EXTERNAL_ID" \
  -e LINK_POST_POSTED_AT="$LINK_POST_POSTED_AT" \
  -e LINK_POST_POSTED_DATE="$LINK_POST_POSTED_DATE" \
  -e LINK_POST_CAPTION="$LINK_POST_CAPTION" \
  -e LINK_POST_DETAIL_STATUS="$LINK_POST_DETAIL_STATUS" \
  -e LINK_POST_ROW_TEXT="$LINK_POST_ROW_TEXT" \
  -e LINK_POST_STATUS_ROW_ID="$LINK_POST_STATUS_ROW_ID" \
  -e SUBMIT_ASSIGNMENT_ID="$SUBMIT_ASSIGNMENT_ID" \
  -e SUBMIT_ASSIGNMENT_TITLE="$SUBMIT_ASSIGNMENT_TITLE" \
  -e SUBMIT_ASSIGNMENT_ROW_TEXT="$SUBMIT_ASSIGNMENT_ROW_TEXT" \
  -e SUBMIT_ASSIGNMENT_RESULT_ROW_TEXT="$SUBMIT_ASSIGNMENT_RESULT_ROW_TEXT" \
  -e SUBMIT_STATUS_ROW_ID="$SUBMIT_STATUS_ROW_ID" \
  -e SUBMIT_ASSIGNMENT_SEARCH="$SUBMIT_ASSIGNMENT_SEARCH" \
  -e SUBMIT_DELIVERABLE_NOTES="$SUBMIT_DELIVERABLE_NOTES" \
  -e SUBMIT_DELIVERABLE_LINK="$SUBMIT_DELIVERABLE_LINK" \
  -e REJECTED_ASSIGNMENT_ID="$REJECTED_ASSIGNMENT_ID" \
  -e REJECTED_ASSIGNMENT_TITLE="$REJECTED_ASSIGNMENT_TITLE" \
  -e REJECTED_ASSIGNMENT_ROW_TEXT="$REJECTED_ASSIGNMENT_ROW_TEXT" \
  -e REJECTED_ASSIGNMENT_RESULT_ROW_TEXT="$REJECTED_ASSIGNMENT_RESULT_ROW_TEXT" \
  -e REJECTED_STATUS_ROW_ID="$REJECTED_STATUS_ROW_ID" \
  -e REJECTED_ASSIGNMENT_SEARCH="$REJECTED_ASSIGNMENT_SEARCH" \
  -e REJECTED_REVISION_FEEDBACK="$REJECTED_REVISION_FEEDBACK" \
  -e REJECTED_DELIVERABLE_NOTES="$REJECTED_DELIVERABLE_NOTES" \
  -e REJECTED_DELIVERABLE_LINK="$REJECTED_DELIVERABLE_LINK" \
  -e POST_ID="$POST_ID" \
  -e POST_ROW_TEXT="$POST_ROW_TEXT" \
  -e POST_URL="$POST_URL" \
  -e POST_PERFORMANCE_IMPRESSIONS="$POST_PERFORMANCE_IMPRESSIONS" \
  -e POST_PERFORMANCE_LIKES="$POST_PERFORMANCE_LIKES" \
  -e TOTAL_POSTS="$TOTAL_POSTS" \
  -e TOTAL_POSTS_AFTER_LINK="$TOTAL_POSTS_AFTER_LINK" \
  -e TRACKED_POSTS="$TRACKED_POSTS" \
  -e TRACKED_POSTS_AFTER_LINK="$TRACKED_POSTS_AFTER_LINK" \
  -e PENDING_SYNC_POSTS="$PENDING_SYNC_POSTS" \
  -e PENDING_SYNC_POSTS_AFTER_LINK="$PENDING_SYNC_POSTS_AFTER_LINK" \
  -e DIGEST_SCOPE_COPY="$DIGEST_SCOPE_COPY"
