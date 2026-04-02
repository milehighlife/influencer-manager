// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { CampaignListPage } from "./CampaignListPage";
import { useAuthStore } from "../state/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    text: async () => JSON.stringify(body),
  };
}

function paginated<T>(data: T[], page = 1, limit = 20, total = data.length) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
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

function createCampaignListFetchMock() {
  const clients = [
    {
      id: "client-1",
      organization_id: "org-1",
      name: "Northstar Retail",
      status: "active",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "client-2",
      organization_id: "org-1",
      name: "Glow Group",
      status: "active",
      created_at: "2026-03-02T00:00:00.000Z",
      updated_at: "2026-03-02T00:00:00.000Z",
    },
  ];

  const companies = [
    {
      id: "company-1",
      organization_id: "org-1",
      client_id: "client-1",
      name: "Northstar Shoes",
      status: "active",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "company-2",
      organization_id: "org-1",
      client_id: "client-1",
      name: "Northstar Apparel",
      status: "active",
      created_at: "2026-03-02T00:00:00.000Z",
      updated_at: "2026-03-02T00:00:00.000Z",
    },
    {
      id: "company-3",
      organization_id: "org-1",
      client_id: "client-2",
      name: "Glow Labs",
      status: "active",
      created_at: "2026-03-03T00:00:00.000Z",
      updated_at: "2026-03-03T00:00:00.000Z",
    },
  ];

  const campaigns = [
    {
      id: "campaign-1",
      name: "Alpha Launch",
      status: "planned",
      start_date: "2026-03-10T00:00:00.000Z",
      end_date: "2026-03-31T00:00:00.000Z",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-20T00:00:00.000Z",
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
    {
      id: "campaign-2",
      name: "Bravo Burst",
      status: "draft",
      start_date: null,
      end_date: null,
      created_at: "2026-03-02T00:00:00.000Z",
      updated_at: "2026-03-19T00:00:00.000Z",
      company: {
        id: "company-2",
        name: "Northstar Apparel",
        client_id: "client-1",
        client_name: "Northstar Retail",
      },
      mission_count: 1,
      scheduled_mission_count: 0,
      partial_mission_count: 1,
      unscheduled_mission_count: 0,
    },
    {
      id: "campaign-3",
      name: "Gamma Glow",
      status: "active",
      start_date: null,
      end_date: null,
      created_at: "2026-03-03T00:00:00.000Z",
      updated_at: "2026-03-18T00:00:00.000Z",
      company: {
        id: "company-3",
        name: "Glow Labs",
        client_id: "client-2",
        client_name: "Glow Group",
      },
      mission_count: 0,
      scheduled_mission_count: 0,
      partial_mission_count: 0,
      unscheduled_mission_count: 0,
    },
  ];

  return vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace(/^\/api/, "");
    const method = init?.method ?? "GET";

    if (method === "GET" && path === "/clients") {
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const data = search
        ? clients.filter((client) => client.name.toLowerCase().includes(search))
        : [];
      return jsonResponse(paginated(data, 1, 20, data.length));
    }

    if (method === "GET" && path.startsWith("/clients/")) {
      const clientId = path.split("/").at(-1);
      const client = clients.find((item) => item.id === clientId);
      return jsonResponse(client ?? { message: "Not found." }, client ? 200 : 404);
    }

    if (method === "GET" && path === "/companies") {
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const clientId = url.searchParams.get("client_id");
      const data = companies.filter((company) => {
        const clientMatches = !clientId || company.client_id === clientId;
        const searchMatches = !search || company.name.toLowerCase().includes(search);
        return clientMatches && searchMatches;
      });
      return jsonResponse(paginated(data, 1, 20, data.length));
    }

    if (method === "GET" && path.startsWith("/companies/")) {
      const companyId = path.split("/").at(-1);
      const company = companies.find((item) => item.id === companyId);
      return jsonResponse(company ?? { message: "Not found." }, company ? 200 : 404);
    }

    if (method === "GET" && path === "/campaigns/planner-list") {
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const clientId = url.searchParams.get("client_id");
      const companyId = url.searchParams.get("company_id");
      const status = url.searchParams.get("status");
      const scheduleState = url.searchParams.get("schedule_state");
      const page = Number(url.searchParams.get("page") ?? "1");
      const limit = Number(url.searchParams.get("limit") ?? "12");
      const sortBy = url.searchParams.get("sort_by") ?? "updated_at";
      const sortDirection = url.searchParams.get("sort_direction") ?? "desc";

      const filtered = campaigns.filter((campaign) => {
        const searchMatches =
          !search ||
          campaign.name.toLowerCase().includes(search) ||
          campaign.company.name.toLowerCase().includes(search) ||
          (campaign.company.client_name ?? "").toLowerCase().includes(search);
        const clientMatches = !clientId || campaign.company.client_id === clientId;
        const companyMatches = !companyId || campaign.company.id === companyId;
        const statusMatches = !status || campaign.status === status;
        const computedScheduleState =
          campaign.mission_count === 0
            ? "unscheduled"
            : campaign.scheduled_mission_count === campaign.mission_count
              ? "scheduled"
              : campaign.unscheduled_mission_count === campaign.mission_count
                ? "unscheduled"
                : "partial";
        const scheduleMatches = !scheduleState || computedScheduleState === scheduleState;

        return (
          searchMatches &&
          clientMatches &&
          companyMatches &&
          statusMatches &&
          scheduleMatches
        );
      });

      const sorted = [...filtered].sort((left, right) => {
        const leftValue =
          sortBy === "name"
            ? left.name
            : sortBy === "status"
              ? left.status
              : sortBy === "start_date"
                ? left.start_date ?? ""
                : sortBy === "end_date"
                  ? left.end_date ?? ""
                  : sortBy === "created_at"
                    ? left.created_at
                    : left.updated_at;
        const rightValue =
          sortBy === "name"
            ? right.name
            : sortBy === "status"
              ? right.status
              : sortBy === "start_date"
                ? right.start_date ?? ""
                : sortBy === "end_date"
                  ? right.end_date ?? ""
                  : sortBy === "created_at"
                    ? right.created_at
                    : right.updated_at;
        const direction = sortDirection === "asc" ? 1 : -1;

        if (leftValue < rightValue) {
          return -1 * direction;
        }
        if (leftValue > rightValue) {
          return 1 * direction;
        }
        return left.id.localeCompare(right.id) * direction;
      });

      const start = (page - 1) * limit;
      const pageData = sorted.slice(start, start + limit);

      return jsonResponse(paginated(pageData, page, limit, sorted.length));
    }

    throw new Error(`Unhandled campaign list request: ${method} ${path}`);
  });
}

describe("CampaignListPage", () => {
  beforeEach(() => {
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

  it("hydrates search state from URL and displays matching results", async () => {
    const fetchMock = createCampaignListFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route
          path="/campaigns"
          element={
            <>
              <LocationProbe />
              <CampaignListPage canPlan />
            </>
          }
        />
      </Routes>,
      "/campaigns?search=alpha",
    );

    const searchInput = await screen.findByPlaceholderText("Search campaigns...");
    expect(searchInput).toHaveValue("alpha");
    expect(screen.getByTestId("location-probe")).toHaveTextContent("search=alpha");
    expect(await screen.findByRole("link", { name: /Alpha Launch/i })).toBeInTheDocument();
  });

  it("keeps list state in the URL and distinguishes no-results from no-data", async () => {
    const fetchMock = createCampaignListFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(
      <Routes>
        <Route
          path="/campaigns"
          element={
            <>
              <LocationProbe />
              <CampaignListPage canPlan />
            </>
          }
        />
      </Routes>,
      "/campaigns?page=2&limit=1",
    );

    expect(await screen.findByText("Page 2 of 3 · 3 campaigns")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bravo Burst/i })).toBeInTheDocument();
    const [searchInput] = screen.getAllByRole("searchbox");

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "missing");

    await waitFor(() =>
      expect(screen.getByTestId("location-probe")).toHaveTextContent(
        "/campaigns?search=missing&limit=1",
      ),
    );

    expect(await screen.findByText("No campaigns match this view")).toBeInTheDocument();
    expect(
      screen.getByText("Adjust search or filters to broaden the campaign list."),
    ).toBeInTheDocument();

    await userEvent.clear(searchInput);

    await waitFor(() =>
      expect(screen.queryByText("No campaigns match this view")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Alpha Launch/i })).toBeInTheDocument();
  });
});
