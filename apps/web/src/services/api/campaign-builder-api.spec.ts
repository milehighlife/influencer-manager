import { beforeEach, describe, expect, it, vi } from "vitest";

import { actionAssignmentsApi } from "./action-assignments";
import { actionsApi } from "./actions";
import { campaignsApi } from "./campaigns";
import { clientsApi } from "./clients";
import { companiesApi } from "./companies";
import { influencersApi } from "./influencers";
import { missionsApi } from "./missions";
import { useAuthStore } from "../../state/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    text: async () => JSON.stringify(body),
  };
}

describe("campaign builder api routes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.setState({
      accessToken: "planner-token",
      user: null,
      hasHydrated: true,
      sessionValidated: true,
    });
    fetchMock.mockResolvedValue(jsonResponse({ id: "ok" }));
  });

  it("patches campaign updates through the existing campaign endpoint", async () => {
    await campaignsApi.update("campaign-1", {
      name: "Updated launch",
      status: "planned",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/campaigns/campaign-1",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer planner-token",
        }),
        body: JSON.stringify({
          name: "Updated launch",
          status: "planned",
        }),
      }),
    );
  });

  it("sends explicit nulls when clearing saved campaign, mission, and action schedules", async () => {
    await campaignsApi.update("campaign-1", {
      start_date: null,
      end_date: null,
    });
    await missionsApi.update("mission-1", {
      start_date: null,
      end_date: null,
    });
    await actionsApi.update("action-1", {
      start_window: null,
      end_window: null,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/campaigns/campaign-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          start_date: null,
          end_date: null,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/missions/mission-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          start_date: null,
          end_date: null,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/api/actions/action-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          start_window: null,
          end_window: null,
        }),
      }),
    );
  });

  it("creates campaigns under the selected company through the company-scoped endpoint", async () => {
    await campaignsApi.createUnderCompany("company-1", {
      name: "Spring launch",
      description: "Launch burst",
      campaign_type: "product_launch",
      status: "draft",
      start_date: "2026-03-20",
      end_date: "2026-03-30",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/companies/company-1/campaigns",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer planner-token",
        }),
        body: JSON.stringify({
          name: "Spring launch",
          description: "Launch burst",
          campaign_type: "product_launch",
          status: "draft",
          start_date: "2026-03-20",
          end_date: "2026-03-30",
        }),
      }),
    );
  });

  it("loads the planner campaign list from the dedicated planner read-model endpoint", async () => {
    await campaignsApi.listPlanner({
      page: 2,
      limit: 10,
      search: "spring",
      client_id: "client-1",
      company_id: "company-1",
      status: "planned",
      schedule_state: "partial",
      sort_by: "name",
      sort_direction: "asc",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/campaigns/planner-list?page=2&limit=10&search=spring&company_id=company-1&client_id=client-1&status=planned&schedule_state=partial&sort_by=name&sort_direction=asc",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer planner-token",
        }),
      }),
    );
  });

  it("queries admin lookups through backend search instead of relying on a capped local page", async () => {
    await clientsApi.list({
      page: 1,
      limit: 20,
      search: "north",
    });
    await companiesApi.list({
      page: 1,
      limit: 20,
      client_id: "client-1",
      search: "shoe",
    });
    await influencersApi.list({
      page: 1,
      limit: 20,
      search: "nina",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/clients?page=1&limit=20&search=north",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/companies?page=1&limit=20&client_id=client-1&search=shoe",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/api/influencers?page=1&limit=20&search=nina",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("patches mission updates and deletes missions through existing mission endpoints", async () => {
    await missionsApi.update("mission-1", {
      name: "Launch wave revised",
      description: "Updated description",
      start_date: "2026-03-03",
      end_date: "2026-03-10",
    });
    await missionsApi.remove("mission-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/missions/mission-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "Launch wave revised",
          description: "Updated description",
          start_date: "2026-03-03",
          end_date: "2026-03-10",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/missions/mission-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("patches action updates and deletes actions through existing action endpoints", async () => {
    await actionsApi.update("action-1", {
      title: "Updated reel brief",
      platform: "tiktok",
      required_deliverables: 2,
      start_window: "2026-03-10T08:00",
      end_window: "2026-03-18T17:00",
    });
    await actionsApi.remove("action-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/actions/action-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Updated reel brief",
          platform: "tiktok",
          required_deliverables: 2,
          start_window: "2026-03-10T08:00",
          end_window: "2026-03-18T17:00",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/actions/action-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("deletes influencer assignments through the existing assignment endpoint", async () => {
    await actionAssignmentsApi.remove("assignment-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/action-assignments/assignment-1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});
