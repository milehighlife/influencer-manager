import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { authApi, influencerWorkspaceApi } from "./services/api";
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

describe("influencer workspace service flow", () => {
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
        case "POST /api/auth/login":
          return jsonResponse(
            {
              access_token: "creator-token-123",
              user: {
                id: "11111111-1111-1111-1111-111111111203",
                email: "nina@creatormail.example",
                fullName: "Nina Alvarez",
                organizationId: "11111111-1111-1111-1111-111111111111",
                influencerId: "11111111-1111-1111-1111-111111111801",
                role: "influencer",
                status: "active",
              },
            },
            201,
          );
        case "GET /api/auth/me":
          return jsonResponse({
            id: "11111111-1111-1111-1111-111111111203",
            email: "nina@creatormail.example",
            fullName: "Nina Alvarez",
            organizationId: "11111111-1111-1111-1111-111111111111",
            influencerId: "11111111-1111-1111-1111-111111111801",
            role: "influencer",
            status: "active",
          });
        case "GET /api/influencer/assignments?page=1&limit=10":
          return jsonResponse({
            data: [
              {
                id: "assignment-0",
                action_id: "action-0",
                influencer_id: "11111111-1111-1111-1111-111111111801",
                assignment_status: "approved",
                assigned_at: "2026-03-09T18:00:00.000Z",
                due_date: "2026-03-17T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 1,
                created_at: "2026-03-09T18:00:00.000Z",
                updated_at: "2026-03-12T18:00:00.000Z",
                action: {
                  id: "action-0",
                  mission_id: "mission-1",
                  platform: "instagram",
                  title: "Approved creator reel",
                  instructions: "Reference content.",
                  content_format: "reel",
                  required_deliverables: 1,
                  approval_required: true,
                  start_window: "2026-03-10T00:00:00.000Z",
                  end_window: "2026-03-14T00:00:00.000Z",
                  status: "completed",
                  created_at: "2026-03-08T00:00:00.000Z",
                  updated_at: "2026-03-12T00:00:00.000Z",
                  mission: {
                    id: "mission-1",
                    campaign_id: "campaign-1",
                    name: "Launch wave",
                    description: "First creator drop.",
                    sequence_order: 1,
                    start_date: "2026-03-10T00:00:00.000Z",
                    end_date: "2026-03-20T00:00:00.000Z",
                    status: "active",
                    created_at: "2026-03-01T00:00:00.000Z",
                    updated_at: "2026-03-01T00:00:00.000Z",
                    campaign: {
                      id: "campaign-1",
                      company_id: "company-1",
                      name: "Glow Launch",
                      description: "Product launch campaign.",
                      start_date: "2026-03-01T00:00:00.000Z",
                      end_date: "2026-04-01T00:00:00.000Z",
                      budget: 10000,
                      status: "active",
                      campaign_type: "product_launch",
                      created_at: "2026-03-01T00:00:00.000Z",
                      updated_at: "2026-03-01T00:00:00.000Z",
                      company: {
                        id: "company-1",
                        client_id: "client-1",
                        name: "Glow Labs",
                        status: "active",
                      },
                    },
                  },
                },
              },
              {
                id: "assignment-1",
                action_id: "action-1",
                influencer_id: "11111111-1111-1111-1111-111111111801",
                assignment_status: "in_progress",
                assigned_at: "2026-03-10T18:00:00.000Z",
                due_date: "2026-03-18T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 0,
                created_at: "2026-03-10T18:00:00.000Z",
                updated_at: "2026-03-10T18:00:00.000Z",
                action: {
                  id: "action-1",
                  mission_id: "mission-1",
                  platform: "instagram",
                  title: "Instagram Reel demo",
                  instructions: "Show the product in use.",
                  content_format: "reel",
                  required_deliverables: 1,
                  approval_required: true,
                  start_window: "2026-03-12T00:00:00.000Z",
                  end_window: "2026-03-15T00:00:00.000Z",
                  status: "active",
                  created_at: "2026-03-09T00:00:00.000Z",
                  updated_at: "2026-03-09T00:00:00.000Z",
                  mission: {
                    id: "mission-1",
                    campaign_id: "campaign-1",
                    name: "Launch wave",
                    description: "First creator drop.",
                    sequence_order: 1,
                    start_date: "2026-03-10T00:00:00.000Z",
                    end_date: "2026-03-20T00:00:00.000Z",
                    status: "active",
                    created_at: "2026-03-01T00:00:00.000Z",
                    updated_at: "2026-03-01T00:00:00.000Z",
                    campaign: {
                      id: "campaign-1",
                      company_id: "company-1",
                      name: "Glow Launch",
                      description: "Product launch campaign.",
                      start_date: "2026-03-01T00:00:00.000Z",
                      end_date: "2026-04-01T00:00:00.000Z",
                      budget: 10000,
                      status: "active",
                      campaign_type: "product_launch",
                      created_at: "2026-03-01T00:00:00.000Z",
                      updated_at: "2026-03-01T00:00:00.000Z",
                      company: {
                        id: "company-1",
                        client_id: "client-1",
                        name: "Glow Labs",
                        status: "active",
                      },
                    },
                  },
                },
              },
              {
                id: "assignment-2",
                action_id: "action-2",
                influencer_id: "11111111-1111-1111-1111-111111111801",
                assignment_status: "rejected",
                assigned_at: "2026-03-11T18:00:00.000Z",
                due_date: "2026-03-19T18:00:00.000Z",
                completion_date: null,
                deliverable_count_expected: 1,
                deliverable_count_submitted: 1,
                created_at: "2026-03-11T18:00:00.000Z",
                updated_at: "2026-03-12T18:00:00.000Z",
                action: {
                  id: "action-2",
                  mission_id: "mission-2",
                  platform: "youtube",
                  title: "Rejected creator short",
                  instructions: "Revise and resubmit.",
                  content_format: "short_video",
                  required_deliverables: 1,
                  approval_required: true,
                  start_window: "2026-03-11T00:00:00.000Z",
                  end_window: "2026-03-20T00:00:00.000Z",
                  status: "active",
                  created_at: "2026-03-09T00:00:00.000Z",
                  updated_at: "2026-03-09T00:00:00.000Z",
                  mission: {
                    id: "mission-2",
                    campaign_id: "campaign-2",
                    name: "Recovery stories",
                    description: "Second mission.",
                    sequence_order: 1,
                    start_date: "2026-03-11T00:00:00.000Z",
                    end_date: "2026-03-21T00:00:00.000Z",
                    status: "active",
                    created_at: "2026-03-02T00:00:00.000Z",
                    updated_at: "2026-03-02T00:00:00.000Z",
                    campaign: {
                      id: "campaign-2",
                      company_id: "company-2",
                      name: "Peak Recovery",
                      description: "Performance recovery campaign.",
                      start_date: "2026-03-10T00:00:00.000Z",
                      end_date: "2026-04-10T00:00:00.000Z",
                      budget: 9000,
                      status: "active",
                      campaign_type: "seasonal_push",
                      created_at: "2026-03-02T00:00:00.000Z",
                      updated_at: "2026-03-02T00:00:00.000Z",
                      company: {
                        id: "company-2",
                        client_id: "client-2",
                        name: "Peak Fuel",
                        status: "active",
                      },
                    },
                  },
                },
              },
            ],
            meta: { page: 1, limit: 10, total: 3, totalPages: 1 },
            summary: {
              total_assignments: 6,
              status_counts: {
                assigned: 0,
                accepted: 0,
                in_progress: 1,
                submitted: 1,
                approved: 2,
                rejected: 1,
                completed: 1,
              },
            },
          });
        case "GET /api/influencer/assignments?page=1&limit=5&search=glow&sort_by=updated_at":
          return jsonResponse({
            data: [
              {
                id: "assignment-0",
                assignment_status: "approved",
              },
            ],
            meta: { page: 1, limit: 5, total: 2, totalPages: 1 },
            summary: {
              total_assignments: 6,
              status_counts: {
                assigned: 0,
                accepted: 0,
                in_progress: 1,
                submitted: 1,
                approved: 2,
                rejected: 1,
                completed: 1,
              },
            },
          });
        case "GET /api/influencer/status-digest?limit=20":
          return jsonResponse({
            items: [
              {
                id: "post-metrics-post-1",
                type: "post_metrics_available",
                title: "Metrics currently available",
                description:
                  "Current instagram performance counts are available for your linked post.",
                updated_at: "2026-03-13T14:00:00.000Z",
                badge_status: "active",
                badge_label: "Tracked",
                attention: false,
                destination: {
                  type: "post",
                  post_id: "post-1",
                  post_url: "https://instagram.com/p/demo",
                },
              },
              {
                id: "assignment-rejected-assignment-2",
                type: "assignment_revision_required",
                title: "Revision currently required",
                description:
                  "Open Rejected creator short to review the requested changes and prepare your resubmission.",
                updated_at: "2026-03-12T18:00:00.000Z",
                badge_status: "rejected",
                badge_label: "Needs Revision",
                attention: true,
                destination: {
                  type: "assignment",
                  assignment_id: "assignment-2",
                  assignment_title: "Rejected creator short",
                },
              },
            ],
            limit: 20,
            attention_count: 2,
          });
        case "GET /api/influencer/assignments/assignment-1":
          return jsonResponse({
            assignment: {
              id: "assignment-1",
              action_id: "action-1",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "approved",
              assigned_at: "2026-03-10T18:00:00.000Z",
              due_date: "2026-03-18T18:00:00.000Z",
              completion_date: null,
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-10T18:00:00.000Z",
              updated_at: "2026-03-12T00:00:00.000Z",
              action: {
                id: "action-1",
                mission_id: "mission-1",
                platform: "instagram",
                title: "Instagram Reel demo",
                instructions: "Show the product in use.",
                content_format: "reel",
                required_deliverables: 1,
                approval_required: true,
                start_window: "2026-03-12T00:00:00.000Z",
                end_window: "2026-03-15T00:00:00.000Z",
                status: "active",
                created_at: "2026-03-09T00:00:00.000Z",
                updated_at: "2026-03-09T00:00:00.000Z",
                mission: {
                  id: "mission-1",
                  campaign_id: "campaign-1",
                  name: "Launch wave",
                  description: "First creator drop.",
                  sequence_order: 1,
                  start_date: "2026-03-10T00:00:00.000Z",
                  end_date: "2026-03-20T00:00:00.000Z",
                  status: "active",
                  created_at: "2026-03-01T00:00:00.000Z",
                  updated_at: "2026-03-01T00:00:00.000Z",
                  campaign: {
                    id: "campaign-1",
                    company_id: "company-1",
                    name: "Glow Launch",
                    description: "Product launch campaign.",
                    start_date: "2026-03-01T00:00:00.000Z",
                    end_date: "2026-04-01T00:00:00.000Z",
                    budget: 10000,
                    status: "active",
                    campaign_type: "product_launch",
                    created_at: "2026-03-01T00:00:00.000Z",
                    updated_at: "2026-03-01T00:00:00.000Z",
                    company: {
                      id: "company-1",
                      client_id: "client-1",
                      name: "Glow Labs",
                      status: "active",
                    },
                  },
                },
              },
            },
            deliverables: [
              {
                id: "deliverable-1",
                action_assignment_id: "assignment-1",
                deliverable_type: "final_asset",
                description: "Approved reel draft",
                status: "approved",
                submission_url: "https://drive.example.com/reel.mp4",
                rejection_reason: null,
                submitted_by_user_id: "11111111-1111-1111-1111-111111111203",
                submitted_at: "2026-03-11T00:00:00.000Z",
                approved_at: "2026-03-12T00:00:00.000Z",
                created_at: "2026-03-11T00:00:00.000Z",
                updated_at: "2026-03-12T00:00:00.000Z",
                posts: [],
              },
            ],
            posts: [],
          });
        case "POST /api/influencer/assignments/assignment-1/deliverables":
          return jsonResponse({
            assignment: {
              id: "assignment-1",
              action_id: "action-1",
              influencer_id: "11111111-1111-1111-1111-111111111801",
              assignment_status: "submitted",
              assigned_at: "2026-03-10T18:00:00.000Z",
              due_date: "2026-03-18T18:00:00.000Z",
              completion_date: null,
              deliverable_count_expected: 1,
              deliverable_count_submitted: 1,
              created_at: "2026-03-10T18:00:00.000Z",
              updated_at: "2026-03-12T00:00:00.000Z",
            },
            deliverables: [
              {
                id: "deliverable-2",
                action_assignment_id: "assignment-1",
                deliverable_type: "final_asset",
                description: "Submitted reel draft",
                status: "submitted",
                submission_url: "https://drive.example.com/submitted.mp4",
                rejection_reason: null,
                submitted_at: "2026-03-12T00:00:00.000Z",
                approved_at: null,
                created_at: "2026-03-12T00:00:00.000Z",
                updated_at: "2026-03-12T00:00:00.000Z",
              },
            ],
          });
        case "POST /api/influencer/deliverables/deliverable-1/posts":
          return jsonResponse(
            {
              post: {
                id: "post-1",
                deliverable_id: "deliverable-1",
                platform: "instagram",
                external_post_id: "ig-123",
                post_url: "https://instagram.com/p/demo",
                caption: "Launch day",
                media_type: "video",
                posted_at: "2026-03-13T00:00:00.000Z",
                created_at: "2026-03-13T00:00:00.000Z",
                updated_at: "2026-03-13T00:00:00.000Z",
                deliverable: {
                  id: "deliverable-1",
                  deliverable_type: "final_asset",
                  status: "approved",
                },
                performance_snapshots: [],
              },
              assignment: null,
              metric_sync_enqueued: true,
            },
            201,
          );
        case "GET /api/influencer/posts?page=1&limit=20":
          return jsonResponse({
            data: [
              {
                id: "post-1",
                deliverable_id: "deliverable-1",
                platform: "instagram",
                external_post_id: "ig-123",
                post_url: "https://instagram.com/p/demo",
                caption: "Launch day",
                media_type: "video",
                posted_at: "2026-03-13T00:00:00.000Z",
                created_at: "2026-03-13T00:00:00.000Z",
                updated_at: "2026-03-13T00:00:00.000Z",
                deliverable: {
                  id: "deliverable-1",
                  deliverable_type: "final_asset",
                  status: "approved",
                  action_assignment_id: "assignment-1",
                },
                performance_snapshots: [
                  {
                    id: "snapshot-1",
                    post_id: "post-1",
                    captured_at: "2026-03-13T08:00:00.000Z",
                    impressions: 12500,
                    reach: 9800,
                    views: 11100,
                    video_views: 10400,
                    likes: 820,
                    comments: 46,
                    shares: 31,
                    saves: 72,
                    clicks: 19,
                    conversions: 4,
                  },
                ],
              },
            ],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
            summary: {
              total_posts: 4,
              tracked_posts: 3,
              pending_sync_posts: 1,
              latest_snapshot_at: "2026-03-13T08:00:00.000Z",
            },
          });
        case "GET /api/influencer/posts/post-1/performance":
          return jsonResponse({
            post: {
              id: "post-1",
              deliverable_id: "deliverable-1",
              platform: "instagram",
              external_post_id: "ig-123",
              post_url: "https://instagram.com/p/demo",
              caption: "Launch day",
              media_type: "video",
              posted_at: "2026-03-13T00:00:00.000Z",
              created_at: "2026-03-13T00:00:00.000Z",
              updated_at: "2026-03-13T00:00:00.000Z",
              deliverable: {
                id: "deliverable-1",
                deliverable_type: "final_asset",
                status: "approved",
                action_assignment: {
                  id: "assignment-1",
                  action_id: "action-1",
                  influencer_id: "11111111-1111-1111-1111-111111111801",
                  assignment_status: "approved",
                  assigned_at: "2026-03-10T18:00:00.000Z",
                  due_date: "2026-03-18T18:00:00.000Z",
                  completion_date: null,
                  deliverable_count_expected: 1,
                  deliverable_count_submitted: 1,
                  created_at: "2026-03-10T18:00:00.000Z",
                  updated_at: "2026-03-12T00:00:00.000Z",
                  action: {
                    id: "action-1",
                    mission_id: "mission-1",
                    platform: "instagram",
                    title: "Instagram Reel demo",
                    instructions: "Show the product in use.",
                    content_format: "reel",
                    required_deliverables: 1,
                    approval_required: true,
                    start_window: "2026-03-12T00:00:00.000Z",
                    end_window: "2026-03-15T00:00:00.000Z",
                    status: "active",
                    created_at: "2026-03-09T00:00:00.000Z",
                    updated_at: "2026-03-09T00:00:00.000Z",
                    mission: {
                      id: "mission-1",
                      campaign_id: "campaign-1",
                      name: "Launch wave",
                      description: "First creator drop.",
                      sequence_order: 1,
                      start_date: "2026-03-10T00:00:00.000Z",
                      end_date: "2026-03-20T00:00:00.000Z",
                      status: "active",
                      created_at: "2026-03-01T00:00:00.000Z",
                      updated_at: "2026-03-01T00:00:00.000Z",
                      campaign: {
                        id: "campaign-1",
                        company_id: "company-1",
                        name: "Glow Launch",
                        description: "Product launch campaign.",
                        start_date: "2026-03-01T00:00:00.000Z",
                        end_date: "2026-04-01T00:00:00.000Z",
                        budget: 10000,
                        status: "active",
                        campaign_type: "product_launch",
                        created_at: "2026-03-01T00:00:00.000Z",
                        updated_at: "2026-03-01T00:00:00.000Z",
                        company: {
                          id: "company-1",
                          client_id: "client-1",
                          name: "Glow Labs",
                          status: "active",
                        },
                      },
                    },
                  },
                },
              },
              performance_snapshots: [
                {
                  id: "snapshot-1",
                  post_id: "post-1",
                  captured_at: "2026-03-13T08:00:00.000Z",
                  impressions: 12500,
                  reach: 9800,
                  views: 11100,
                  video_views: 10400,
                  likes: 820,
                  comments: 46,
                  shares: 31,
                  saves: 72,
                  clicks: 19,
                  conversions: 4,
                },
              ],
            },
            latest_snapshot: {
              id: "snapshot-1",
              post_id: "post-1",
              captured_at: "2026-03-13T08:00:00.000Z",
              impressions: 12500,
              reach: 9800,
              views: 11100,
              video_views: 10400,
              likes: 820,
              comments: 46,
              shares: 31,
              saves: 72,
              clicks: 19,
              conversions: 4,
            },
            summary: {
              scope: { type: "post", id: "post-1" },
              total_impressions: 12500,
              total_engagement: 969,
              engagement_rate: 0.0775,
              total_posts: 1,
              total_influencers: 1,
              last_snapshot_at: "2026-03-13T08:00:00.000Z",
              filters_applied: {},
            },
          });
        default:
          throw new Error(`Unhandled mobile influencer route: ${route}`);
      }
    });

    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("supports the influencer assignment, deliverable, post, and performance flow", async () => {
    const response = await authApi.login(
      "nina@creatormail.example",
      "CreatorPass123!",
    );

    useAuthStore.setState({
      accessToken: response.access_token,
      user: response.user,
      hasHydrated: true,
      sessionValidated: true,
      isAuthenticating: false,
    });

    expect(response.user.role).toBe("influencer");
    expect(response.user.influencerId).toBe(
      "11111111-1111-1111-1111-111111111801",
    );
    expect(getSessionToken()).toBeNull();

    useAuthStore.getState().restoreSession(response.access_token);
    const me = await authApi.me();
    const assignments = await influencerWorkspaceApi.listAssignments({
      page: 1,
      limit: 10,
    });
    const digest = await influencerWorkspaceApi.getStatusDigest();
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({
        data: [
          {
            id: "assignment-2",
            assignment_status: "rejected",
          },
        ],
        meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
        summary: {
          total_assignments: 6,
          status_counts: {
            assigned: 0,
            accepted: 0,
            in_progress: 1,
            submitted: 1,
            approved: 2,
            rejected: 1,
            completed: 1,
          },
        },
      }),
    );
    const rejectedAssignments = await influencerWorkspaceApi.listAssignments({
      page: 1,
      limit: 5,
      assignment_status: "rejected",
    });
    const searchedAssignments = await influencerWorkspaceApi.listAssignments({
      page: 1,
      limit: 5,
      search: "glow",
      sort_by: "updated_at",
    });
    const assignment = await influencerWorkspaceApi.getAssignment("assignment-1");
    const submitResponse = await influencerWorkspaceApi.submitDeliverables(
      "assignment-1",
      {
        deliverables: [
          {
            deliverable_type: "final_asset",
            description: "Submitted reel draft",
            submission_url: "https://drive.example.com/submitted.mp4",
          },
        ],
      },
    );
    const linkResponse = await influencerWorkspaceApi.linkPost("deliverable-1", {
      platform: "instagram",
      media_type: "video",
      post_url: "https://instagram.com/p/demo",
      external_post_id: "ig-123",
      caption: "Launch day",
      posted_at: "2026-03-13T00:00:00.000Z",
    });
    const posts = await influencerWorkspaceApi.listPosts({ page: 1, limit: 20 });
    fetchMock.mockImplementationOnce(async () =>
      jsonResponse({
        data: [
          {
            id: "post-1",
            platform: "instagram",
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        summary: {
          total_posts: 1,
          tracked_posts: 1,
          pending_sync_posts: 0,
          latest_snapshot_at: "2026-03-13T08:00:00.000Z",
        },
      }),
    );
    const instagramPosts = await influencerWorkspaceApi.listPosts({
      page: 1,
      limit: 10,
      platform: "instagram",
    });
    const performance = await influencerWorkspaceApi.getPostPerformance("post-1");

    expect(getSessionToken()).toBe("creator-token-123");
    expect(me.role).toBe("influencer");
    expect(digest.limit).toBe(20);
    expect(digest.attention_count).toBe(2);
    expect(digest.items[0]?.type).toBe("post_metrics_available");
    expect(assignments.data.map((item) => item.assignment_status)).toEqual([
      "approved",
      "in_progress",
      "rejected",
    ]);
    expect(assignments.summary.status_counts.approved).toBe(2);
    expect(assignments.data[0]?.action.mission.campaign.name).toBe("Glow Launch");
    expect(rejectedAssignments.meta.total).toBe(1);
    expect(searchedAssignments.meta.total).toBe(2);
    expect(searchedAssignments.summary.total_assignments).toBe(6);
    expect(assignment.deliverables[0]?.status).toBe("approved");
    expect(submitResponse.assignment.assignment_status).toBe("submitted");
    expect(linkResponse.metric_sync_enqueued).toBe(true);
    expect(posts.data[0]?.post_url).toBe("https://instagram.com/p/demo");
    expect(posts.summary.total_posts).toBe(4);
    expect(instagramPosts.data[0]?.platform).toBe("instagram");
    expect(instagramPosts.summary.tracked_posts).toBe(1);
    expect(performance.summary.total_impressions).toBe(12500);
    expect(performance.latest_snapshot?.likes).toBe(820);
  });
});
