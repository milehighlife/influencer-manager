import { expect, test, type Locator, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "avery.chen@northstar.example";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "AdminPass123!";
const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3000/api";
const API_HEALTH_URL =
  process.env.PLAYWRIGHT_API_HEALTH_URL ?? `${API_BASE_URL}/health/live`;

function sectionByHeading(page: Page, title: string) {
  return page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

function missionPanel(page: Page, name: string) {
  return page.locator(".mission-panel").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

function actionCard(page: Page, name: string) {
  return page.locator(".action-card").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

function firstCampaignCardTitle(page: Page) {
  return page.locator(".list-card h3").first();
}

function searchInput(page: Page) {
  return page.locator('.search-bar-input').first();
}

async function login(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Campaign Builder" })).toBeVisible();
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/campaigns$/);
  await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();
}

async function assertApiAvailable() {
  const response = await fetch(API_HEALTH_URL);
  if (!response.ok) {
    throw new Error(
      `Local API is not available for browser smoke tests at ${API_HEALTH_URL}.`,
    );
  }
}

let cachedPlannerApiSession:
  | {
      accessToken: string;
      companyId: string;
    }
  | undefined;

async function getPlannerApiSession() {
  if (cachedPlannerApiSession) {
    return cachedPlannerApiSession;
  }

  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error("Failed to authenticate planner smoke API session.");
  }

  const loginPayload = (await loginResponse.json()) as { access_token: string };
  const accessToken = loginPayload.access_token;

  const companiesResponse = await fetch(`${API_BASE_URL}/companies?page=1&limit=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!companiesResponse.ok) {
    throw new Error("Failed to load companies for planner smoke API session.");
  }

  const companiesPayload = (await companiesResponse.json()) as {
    data: Array<{ id: string }>;
  };
  const companyId = companiesPayload.data[0]?.id;

  if (!companyId) {
    throw new Error("No company available for planner smoke setup.");
  }

  cachedPlannerApiSession = { accessToken, companyId };
  return cachedPlannerApiSession;
}

async function seedPlannerListCampaigns(prefix: string, count: number) {
  const { accessToken, companyId } = await getPlannerApiSession();

  for (let index = 1; index <= count; index += 1) {
    const name = `${prefix} ${String(index).padStart(2, "0")}`;
    const response = await fetch(`${API_BASE_URL}/companies/${companyId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name,
        campaign_type: "product_launch",
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to seed planner-list smoke campaign "${name}".`);
    }
  }
}

async function selectFirstRealOption(select: Locator) {
  const values = await select.locator("option").evaluateAll((options) =>
    options.map((option, index) => ({
      index,
      value: (option as HTMLOptionElement).value,
      disabled: (option as HTMLOptionElement).disabled,
    })),
  );
  const firstRealOption = values.find(
    (option) => option.index > 0 && !option.disabled && option.value,
  );
  const firstIndexedOption = values.find((option) => option.index > 0 && !option.disabled);

  if (firstRealOption) {
    await select.selectOption(firstRealOption.value);
    return;
  }

  if (!firstIndexedOption) {
    throw new Error("No selectable option found.");
  }

  await select.selectOption({ index: firstIndexedOption.index });
}

async function searchAndSelectCompany(section: Locator, searchTerm: string) {
  await section.locator('input[type="search"]').first().fill(searchTerm);
  await selectFirstRealOption(section.locator("select").first());
}

test.describe.serial("desktop planner live-browser smoke", () => {
  test.beforeAll(async () => {
    await assertApiAvailable();
  });

  test("blocks invalid campaign date order in the browser", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Create Campaign" }).click();

    const createSection = sectionByHeading(page, "New campaign");
    await expect(createSection).toBeVisible();

    await searchAndSelectCompany(createSection, "Glow");
    await createSection.getByLabel("Name").fill(`Browser Validation ${Date.now()}`);
    await createSection.getByLabel("Start date").fill("2026-04-10");
    await createSection.getByLabel("End date").fill("2026-04-01");

    await expect(
      createSection.getByText(
        "Campaign start date must be on or before the campaign end date.",
      ),
    ).toBeVisible();
    await expect(
      createSection.getByRole("button", { name: "Create campaign" }),
    ).toBeDisabled();
  });

  test("creates and mutates a campaign through real browser flows", async ({ page }) => {
    const suffix = Date.now();
    const campaignName = `Browser Smoke ${suffix}`;
    const missionName = `Mission ${suffix}`;
    const actionName = `Action ${suffix}`;
    const campaignSectionDateText = "Apr 1, 2026 to Apr 5, 2026";

    await login(page);

    await page.getByRole("button", { name: "Create Campaign" }).click();
    const createSection = sectionByHeading(page, "New campaign");
    await expect(createSection).toBeVisible();

    await searchAndSelectCompany(createSection, "Glow");
    await createSection.getByLabel("Name").fill(campaignName);
    await createSection.getByLabel("Start date").fill("2026-04-01");
    await createSection.getByLabel("End date").fill("2026-04-05");
    await createSection.getByRole("button", { name: "Create campaign" }).click();

    await expect(page).toHaveURL(/\/campaigns\/.+$/);
    await expect(page.getByRole("heading", { name: campaignName, exact: true })).toBeVisible();

    const campaignSection = sectionByHeading(page, campaignName);
    const timelineSection = sectionByHeading(page, "Schedule overview");

    await page.getByRole("button", { name: "Edit Campaign" }).click();
    await campaignSection.getByRole("button", { name: "Clear" }).nth(0).click();
    await campaignSection.getByRole("button", { name: "Clear" }).nth(1).click();
    await campaignSection.getByRole("button", { name: "Save campaign" }).click();

    await expect(campaignSection).toContainText("Not set to Not set");
    await expect(timelineSection).toContainText("Not set");

    await page.getByRole("button", { name: "Edit Campaign" }).click();
    await campaignSection.getByLabel("Start date").fill("2026-04-01");
    await campaignSection.getByLabel("End date").fill("2026-04-05");
    await campaignSection.getByRole("button", { name: "Save campaign" }).click();

    await expect(campaignSection).toContainText(campaignSectionDateText);
    await expect(timelineSection).toContainText(campaignSectionDateText);

    const missionCreateSection = sectionByHeading(page, "Build the next stage");
    await page.getByRole("button", { name: "Add Mission" }).click();
    await missionCreateSection.getByLabel("Mission name").fill(missionName);
    await missionCreateSection.getByLabel("Mission start date").fill("2026-04-01");
    await missionCreateSection.getByLabel("Mission end date").fill("2026-04-03");
    await missionCreateSection.getByRole("button", { name: "Add mission" }).click();

    const mission = missionPanel(page, missionName);
    await expect(mission).toBeVisible();
    await expect(mission).toContainText("Mission schedule: Apr 1, 2026 to Apr 3, 2026");

    await mission.getByRole("button", { name: "Edit" }).click();
    await mission.getByRole("button", { name: "Clear" }).nth(1).click();
    await mission.getByRole("button", { name: "Save mission" }).click();

    await expect(mission).toContainText("Mission schedule: Apr 1, 2026 to Not set");

    await mission.getByRole("button", { name: "Edit" }).click();
    await mission.getByLabel("Mission end date").fill("2026-04-03");
    await mission.getByRole("button", { name: "Save mission" }).click();

    await expect(mission).toContainText("Mission schedule: Apr 1, 2026 to Apr 3, 2026");

    await mission.getByRole("button", { name: "Expand" }).click();
    await mission.getByRole("button", { name: "Add Action" }).click();
    await mission.getByLabel("Action title").fill(actionName);
    await mission.getByLabel("Start window").fill("2026-04-01T09:00");
    await mission.getByLabel("End window").fill("2026-04-01T17:00");
    await mission.getByRole("button", { name: "Add action" }).click();

    const action = actionCard(page, actionName);
    await expect(action).toBeVisible();
    await expect(action).toContainText("Window: Apr 1, 2026 to Apr 1, 2026");

    await action.getByRole("button", { name: "Edit" }).click();
    await action.getByRole("button", { name: "Clear" }).nth(0).click();
    await action.getByRole("button", { name: "Clear" }).nth(1).click();
    await action.getByRole("button", { name: "Save action" }).click();

    await expect(action).toContainText("Window: Not set to Not set");
    await expect(
      page.locator(".timeline-action-row").filter({ hasText: actionName }),
    ).toContainText("Unscheduled");

    await action.getByRole("button", { name: "Edit" }).click();
    await action.getByLabel("Start window").fill("2026-04-01T09:00");
    await action.getByLabel("Deadline / end window").fill("2026-04-01T17:00");
    await action.getByRole("button", { name: "Save action" }).click();

    await expect(action).toContainText("Window: Apr 1, 2026 to Apr 1, 2026");

    await action.getByRole("button", { name: "Assign Influencer" }).click();
    await action.getByRole("textbox", { name: "Search influencers" }).fill("Nina");
    const influencerSelect = action.locator("select").first();
    await influencerSelect.selectOption({ label: "Nina Alvarez • instagram" });
    await action.getByRole("button", { name: "Assign influencer" }).click();

    await expect(action).toContainText("1 assigned influencer");
    await expect(action).toContainText("Nina");

    page.once("dialog", (dialog) => dialog.accept());
    await action.getByRole("button", { name: "Remove" }).click();
    await expect(action).toContainText("No influencers assigned");
    await expect(action).toContainText("0 assigned influencers");

    page.once("dialog", (dialog) => dialog.accept());
    await action.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(actionName, { exact: true })).toHaveCount(0);

    page.once("dialog", (dialog) => dialog.accept());
    await mission.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(missionName, { exact: true })).toHaveCount(0);
  });

  test("drives search and pagination against backend query state", async ({
    page,
  }) => {
    const prefix = `Planner Query Smoke ${Date.now()}`;
    await seedPlannerListCampaigns(prefix, 13);

    await login(page);

    const search = searchInput(page);

    await search.fill(prefix);
    await expect(page.getByText("Page 1 of 2 · 13 campaigns")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2 · 13 campaigns")).toBeVisible();

    await firstCampaignCardTitle(page).click();
    await expect(page).toHaveURL(/\/campaigns\/.+$/);
    await page.goBack();
    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          path: url.pathname,
          search: url.searchParams.get("search"),
          page: url.searchParams.get("page"),
        };
      })
      .toEqual({
        path: "/campaigns",
        search: prefix,
        page: "2",
      });
    await expect(page.getByText("Page 2 of 2 · 13 campaigns")).toBeVisible();
    await expect(search).toHaveValue(prefix);

    await page.reload();
    await expect(page.getByText("Page 2 of 2 · 13 campaigns")).toBeVisible();
    await expect(search).toHaveValue(prefix);

    await search.fill("");
    await expect(page.getByText(/Page 1 of \d+ · ([1-9]\d+|[2-9]\d{2,}) campaigns/)).toBeVisible();

    await search.fill("Summit Nutrition Group");
    await expect(page.getByText("Page 1 of 1 · 1 campaigns")).toBeVisible();
    await expect(firstCampaignCardTitle(page)).toHaveText("PeakFuel Recovery Reset");

    await search.fill("zzz-no-match-zzz");
    await expect(page.getByText("No campaigns match this view")).toBeVisible();
    await expect(
      page.getByText("Adjust search or filters to broaden the campaign list."),
    ).toBeVisible();
  });
});
