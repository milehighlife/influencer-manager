// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CampaignPlanningView } from "@influencer-manager/shared/types/mobile";

import { CampaignListPage } from "./CampaignListPage";
import { CampaignDetailPage } from "./CampaignDetailPage";
import { useAuthStore } from "../state/auth-store";
import { formatDate } from "../utils/format";

interface PlannerListMockOptions {
  createCampaignError?: string;
}

interface CampaignDetailMockOptions {
  initialPlanningView?: CampaignPlanningView;
  campaignPatchError?: string;
  assignmentCreateError?: string;
  assignmentDeleteError?: string;
  missionDeleteError?: string;
  actionDeleteError?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    text: async () => JSON.stringify(body),
  };
}

function paginated<T>(data: T[], page = 1, limit = 100) {
  return {
    data,
    meta: {
      page,
      limit,
      total: data.length,
      totalPages: Math.max(1, Math.ceil(data.length / limit)),
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createPlanningView(options?: {
  includeAssignmentOnFirstAction?: boolean;
}): CampaignPlanningView {
  const firstActionAssignments = options?.includeAssignmentOnFirstAction
    ? [
        {
          id: "assignment-1",
          action_id: "action-1",
          influencer_id: "influencer-1",
          assignment_status: "accepted" as const,
          cascade_reason: null,
          invited_at: "2026-03-05T12:00:00.000Z",
          accepted_at: "2026-03-05T12:00:00.000Z",
          submitted_at: null,
          completed_at: null,
          revision_count: 0,
          revision_reason: null,
          assigned_at: "2026-03-05T12:00:00.000Z",
          due_date: "2026-03-16T18:00:00.000Z",
          completion_date: null,
          submission_url: null,
          published_at: null,
          total_views: 0,
          total_comments: 0,
          total_shares: 0,
          metrics_updated_at: null,
          deliverable_count_expected: 1,
          deliverable_count_submitted: 0,
          created_at: "2026-03-05T12:00:00.000Z",
          updated_at: "2026-03-05T12:00:00.000Z",
          influencer_summary: {
            id: "influencer-1",
            name: "Nina Brooks",
            email: "nina@creatormail.example",
            primary_platform: "instagram" as const,
            location: "Los Angeles, CA",
            status: "active",
          },
        },
      ]
    : [];

  return {
    id: "campaign-1",
    company_id: "company-1",
    name: "Spring Launch",
    description: "Launch workstream",
    campaign_type: "product_launch",
    status: "planned",
    start_date: "2026-03-10T00:00:00.000Z",
    end_date: "2026-03-31T00:00:00.000Z",
    budget: null,
    version: 1,
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    company: {
      id: "company-1",
      client_id: "client-1",
      name: "Northstar Shoes",
      description: null,
      status: "active",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
    missions: [
      {
        id: "mission-1",
        campaign_id: "campaign-1",
        name: "Launch Awareness",
        description: "Primary awareness wave",
        sequence_order: 1,
        start_date: "2026-03-10T00:00:00.000Z",
        end_date: "2026-03-18T00:00:00.000Z",
        status: "planned",
        auto_completed: false,
        auto_completed_at: null,
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
        actions: [
          {
            id: "action-1",
            mission_id: "mission-1",
            platform: "instagram",
            title: "Instagram Reel Brief",
            instructions: "Lead with product grip.",
            content_format: "reel",
            required_deliverables: 1,
            approval_required: true,
            required_platforms: [],
            start_window: "2026-03-12T08:00:00.000Z",
            end_window: "2026-03-15T18:00:00.000Z",
            status: "scheduled",
            auto_completed: false,
            auto_completed_at: null,
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            assignments: firstActionAssignments,
          },
          {
            id: "action-2",
            mission_id: "mission-1",
            platform: "tiktok",
            title: "TikTok Product Demo",
            instructions: "Use the shoe grip demo.",
            content_format: "short_video",
            required_deliverables: 1,
            approval_required: true,
            required_platforms: [],
            start_window: "2026-03-15T18:00:00.000Z",
            end_window: "2026-03-17T18:00:00.000Z",
            status: "scheduled",
            auto_completed: false,
            auto_completed_at: null,
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
            assignments: [],
          },
        ],
      },
      {
        id: "mission-2",
        campaign_id: "campaign-1",
        name: "Conversion Push",
        description: "Lower funnel follow-up",
        sequence_order: 2,
        start_date: "2026-03-18T00:00:00.000Z",
        end_date: "2026-03-24T00:00:00.000Z",
        status: "planned",
        auto_completed: false,
        auto_completed_at: null,
        created_at: "2026-03-02T00:00:00.000Z",
        updated_at: "2026-03-02T00:00:00.000Z",
        actions: [],
      },
    ],
  };
}

function renderWithProviders(ui: ReactNode, initialEntry = "/campaigns") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function getMissionPanel(name: string): HTMLElement {
  const heading = screen
    .getAllByRole("heading", { name })
    .find((item) => item.closest(".mission-panel"));
  if (!heading) {
    throw new Error(`Mission heading not found for ${name}`);
  }
  const panel = heading.closest(".mission-panel");
  if (!panel) {
    throw new Error(`Mission panel not found for ${name}`);
  }
  if (!(panel instanceof HTMLElement)) {
    throw new Error(`Mission panel is not an HTMLElement for ${name}`);
  }
  return panel;
}

function getActionCard(name: string): HTMLElement {
  const heading = screen
    .getAllByRole("heading", { name })
    .find((item) => item.closest(".action-card"));
  if (!heading) {
    throw new Error(`Action heading not found for ${name}`);
  }
  const panel = heading.closest(".action-card");
  if (!panel) {
    throw new Error(`Action card not found for ${name}`);
  }
  if (!(panel instanceof HTMLElement)) {
    throw new Error(`Action card is not an HTMLElement for ${name}`);
  }
  return panel;
}

function clickClearButton(container: HTMLElement, index: number) {
  const buttons = within(container).getAllByRole("button", { name: "Clear" });
  const target = buttons[index];
  if (!target) {
    throw new Error(`Clear button ${index} not found`);
  }
  return userEvent.click(target);
}

function createPlannerListFetchMock(options: PlannerListMockOptions = {}) {
  const campaigns = [
    {
      id: "campaign-1",
      name: "Spring Launch",
      status: "planned",
      start_date: "2026-03-10T00:00:00.000Z",
      end_date: "2026-03-31T00:00:00.000Z",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
      company: {
        id: "company-1",
        name: "Northstar Shoes",
        client_id: "client-1",
        client_name: "Northstar Retail",
      },
      mission_count: 2,
      scheduled_mission_count: 2,
      partial_mission_count: 0,
      unscheduled_mission_count: 0,
    },
  ];

  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace(/^\/api/, "");
    const method = init?.method ?? "GET";

    if (method === "GET" && path === "/clients") {
      return jsonResponse(
        paginated([
          {
            id: "client-1",
            organization_id: "org-1",
            name: "Northstar Retail",
            status: "active",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
          },
        ]),
      );
    }

    if (method === "GET" && path === "/companies") {
      return jsonResponse(
        paginated([
          {
            id: "company-1",
            organization_id: "org-1",
            client_id: "client-1",
            name: "Northstar Shoes",
            website_url: null,
            industry_tags: [],
            status: "active",
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-01T00:00:00.000Z",
          },
        ]),
      );
    }

    if (method === "GET" && path === "/companies/company-1") {
      return jsonResponse({
        id: "company-1",
        organization_id: "org-1",
        client_id: "client-1",
        name: "Northstar Shoes",
        website_url: null,
        industry_tags: [],
        status: "active",
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
      });
    }

    if (method === "GET" && path === "/campaigns/planner-list") {
      return jsonResponse(paginated(campaigns));
    }

    if (method === "POST" && path === "/companies/company-1/campaigns") {
      if (options.createCampaignError) {
        return jsonResponse({ message: options.createCampaignError }, 500);
      }

      const body = JSON.parse(String(init?.body ?? "{}"));
      const created = {
        id: "campaign-2",
        company_id: "company-1",
        name: body.name,
        description: body.description ?? null,
        campaign_type: body.campaign_type,
        status: body.status ?? "draft",
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        budget: body.budget ?? null,
        created_at: "2026-03-05T00:00:00.000Z",
        updated_at: "2026-03-05T00:00:00.000Z",
      };
      campaigns.unshift({
        id: created.id,
        name: created.name,
        status: created.status,
        start_date: created.start_date,
        end_date: created.end_date,
        created_at: created.created_at,
        updated_at: created.updated_at,
        company: {
          id: "company-1",
          name: "Northstar Shoes",
          client_id: "client-1",
          client_name: "Northstar Retail",
        },
        mission_count: 0,
        scheduled_mission_count: 0,
        partial_mission_count: 0,
        unscheduled_mission_count: 0,
      });
      return jsonResponse(created, 201);
    }

    throw new Error(`Unhandled planner list request: ${method} ${path}`);
  });

  return fetchMock;
}

function createCampaignDetailFetchMock(options: CampaignDetailMockOptions = {}) {
  let planningView = clone(options.initialPlanningView ?? createPlanningView());
  const influencers = [
    {
      id: "influencer-1",
      organization_id: "org-1",
      name: "Nina Brooks",
      handle: "@ninabrooks",
      primary_platform: "instagram" as const,
      email: "nina@creatormail.example",
      location: "Los Angeles, CA",
      audience_description: "Lifestyle creator",
      niche_tags: ["lifestyle"],
      status: "active",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "influencer-2",
      organization_id: "org-1",
      name: "Jordan Miles",
      handle: "@jordanmiles",
      primary_platform: "tiktok" as const,
      email: "jordan@creatormail.example",
      location: "Austin, TX",
      audience_description: "Product demo creator",
      niche_tags: ["tech"],
      status: "active",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
  ];

  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace(/^\/api/, "");
    const method = init?.method ?? "GET";

    if (method === "GET" && path === "/campaigns/campaign-1/planning-view") {
      return jsonResponse(clone(planningView));
    }

    if (method === "GET" && path === "/influencers") {
      return jsonResponse(paginated(influencers));
    }

    if (method === "PATCH" && path === "/campaigns/campaign-1") {
      if (options.campaignPatchError) {
        return jsonResponse({ message: options.campaignPatchError }, 400);
      }

      const body = JSON.parse(String(init?.body ?? "{}"));
      planningView = {
        ...planningView,
        name: body.name ?? planningView.name,
        status: body.status ?? planningView.status,
        start_date:
          body.start_date !== undefined ? body.start_date : planningView.start_date,
        end_date: body.end_date !== undefined ? body.end_date : planningView.end_date,
      };

      return jsonResponse({
        id: planningView.id,
        company_id: planningView.company_id,
        name: planningView.name,
        description: planningView.description,
        campaign_type: planningView.campaign_type,
        status: planningView.status,
        start_date: planningView.start_date,
        end_date: planningView.end_date,
        budget: planningView.budget,
        created_at: planningView.created_at,
        updated_at: planningView.updated_at,
      });
    }

    if (method === "POST" && path === "/campaigns/campaign-1/missions") {
      const body = JSON.parse(String(init?.body ?? "{}"));

      if (body.start_date && body.start_date < "2026-03-10") {
        return jsonResponse(
          { message: "Mission start date must stay within the campaign date window." },
          400,
        );
      }

      const mission = {
        id: `mission-${planningView.missions.length + 1}`,
        campaign_id: planningView.id,
        name: body.name,
        description: body.description ?? null,
        sequence_order: body.sequence_order,
        start_date: body.start_date ? `${body.start_date}T00:00:00.000Z` : null,
        end_date: body.end_date ? `${body.end_date}T00:00:00.000Z` : null,
        status: body.status ?? "planned",
        auto_completed: false,
        auto_completed_at: null,
        created_at: "2026-03-06T00:00:00.000Z",
        updated_at: "2026-03-06T00:00:00.000Z",
        actions: [],
      };

      planningView = {
        ...planningView,
        missions: [...planningView.missions, mission].sort(
          (left, right) => left.sequence_order - right.sequence_order,
        ),
      };

      return jsonResponse(mission, 201);
    }

    if (method === "PATCH" && path === "/missions/mission-1") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) =>
          mission.id === "mission-1"
            ? {
                ...mission,
                name: body.name ?? mission.name,
                description:
                  body.description !== undefined ? body.description : mission.description,
                start_date:
                  body.start_date !== undefined
                    ? body.start_date
                      ? `${body.start_date}T00:00:00.000Z`
                      : null
                    : mission.start_date,
                end_date:
                  body.end_date !== undefined
                    ? body.end_date
                      ? `${body.end_date}T00:00:00.000Z`
                      : null
                    : mission.end_date,
              }
            : mission,
        ),
      };

      const mission = planningView.missions.find((item) => item.id === "mission-1");
      return jsonResponse(mission);
    }

    if (method === "DELETE" && path === "/missions/mission-2") {
      if (options.missionDeleteError) {
        return jsonResponse({ message: options.missionDeleteError }, 500);
      }

      planningView = {
        ...planningView,
        missions: planningView.missions.filter((mission) => mission.id !== "mission-2"),
      };

      return jsonResponse({ id: "mission-2" });
    }

    if (method === "POST" && path === "/missions/mission-1/actions") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const action = {
        id: `action-${planningView.missions[0].actions.length + 10}`,
        mission_id: "mission-1",
        platform: body.platform,
        title: body.title,
        instructions: body.instructions ?? null,
        content_format: body.content_format,
        required_deliverables: body.required_deliverables ?? 1,
        approval_required: body.approval_required ?? true,
        required_platforms: body.required_platforms ?? [],
        start_window: body.start_window ? `${body.start_window}:00.000Z` : null,
        end_window: body.end_window ? `${body.end_window}:00.000Z` : null,
        status: body.status ?? "draft",
        auto_completed: false,
        auto_completed_at: null,
        created_at: "2026-03-06T00:00:00.000Z",
        updated_at: "2026-03-06T00:00:00.000Z",
        assignments: [],
      };

      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) =>
          mission.id === "mission-1"
            ? {
                ...mission,
                actions: [...mission.actions, action],
              }
            : mission,
        ),
      };

      return jsonResponse(action, 201);
    }

    if (method === "POST" && path === "/actions/action-1/assignments") {
      if (options.assignmentCreateError) {
        return jsonResponse({ message: options.assignmentCreateError }, 400);
      }

      const body = JSON.parse(String(init?.body ?? "{}"));
      const influencer = influencers.find((item) => item.id === body.influencer_id);
      if (!influencer) {
        return jsonResponse({ message: "Influencer not found." }, 404);
      }

      const assignment = {
        id: `assignment-${Date.now()}`,
        action_id: "action-1",
        influencer_id: body.influencer_id,
        assignment_status: body.assignment_status ?? "accepted",
        cascade_reason: null,
        assigned_at: null,
        due_date: body.due_date ? `${body.due_date}:00.000Z` : null,
        completion_date: null,
        submission_url: null,
        published_at: null,
        total_views: 0,
        total_comments: 0,
        total_shares: 0,
        metrics_updated_at: null,
        deliverable_count_expected: body.deliverable_count_expected ?? 1,
        deliverable_count_submitted: 0,
        invited_at: null,
        accepted_at: null,
        submitted_at: null,
        completed_at: null,
        revision_count: 0,
        revision_reason: null,
        created_at: "2026-03-06T00:00:00.000Z",
        updated_at: "2026-03-06T00:00:00.000Z",
        influencer_summary: {
          id: influencer.id,
          name: influencer.name,
          email: influencer.email,
          primary_platform: influencer.primary_platform,
          location: influencer.location,
          status: influencer.status,
        },
      };

      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) => ({
          ...mission,
          actions: mission.actions.map((action) =>
            action.id === "action-1"
              ? {
                  ...action,
                  assignments: [...action.assignments, assignment],
                }
              : action,
          ),
        })),
      };

      return jsonResponse(assignment, 201);
    }

    if (method === "PATCH" && path === "/actions/action-1") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) => ({
          ...mission,
          actions: mission.actions.map((action) =>
            action.id === "action-1"
              ? {
                  ...action,
                  title: body.title ?? action.title,
                  platform: body.platform ?? action.platform,
                  instructions:
                    body.instructions !== undefined ? body.instructions : action.instructions,
                  required_deliverables:
                    body.required_deliverables ?? action.required_deliverables,
                  status: body.status ?? action.status,
                  start_window:
                    body.start_window !== undefined
                      ? body.start_window
                        ? `${body.start_window}:00.000Z`
                        : null
                      : action.start_window,
                  end_window:
                    body.end_window !== undefined
                      ? body.end_window
                        ? `${body.end_window}:00.000Z`
                        : null
                      : action.end_window,
                }
              : action,
          ),
        })),
      };

      const action = planningView.missions
        .flatMap((mission) => mission.actions)
        .find((item) => item.id === "action-1");
      return jsonResponse(action);
    }

    if (method === "DELETE" && path === "/actions/action-2") {
      if (options.actionDeleteError) {
        return jsonResponse({ message: options.actionDeleteError }, 500);
      }

      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) => ({
          ...mission,
          actions: mission.actions.filter((action) => action.id !== "action-2"),
        })),
      };

      return jsonResponse({ id: "action-2" });
    }

    if (method === "DELETE" && path === "/action-assignments/assignment-1") {
      if (options.assignmentDeleteError) {
        return jsonResponse({ message: options.assignmentDeleteError }, 500);
      }

      planningView = {
        ...planningView,
        missions: planningView.missions.map((mission) => ({
          ...mission,
          actions: mission.actions.map((action) => ({
            ...action,
            assignments: action.assignments.filter(
              (assignment) => assignment.id !== "assignment-1",
            ),
          })),
        })),
      };

      return jsonResponse({ id: "assignment-1" });
    }

    throw new Error(`Unhandled campaign detail request: ${method} ${path}`);
  });

  return { fetchMock, getPlanningView: () => planningView };
}

describe("campaign scheduling browser flows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useAuthStore.setState({
      accessToken: "planner-token",
      user: null,
      hasHydrated: true,
      sessionValidated: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("blocks invalid campaign create ranges in the browser form and allows same-day create", async () => {
    const fetchMock = createPlannerListFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns" element={<CampaignListPage canPlan />} />
        <Route path="/campaigns/:campaignId" element={<div>Campaign detail route</div>} />
      </Routes>,
    );

    await screen.findByPlaceholderText("Search campaigns...");
    await userEvent.click(screen.getByRole("button", { name: "Create Campaign" }));
    const createSection = screen.getByRole("heading", { name: "New campaign" }).closest("section");
    if (!createSection) {
      throw new Error("Create campaign section not found");
    }

    const [createCompanySearchInput] = within(createSection).getAllByRole("searchbox");
    const createSectionComboboxes = within(createSection).getAllByRole("combobox");
    await userEvent.type(createCompanySearchInput, "Northstar");
    await userEvent.selectOptions(
      createSectionComboboxes[0],
      "company-1",
    );
    await userEvent.type(within(createSection).getByLabelText("Name"), "Weekend Sprint");
    fireEvent.change(within(createSection).getByLabelText("Start date"), {
      target: { value: "2026-03-20" },
    });
    fireEvent.change(within(createSection).getByLabelText("End date"), {
      target: { value: "2026-03-10" },
    });

    expect(within(createSection).getByRole("button", { name: "Create campaign" })).toBeDisabled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes("/companies/company-1/campaigns") &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);

    fireEvent.change(within(createSection).getByLabelText("End date"), {
      target: { value: "2026-03-20" },
    });

    await waitFor(() =>
      expect(within(createSection).getByRole("button", { name: "Create campaign" })).not.toBeDisabled(),
    );
    await userEvent.click(within(createSection).getByRole("button", { name: "Create campaign" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/companies/company-1/campaigns",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Weekend Sprint",
            campaign_type: "product_launch",
            status: "draft",
            start_date: "2026-03-20",
            end_date: "2026-03-20",
          }),
        }),
      );
    });
    expect(await screen.findByText("Campaign detail route")).toBeInTheDocument();
  });

  it("sends explicit nulls when clearing campaign dates and reflects the saved cleared state", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await userEvent.click(screen.getByRole("button", { name: "Edit Campaign" }));

    const campaignSection = screen
      .getByRole("heading", { name: "Spring Launch" })
      .closest("section");
    if (!campaignSection) {
      throw new Error("Campaign section not found");
    }
    await clickClearButton(campaignSection, 0);
    await clickClearButton(campaignSection, 1);
    await userEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/campaigns/campaign-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Spring Launch",
            start_date: null,
            end_date: null,
            status: "planned",
          }),
        }),
      );
    });

    await screen.findByText("Not set to Not set");
  });

  it("blocks locally known invalid mission creates and still supports partial mission creates", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await userEvent.click(screen.getByRole("button", { name: "Add Mission" }));

    await userEvent.type(screen.getByLabelText("Mission name"), "Out of Bounds Mission");
    fireEvent.change(screen.getByLabelText("Sequence order"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-03-01" },
    });
    expect(
      await screen.findByText("Mission start date must stay within the campaign date window."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add mission" })).toBeDisabled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === "http://localhost:3000/api/campaigns/campaign-1/missions" &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);

    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-03-20" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-03-26" },
    });

    expect(
      await screen.findByText(
        'Mission dates overlap with "Conversion Push" from 2026-03-18 to 2026-03-24.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add mission" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-03-22" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Add mission" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/campaigns/campaign-1/missions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Out of Bounds Mission",
            sequence_order: 3,
            status: "planned",
            start_date: "2026-03-22",
          }),
        }),
      );
    });

    expect((await screen.findAllByRole("heading", { name: "Out of Bounds Mission" })).length).toBeGreaterThan(0);
    expect(
      screen.getByText(`Mission schedule: ${formatDate("2026-03-22T00:00:00.000Z")} to Not set`),
    ).toBeInTheDocument();
  });

  it("sends explicit null when clearing a mission end date and reflects partial mission scheduling", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");

    await userEvent.click(within(missionPanel).getByRole("button", { name: "Edit" }));
    await clickClearButton(missionPanel, 1);
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Save mission" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === "http://localhost:3000/api/missions/mission-1" &&
          (init as RequestInit | undefined)?.method === "PATCH",
      );

      expect(patchCall).toBeDefined();
      const [, init] = patchCall!;
      const body = JSON.parse(String((init as RequestInit).body));

      expect(body).toMatchObject({
        name: "Launch Awareness",
        start_date: "2026-03-10",
        end_date: null,
      });
    });

    expect(
      await screen.findByText(
        `Mission schedule: ${formatDate("2026-03-10T00:00:00.000Z")} to Not set`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Partial schedule").length).toBeGreaterThan(0);
  });

  it("blocks out-of-bounds action creates in the browser and does not submit the form", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");

    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Add Action" }));

    await userEvent.type(within(missionPanel).getByLabelText("Action title"), "Late teaser");
    fireEvent.change(within(missionPanel).getByLabelText("Start window"), {
      target: { value: "2026-03-09T08:00" },
    });
    fireEvent.change(within(missionPanel).getByLabelText("End window"), {
      target: { value: "2026-03-10T09:00" },
    });

    expect(
      within(missionPanel).getByText(
        "Action dates must stay within the parent mission window: 2026-03-10 to 2026-03-18.",
      ),
    ).toBeInTheDocument();
    expect(within(missionPanel).getByRole("button", { name: "Add action" })).toBeDisabled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes("/missions/mission-1/actions") &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);
  });

  it("sends explicit nulls when clearing action windows and reflects the saved unscheduled state", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");

    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));
    const actionCard = getActionCard("Instagram Reel Brief");
    await userEvent.click(within(actionCard).getByRole("button", { name: "Edit" }));

    await clickClearButton(actionCard, 0);
    await clickClearButton(actionCard, 1);
    await userEvent.click(within(actionCard).getByRole("button", { name: "Save action" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === "http://localhost:3000/api/actions/action-1" &&
          (init as RequestInit | undefined)?.method === "PATCH",
      );

      expect(patchCall).toBeDefined();
      const [, init] = patchCall!;
      const body = JSON.parse(String((init as RequestInit).body));

      expect(body).toMatchObject({
        title: "Instagram Reel Brief",
        platform: "instagram",
        required_deliverables: 1,
        start_window: null,
        end_window: null,
        status: "scheduled",
      });
    });

    expect(await screen.findByText("Window: Not set to Not set")).toBeInTheDocument();
    expect(screen.getAllByText("Unscheduled").length).toBeGreaterThan(0);
  });

  it("surfaces campaign create failures without implying success", async () => {
    const fetchMock = createPlannerListFetchMock({
      createCampaignError: "Campaign creation failed.",
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns" element={<CampaignListPage canPlan />} />
        <Route path="/campaigns/:campaignId" element={<div>Campaign detail route</div>} />
      </Routes>,
    );

    await screen.findByPlaceholderText("Search campaigns...");
    await userEvent.click(screen.getByRole("button", { name: "Create Campaign" }));
    const createSection = screen.getByRole("heading", { name: "New campaign" }).closest("section");
    if (!createSection) {
      throw new Error("Create campaign section not found");
    }

    const [createCompanySearchInput] = within(createSection).getAllByRole("searchbox");
    const createSectionComboboxes = within(createSection).getAllByRole("combobox");
    await userEvent.type(createCompanySearchInput, "Northstar");
    await userEvent.selectOptions(
      createSectionComboboxes[0],
      "company-1",
    );
    await userEvent.type(within(createSection).getByLabelText("Name"), "Weekend Sprint");
    await userEvent.click(within(createSection).getByRole("button", { name: "Create campaign" }));

    expect(await within(createSection).findByText("Campaign creation failed.")).toBeInTheDocument();
    expect(screen.queryByText("Campaign detail route")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Weekend Sprint/i })).not.toBeInTheDocument();
  });

  it("refreshes visible campaign state after campaign edit success", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await userEvent.click(screen.getByRole("button", { name: "Edit Campaign" }));
    await userEvent.clear(screen.getByLabelText("Campaign name"));
    await userEvent.type(screen.getByLabelText("Campaign name"), "Spring Launch Reloaded");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "active");
    await userEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(await screen.findByRole("heading", { name: "Spring Launch Reloaded" })).toBeInTheDocument();
    const campaignDetailSection = screen.getByRole("heading", {
      name: "Spring Launch Reloaded",
    }).closest("section");
    if (!campaignDetailSection) {
      throw new Error("Campaign detail section not found");
    }
    expect(within(campaignDetailSection).getByText("active")).toBeInTheDocument();
  });

  it("surfaces campaign edit failures without replacing persisted campaign state", async () => {
    const { fetchMock } = createCampaignDetailFetchMock({
      campaignPatchError: "Campaign update failed.",
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await userEvent.click(screen.getByRole("button", { name: "Edit Campaign" }));
    await userEvent.clear(screen.getByLabelText("Campaign name"));
    await userEvent.type(screen.getByLabelText("Campaign name"), "Broken Save");
    await userEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(await screen.findByText("Campaign update failed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spring Launch" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Broken Save" })).not.toBeInTheDocument();
  });

  it("adds an assignment and refreshes the visible planner state after success", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));

    const actionCard = getActionCard("Instagram Reel Brief");
    await userEvent.click(within(actionCard).getByRole("button", { name: "Assign Influencer" }));
    await userEvent.type(within(actionCard).getByLabelText("Search influencers"), "Nina");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/influencers?page=1&limit=20&search=Nina",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
    await userEvent.selectOptions(within(actionCard).getAllByRole("combobox")[0], "influencer-1");
    fireEvent.change(within(actionCard).getByLabelText("Due date"), {
      target: { value: "2026-03-16T18:00" },
    });
    await userEvent.click(within(actionCard).getByRole("button", { name: "Assign influencer" }));

    expect(await within(actionCard).findByText("Nina Brooks")).toBeInTheDocument();
    expect(within(actionCard).getByText(/1 assigned influencer/i)).toBeInTheDocument();
  });

  it("surfaces assignment removal failures and keeps the saved assignment visible", async () => {
    const { fetchMock } = createCampaignDetailFetchMock({
      initialPlanningView: createPlanningView({ includeAssignmentOnFirstAction: true }),
      assignmentDeleteError: "Assignment removal failed.",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));

    const actionCard = getActionCard("Instagram Reel Brief");
    expect(within(actionCard).getByText("Nina Brooks")).toBeInTheDocument();
    await userEvent.click(within(actionCard).getByRole("button", { name: "Remove" }));

    expect(await within(actionCard).findByText("Assignment removal failed.")).toBeInTheDocument();
    expect(within(actionCard).getByText("Nina Brooks")).toBeInTheDocument();
  });

  it("removes an assignment after confirmation and refreshes the visible action state", async () => {
    const { fetchMock } = createCampaignDetailFetchMock({
      initialPlanningView: createPlanningView({ includeAssignmentOnFirstAction: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const confirmMock = vi.spyOn(window, "confirm");

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));

    const actionCard = getActionCard("Instagram Reel Brief");
    confirmMock.mockReturnValueOnce(false);
    await userEvent.click(within(actionCard).getByRole("button", { name: "Remove" }));
    expect(fetchMock.mock.calls.some(([url, init]) => url === "http://localhost:3000/api/action-assignments/assignment-1" && (init as RequestInit | undefined)?.method === "DELETE")).toBe(false);

    confirmMock.mockReturnValueOnce(true);
    await userEvent.click(within(actionCard).getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "http://localhost:3000/api/action-assignments/assignment-1" &&
            (init as RequestInit | undefined)?.method === "DELETE",
        ),
      ).toBe(true);
    });

    expect(await within(actionCard).findByText("No influencers assigned")).toBeInTheDocument();
    expect(within(actionCard).queryByText("Nina Brooks")).not.toBeInTheDocument();
  });

  it("requires delete confirmation for mission removal and refreshes planner state after success", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const confirmMock = vi.spyOn(window, "confirm");

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    const missionPanel = getMissionPanel("Conversion Push");

    confirmMock.mockReturnValueOnce(false);
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Delete" }));
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === "http://localhost:3000/api/missions/mission-2" &&
          (init as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(false);

    confirmMock.mockReturnValueOnce(true);
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "http://localhost:3000/api/missions/mission-2" &&
            (init as RequestInit | undefined)?.method === "DELETE",
        ),
      ).toBe(true);
    });

    await waitFor(() =>
      expect(screen.queryAllByRole("heading", { name: "Conversion Push" })).toHaveLength(0),
    );
    expect(screen.getByText("1 missions")).toBeInTheDocument();
    expect(screen.getByText("1 phases")).toBeInTheDocument();
  });

  it("surfaces mission delete failures without removing the mission locally", async () => {
    const { fetchMock } = createCampaignDetailFetchMock({
      missionDeleteError: "Mission deletion failed.",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    const missionPanel = getMissionPanel("Conversion Push");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Delete" }));

    expect(await within(missionPanel).findByText("Mission deletion failed.")).toBeInTheDocument();
    expect(within(missionPanel).getByRole("heading", { name: "Conversion Push" })).toBeInTheDocument();
  });

  it("requires delete confirmation for action removal and refreshes planner state after success", async () => {
    const { fetchMock } = createCampaignDetailFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const confirmMock = vi.spyOn(window, "confirm");

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));
    const actionCard = getActionCard("TikTok Product Demo");

    confirmMock.mockReturnValueOnce(false);
    await userEvent.click(within(actionCard).getByRole("button", { name: "Delete" }));
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === "http://localhost:3000/api/actions/action-2" &&
          (init as RequestInit | undefined)?.method === "DELETE",
      ),
    ).toBe(false);

    confirmMock.mockReturnValueOnce(true);
    await userEvent.click(within(actionCard).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "http://localhost:3000/api/actions/action-2" &&
            (init as RequestInit | undefined)?.method === "DELETE",
        ),
      ).toBe(true);
    });

    await waitFor(() =>
      expect(screen.queryAllByRole("heading", { name: "TikTok Product Demo" })).toHaveLength(0),
    );
    expect(within(missionPanel).getByText(/1 visible action/)).toBeInTheDocument();
  });

  it("surfaces action delete failures without removing the action locally", async () => {
    const { fetchMock } = createCampaignDetailFetchMock({
      actionDeleteError: "Action deletion failed.",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage canPlan />} />
      </Routes>,
      "/campaigns/campaign-1",
    );

    await screen.findByRole("heading", { name: "Spring Launch" });
    await waitFor(() => expect(() => getMissionPanel("Launch Awareness")).not.toThrow());
    const missionPanel = getMissionPanel("Launch Awareness");
    await userEvent.click(within(missionPanel).getByRole("button", { name: "Expand" }));
    const actionCard = getActionCard("TikTok Product Demo");

    await userEvent.click(within(actionCard).getByRole("button", { name: "Delete" }));

    expect(await within(actionCard).findByText("Action deletion failed.")).toBeInTheDocument();
    expect(within(actionCard).getByRole("heading", { name: "TikTok Product Demo" })).toBeInTheDocument();
  });
});
