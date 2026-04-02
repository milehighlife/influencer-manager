import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  actionAssignmentsApi,
  actionsApi,
  authApi,
  campaignsApi,
  deliverablesApi,
  influencersApi,
  missionsApi,
  postsApi,
  reportsApi,
} from "./services/api";
import { clearSessionToken, getSessionToken } from "./services/auth/session";
import { useAuthStore } from "./state/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    text: async () => JSON.stringify(body),
  };
}

describe("mobile service flow", () => {
  const fetchMock = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    clearSessionToken();
    useAuthStore.setState({
      accessToken: null,
      user: null,
      hasHydrated: true,
      sessionValidated: false,
      isAuthenticating: false,
    });

    fetchMock.mockImplementation(async (...args: any[]) => {
      const [input, init] = args as [unknown, RequestInit | undefined];
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : String((input as { url?: string }).url ?? "");
      const { pathname, search } = new URL(requestUrl);
      const method = init?.method ?? "GET";
      const route = `${method} ${pathname}${search}`;

      switch (route) {
        case "POST http://localhost:3000/api/auth/login":
        case "POST /api/auth/login":
          return jsonResponse(
            {
              access_token: "token-123",
              user: {
                id: "11111111-1111-1111-1111-111111111201",
                email: "avery.chen@northstar.example",
                fullName: "Avery Chen",
                organizationId: "11111111-1111-1111-1111-111111111111",
                role: "organization_admin",
                status: "active",
              },
            },
            201,
          );
        case "GET /api/auth/me":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111201",
            email: "avery.chen@northstar.example",
            fullName: "Avery Chen",
            organizationId: "11111111-1111-1111-1111-111111111111",
            role: "organization_admin",
            status: "active",
          });
        case "GET /api/campaigns?page=1&limit=5":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111501",
                company_id: "11111111-1111-1111-1111-111111111401",
                name: "Summer Glow Serum Launch",
                description: "Launch campaign for the summer serum line.",
                start_date: "2026-03-01T00:00:00.000Z",
                end_date: "2026-04-01T00:00:00.000Z",
                budget: 25000,
                status: "active",
                campaign_type: "product_launch",
                created_at: "2026-03-01T00:00:00.000Z",
                updated_at: "2026-03-01T00:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
          });
        case "GET /api/action-assignments?page=1&limit=8":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111901",
                action_id: "11111111-1111-1111-1111-111111111701",
                influencer_id: "11111111-1111-1111-1111-111111111801",
                assignment_status: "approved",
                assigned_at: "2026-03-09T10:00:00.000Z",
                due_date: "2026-03-16T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 1,
                created_at: "2026-03-09T10:00:00.000Z",
                updated_at: "2026-03-09T10:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 8, total: 1, totalPages: 1 },
          });
        case "GET /api/action-assignments?page=1&limit=5&assignment_status=submitted":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111902",
                action_id: "11111111-1111-1111-1111-111111111702",
                influencer_id: "11111111-1111-1111-1111-111111111802",
                assignment_status: "submitted",
                assigned_at: "2026-03-10T10:00:00.000Z",
                due_date: "2026-03-17T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 2,
                deliverable_count_submitted: 2,
                created_at: "2026-03-10T10:00:00.000Z",
                updated_at: "2026-03-12T09:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
          });
        case "GET /api/action-assignments?page=1&limit=5&assignment_status=rejected":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111903",
                action_id: "11111111-1111-1111-1111-111111111703",
                influencer_id: "11111111-1111-1111-1111-111111111803",
                assignment_status: "rejected",
                assigned_at: "2026-03-08T10:00:00.000Z",
                due_date: "2026-03-15T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 1,
                created_at: "2026-03-08T10:00:00.000Z",
                updated_at: "2026-03-12T12:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
          });
        case "GET /api/influencers?page=1&limit=50":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111801",
                name: "Nova Blake",
                handle: "@novablake",
                primary_platform: "instagram",
                email: "nova@example.com",
                location: "Austin, TX",
                audience_description: "Beauty and skincare enthusiasts.",
                niche_tags: ["beauty", "skincare"],
                status: "active",
                created_at: "2026-02-01T00:00:00.000Z",
                updated_at: "2026-02-01T00:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
          });
        case "GET /api/campaigns/11111111-1111-1111-1111-111111111501/planning-view":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111501",
            company_id: "11111111-1111-1111-1111-111111111401",
            name: "Summer Glow Serum Launch",
            description: "Launch campaign for the summer serum line.",
            start_date: "2026-03-01T00:00:00.000Z",
            end_date: "2026-04-01T00:00:00.000Z",
            budget: 25000,
            status: "active",
            campaign_type: "product_launch",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            company: {
              id: "11111111-1111-1111-1111-111111111401",
              client_id: "11111111-1111-1111-1111-111111111301",
              name: "Glow Labs",
              description: "Beauty product company.",
              status: "active",
              created_at: "2026-02-01T00:00:00.000Z",
              updated_at: "2026-02-01T00:00:00.000Z",
            },
            missions: [
              {
                id: "11111111-1111-1111-1111-111111111601",
                campaign_id: "11111111-1111-1111-1111-111111111501",
                name: "Awareness Burst",
                description: "Seed creators with first-look content.",
                sequence_order: 1,
                start_date: "2026-03-05T00:00:00.000Z",
                end_date: "2026-03-12T00:00:00.000Z",
                status: "active",
                created_at: "2026-03-05T00:00:00.000Z",
                updated_at: "2026-03-05T00:00:00.000Z",
                actions: [
                  {
                    id: "11111111-1111-1111-1111-111111111701",
                    mission_id: "11111111-1111-1111-1111-111111111601",
                    platform: "instagram",
                    title: "Instagram Reel hero demo",
                    instructions: "Show serum usage in a 30-second reel.",
                    content_format: "reel",
                    required_deliverables: 1,
                    approval_required: true,
                    start_window: "2026-03-07T00:00:00.000Z",
                    end_window: "2026-03-12T00:00:00.000Z",
                    status: "active",
                    created_at: "2026-03-07T00:00:00.000Z",
                    updated_at: "2026-03-07T00:00:00.000Z",
                    assignments: [
                      {
                        id: "11111111-1111-1111-1111-111111111901",
                        action_id: "11111111-1111-1111-1111-111111111701",
                        influencer_id: "11111111-1111-1111-1111-111111111801",
                        assignment_status: "approved",
                        assigned_at: "2026-03-09T10:00:00.000Z",
                        due_date: "2026-03-16T18:00:00.000Z",
                        completion_date: null,
                        deliverable_count_expected: 1,
                        deliverable_count_submitted: 1,
                        created_at: "2026-03-09T10:00:00.000Z",
                        updated_at: "2026-03-09T10:00:00.000Z",
                        influencer_summary: {
                          id: "11111111-1111-1111-1111-111111111801",
                          name: "Nova Blake",
                          email: "nova@example.com",
                          primary_platform: "instagram",
                          location: "Austin, TX",
                          status: "active",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          });
        case "GET /api/missions/11111111-1111-1111-1111-111111111601":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111601",
            campaign_id: "11111111-1111-1111-1111-111111111501",
            name: "Awareness Burst",
            description: "Seed creators with first-look content.",
            sequence_order: 1,
            start_date: "2026-03-05T00:00:00.000Z",
            end_date: "2026-03-12T00:00:00.000Z",
            status: "active",
            created_at: "2026-03-05T00:00:00.000Z",
            updated_at: "2026-03-05T00:00:00.000Z",
          });
        case "GET /api/missions/11111111-1111-1111-1111-111111111601/actions":
          return jsonResponse([
            {
              id: "11111111-1111-1111-1111-111111111701",
              mission_id: "11111111-1111-1111-1111-111111111601",
              platform: "instagram",
              title: "Instagram Reel hero demo",
              instructions: "Show serum usage in a 30-second reel.",
              content_format: "reel",
              required_deliverables: 1,
              approval_required: true,
              start_window: "2026-03-07T00:00:00.000Z",
              end_window: "2026-03-12T00:00:00.000Z",
              status: "active",
              created_at: "2026-03-07T00:00:00.000Z",
              updated_at: "2026-03-07T00:00:00.000Z",
              _count: {
                action_assignments: 1,
              },
            },
          ]);
        case "GET /api/actions/11111111-1111-1111-1111-111111111701":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111701",
            mission_id: "11111111-1111-1111-1111-111111111601",
            platform: "instagram",
            title: "Instagram Reel hero demo",
            instructions: "Show serum usage in a 30-second reel.",
            content_format: "reel",
            required_deliverables: 1,
            approval_required: true,
            start_window: "2026-03-07T00:00:00.000Z",
            end_window: "2026-03-12T00:00:00.000Z",
            status: "active",
            created_at: "2026-03-07T00:00:00.000Z",
            updated_at: "2026-03-07T00:00:00.000Z",
          });
        case "GET /api/actions/11111111-1111-1111-1111-111111111701/assignments":
          return jsonResponse({
            action: {
              id: "11111111-1111-1111-1111-111111111701",
              mission_id: "11111111-1111-1111-1111-111111111601",
              platform: "instagram",
              title: "Instagram Reel hero demo",
              instructions: "Show serum usage in a 30-second reel.",
              content_format: "reel",
              required_deliverables: 1,
              approval_required: true,
              start_window: "2026-03-07T00:00:00.000Z",
              end_window: "2026-03-12T00:00:00.000Z",
              status: "active",
              created_at: "2026-03-07T00:00:00.000Z",
              updated_at: "2026-03-07T00:00:00.000Z",
              mission: {
                id: "11111111-1111-1111-1111-111111111601",
                campaign_id: "11111111-1111-1111-1111-111111111501",
                name: "Awareness Burst",
                sequence_order: 1,
                status: "active",
              },
            },
            assignments: [
              {
                id: "11111111-1111-1111-1111-111111111901",
                action_id: "11111111-1111-1111-1111-111111111701",
                influencer_id: "11111111-1111-1111-1111-111111111801",
                assignment_status: "approved",
                assigned_at: "2026-03-09T10:00:00.000Z",
                due_date: "2026-03-16T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 1,
                created_at: "2026-03-09T10:00:00.000Z",
                updated_at: "2026-03-09T10:00:00.000Z",
                influencer: {
                  id: "11111111-1111-1111-1111-111111111801",
                  name: "Nova Blake",
                  email: "nova@example.com",
                  primary_platform: "instagram",
                  location: "Austin, TX",
                  status: "active",
                },
              },
            ],
          });
        case "GET /api/action-assignments/11111111-1111-1111-1111-111111111901":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111901",
            action_id: "11111111-1111-1111-1111-111111111701",
            influencer_id: "11111111-1111-1111-1111-111111111801",
            assignment_status: "approved",
            assigned_at: "2026-03-09T10:00:00.000Z",
            due_date: "2026-03-16T18:00:00.000Z",
            completion_date: null,
            deliverable_count_expected: 1,
            deliverable_count_submitted: 1,
            created_at: "2026-03-09T10:00:00.000Z",
            updated_at: "2026-03-09T10:00:00.000Z",
          });
        case "GET /api/deliverables?page=1&limit=50&action_assignment_id=11111111-1111-1111-1111-111111111901":
          return jsonResponse({
            data: [
              {
                id: "11111111-1111-1111-1111-111111112001",
                action_assignment_id: "11111111-1111-1111-1111-111111111901",
                deliverable_type: "final_asset",
                description: "Final reel draft",
                status: "approved",
                submission_url: "https://example.com/final-reel",
                rejection_reason: null,
                submitted_by_user_id: "11111111-1111-1111-1111-111111111202",
                submitted_at: "2026-03-10T11:00:00.000Z",
                approved_at: "2026-03-11T09:00:00.000Z",
                created_at: "2026-03-10T11:00:00.000Z",
                updated_at: "2026-03-11T09:00:00.000Z",
              },
              {
                id: "11111111-1111-1111-1111-111111112003",
                action_assignment_id: "11111111-1111-1111-1111-111111111901",
                deliverable_type: "caption_copy",
                description: "Caption awaiting review",
                status: "submitted",
                submission_url: "https://example.com/caption-doc",
                rejection_reason: null,
                submitted_by_user_id: "11111111-1111-1111-1111-111111111202",
                submitted_at: "2026-03-12T11:00:00.000Z",
                approved_at: null,
                created_at: "2026-03-12T11:00:00.000Z",
                updated_at: "2026-03-12T11:00:00.000Z",
              },
            ],
            meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
          });
        case "GET /api/action-assignments/11111111-1111-1111-1111-111111111901/posts":
          return jsonResponse({
            assignment: {
              id: "11111111-1111-1111-1111-111111111901",
              action_id: "11111111-1111-1111-1111-111111111701",
              action: {
                id: "11111111-1111-1111-1111-111111111701",
                title: "Instagram Reel hero demo",
                mission_id: "11111111-1111-1111-1111-111111111601",
                status: "active",
              },
            },
            posts: [
              {
                id: "11111111-1111-1111-1111-111111112101",
                deliverable_id: "11111111-1111-1111-1111-111111112001",
                platform: "instagram",
                external_post_id: "ig-post-123",
                post_url: "https://instagram.com/p/demo-post",
                caption: "Summer glow hero demo",
                media_type: "video",
                posted_at: "2026-03-12T17:30:00.000Z",
                created_at: "2026-03-12T17:30:00.000Z",
                updated_at: "2026-03-12T17:30:00.000Z",
                deliverable: {
                  id: "11111111-1111-1111-1111-111111112001",
                  deliverable_type: "final_asset",
                  status: "approved",
                },
                performance_snapshots: [
                  {
                    id: "11111111-1111-1111-1111-111111113101",
                    post_id: "11111111-1111-1111-1111-111111112101",
                    captured_at: "2026-03-13T08:30:00.000Z",
                    impressions: 184000,
                    reach: 142000,
                    views: 125000,
                    video_views: 118000,
                    likes: 8600,
                    comments: 740,
                    shares: 390,
                    saves: 980,
                    clicks: 215,
                    conversions: 32,
                  },
                ],
              },
            ],
          });
        case "POST /api/action-assignments/11111111-1111-1111-1111-111111111901/accept":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111901",
            action_id: "11111111-1111-1111-1111-111111111701",
            influencer_id: "11111111-1111-1111-1111-111111111801",
            assignment_status: "accepted",
            assigned_at: "2026-03-09T10:00:00.000Z",
            due_date: "2026-03-16T18:00:00.000Z",
            completion_date: null,
            deliverable_count_expected: 1,
            deliverable_count_submitted: 0,
            created_at: "2026-03-09T10:00:00.000Z",
            updated_at: "2026-03-09T10:05:00.000Z",
          });
        case "POST /api/action-assignments/11111111-1111-1111-1111-111111111901/start":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111901",
            action_id: "11111111-1111-1111-1111-111111111701",
            influencer_id: "11111111-1111-1111-1111-111111111801",
            assignment_status: "in_progress",
            assigned_at: "2026-03-09T10:00:00.000Z",
            due_date: "2026-03-16T18:00:00.000Z",
            completion_date: null,
            deliverable_count_expected: 1,
            deliverable_count_submitted: 0,
            created_at: "2026-03-09T10:00:00.000Z",
            updated_at: "2026-03-09T10:10:00.000Z",
          });
        case "POST /api/action-assignments/11111111-1111-1111-1111-111111111901/submit":
          return jsonResponse({
            assignment: {
              id: "11111111-1111-1111-1111-111111111901",
              action_id: "11111111-1111-1111-1111-111111111701",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "submitted",
              assigned_at: "2026-03-09T10:00:00.000Z",
              due_date: "2026-03-16T18:00:00.000Z",
              completion_date: null,
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-09T10:00:00.000Z",
              updated_at: "2026-03-10T11:00:00.000Z",
            },
            deliverables: [
              {
                id: "11111111-1111-1111-1111-111111112002",
                action_assignment_id: "11111111-1111-1111-1111-111111111901",
                deliverable_type: "final_asset",
                description: "Reel draft for review",
                status: "submitted",
                submission_url: "https://example.com/reel-review",
                rejection_reason: null,
                submitted_at: "2026-03-10T11:00:00.000Z",
                approved_at: null,
                created_at: "2026-03-10T11:00:00.000Z",
                updated_at: "2026-03-10T11:00:00.000Z",
              },
            ],
          });
        case "POST /api/deliverables/11111111-1111-1111-1111-111111112003/approve":
          return jsonResponse({
            deliverable: {
              id: "11111111-1111-1111-1111-111111112003",
              action_assignment_id: "11111111-1111-1111-1111-111111111901",
              deliverable_type: "caption_copy",
              description: "Caption awaiting review",
              status: "approved",
              submission_url: "https://example.com/caption-doc",
              rejection_reason: null,
              submitted_by_user_id: "11111111-1111-1111-1111-111111111202",
              submitted_at: "2026-03-12T11:00:00.000Z",
              approved_at: "2026-03-12T15:00:00.000Z",
              created_at: "2026-03-12T11:00:00.000Z",
              updated_at: "2026-03-12T15:00:00.000Z",
            },
            assignment: {
              id: "11111111-1111-1111-1111-111111111901",
              action_id: "11111111-1111-1111-1111-111111111701",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "approved",
              assigned_at: "2026-03-09T10:00:00.000Z",
              due_date: "2026-03-16T18:00:00.000Z",
              completion_date: null,
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-09T10:00:00.000Z",
              updated_at: "2026-03-12T15:00:00.000Z",
            },
          });
        case "POST /api/deliverables/11111111-1111-1111-1111-111111112003/reject":
          return jsonResponse({
            deliverable: {
              id: "11111111-1111-1111-1111-111111112003",
              action_assignment_id: "11111111-1111-1111-1111-111111111901",
              deliverable_type: "caption_copy",
              description: "Caption awaiting review",
              status: "rejected",
              submission_url: "https://example.com/caption-doc",
              rejection_reason: "Needs clearer CTA and brand mention.",
              submitted_by_user_id: "11111111-1111-1111-1111-111111111202",
              submitted_at: "2026-03-12T11:00:00.000Z",
              approved_at: null,
              created_at: "2026-03-12T11:00:00.000Z",
              updated_at: "2026-03-12T15:05:00.000Z",
            },
            assignment: {
              id: "11111111-1111-1111-1111-111111111901",
              action_id: "11111111-1111-1111-1111-111111111701",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "rejected",
              assigned_at: "2026-03-09T10:00:00.000Z",
              due_date: "2026-03-16T18:00:00.000Z",
              completion_date: null,
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-09T10:00:00.000Z",
              updated_at: "2026-03-12T15:05:00.000Z",
            },
          });
        case "POST /api/deliverables/11111111-1111-1111-1111-111111112001/posts":
          return jsonResponse({
            post: {
              id: "11111111-1111-1111-1111-111111112102",
              deliverable_id: "11111111-1111-1111-1111-111111112001",
              platform: "instagram",
              external_post_id: "ig-post-456",
              post_url: "https://instagram.com/p/new-post",
              caption: "Launch day reel",
              media_type: "video",
              posted_at: "2026-03-13T12:00:00.000Z",
              created_at: "2026-03-13T12:00:00.000Z",
              updated_at: "2026-03-13T12:00:00.000Z",
              performance_snapshots: [],
            },
            assignment: {
              id: "11111111-1111-1111-1111-111111111901",
              action_id: "11111111-1111-1111-1111-111111111701",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "completed",
              assigned_at: "2026-03-09T10:00:00.000Z",
              due_date: "2026-03-16T18:00:00.000Z",
              completion_date: "2026-03-13T12:00:00.000Z",
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-09T10:00:00.000Z",
              updated_at: "2026-03-13T12:00:00.000Z",
            },
          });
        case "GET /api/reports/campaigns/11111111-1111-1111-1111-111111111501/summary":
          return jsonResponse({
            scope: {
              type: "campaign",
              id: "11111111-1111-1111-1111-111111111501",
            },
            total_impressions: 40760,
            total_engagement: 6443,
            engagement_rate: 0.158,
            total_posts: 2,
            total_influencers: 2,
            last_snapshot_at: "2026-03-10T09:00:00.000Z",
            filters_applied: {},
          });
        default:
          throw new Error(`Unhandled fetch route: ${route}`);
      }
    });

    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    clearSessionToken();
    useAuthStore.setState({
      accessToken: null,
      user: null,
      hasHydrated: true,
      sessionValidated: false,
      isAuthenticating: false,
    });
  });

  it("covers login, planning fetches, assignment execution calls, and campaign summary fetches", async () => {
    await useAuthStore.getState().login(
      "avery.chen@northstar.example",
      "AdminPass123!",
    );

    expect(getSessionToken()).toBe("token-123");
    expect(useAuthStore.getState().user?.fullName).toBe("Avery Chen");

    useAuthStore.setState({
      user: null,
      sessionValidated: false,
    });

    await useAuthStore.getState().hydrateUser();

    const campaigns = await campaignsApi.list({ page: 1, limit: 5 });
    const dashboardAssignments = await actionAssignmentsApi.list({
      page: 1,
      limit: 8,
    });
    const submittedAssignments = await actionAssignmentsApi.list({
      page: 1,
      limit: 5,
      assignment_status: "submitted",
    });
    const rejectedAssignments = await actionAssignmentsApi.list({
      page: 1,
      limit: 5,
      assignment_status: "rejected",
    });
    const influencers = await influencersApi.list({ page: 1, limit: 50 });
    const campaign = campaigns.data[0];
    const planningView = await campaignsApi.getPlanningView(campaign.id);
    const mission = planningView.missions[0];
    const action = mission.actions[0];
    const assignment = action.assignments[0];
    const missionDetail = await missionsApi.getById(mission.id);
    const missionActions = await actionsApi.listByMission(mission.id);
    const actionDetail = await actionsApi.getById(action.id);
    const actionAssignments = await actionAssignmentsApi.listByAction(action.id);
    const assignmentDetail = await actionAssignmentsApi.getById(assignment.id);
    const deliverables = await deliverablesApi.listByAssignment(assignment.id);
    const assignmentPosts = await postsApi.listByAssignment(assignment.id);
    const approvedDeliverable = await deliverablesApi.approve(
      "11111111-1111-1111-1111-111111112003",
    );
    const rejectedDeliverable = await deliverablesApi.reject(
      "11111111-1111-1111-1111-111111112003",
      {
        reason: "Needs clearer CTA and brand mention.",
      },
    );
    const acceptedAssignment = await actionAssignmentsApi.accept(assignment.id);
    const startedAssignment = await actionAssignmentsApi.start(assignment.id);
    const submittedAssignment = await actionAssignmentsApi.submit(assignment.id, {
      deliverables: [
        {
          deliverable_type: "final_asset",
          description: "Reel draft for review",
          submission_url: "https://example.com/reel-review",
          submission_metadata_json: {
            source: "mobile_app",
          },
        },
      ],
    });
    const createdPost = await postsApi.createForDeliverable(
      "11111111-1111-1111-1111-111111112001",
      {
        platform: "instagram",
        media_type: "video",
        post_url: "https://instagram.com/p/new-post",
        external_post_id: "ig-post-456",
        caption: "Launch day reel",
        posted_at: "2026-03-13T12:00:00.000Z",
      },
    );
    const campaignSummary = await reportsApi.getCampaignSummary(campaign.id);

    expect(campaigns.meta.total).toBe(1);
    expect(dashboardAssignments.meta.total).toBe(1);
    expect(submittedAssignments.data[0]?.assignment_status).toBe("submitted");
    expect(rejectedAssignments.data[0]?.assignment_status).toBe("rejected");
    expect(influencers.meta.total).toBe(1);
    expect(planningView.company.name).toBe("Glow Labs");
    expect(missionDetail.name).toBe("Awareness Burst");
    expect(missionActions[0]._count.action_assignments).toBe(1);
    expect(actionDetail.title).toBe("Instagram Reel hero demo");
    expect(actionAssignments.assignments[0].influencer.name).toBe("Nova Blake");
    expect(assignmentDetail.assignment_status).toBe("approved");
    expect(deliverables.data[0]?.status).toBe("approved");
    expect(deliverables.data[1]?.status).toBe("submitted");
    expect(assignmentPosts.posts[0]?.performance_snapshots[0]?.impressions).toBe(
      184000,
    );
    expect(approvedDeliverable.deliverable.status).toBe("approved");
    expect(rejectedDeliverable.deliverable.status).toBe("rejected");
    expect(rejectedDeliverable.assignment.assignment_status).toBe("rejected");
    expect(acceptedAssignment.assignment_status).toBe("accepted");
    expect(startedAssignment.assignment_status).toBe("in_progress");
    expect(submittedAssignment.assignment.assignment_status).toBe("submitted");
    expect(submittedAssignment.deliverables).toHaveLength(1);
    expect(createdPost.post.post_url).toBe("https://instagram.com/p/new-post");
    expect(createdPost.assignment?.assignment_status).toBe("completed");
    expect(campaignSummary.total_impressions).toBe(40760);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/reports/campaigns/11111111-1111-1111-1111-111111111501/summary",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });
});
