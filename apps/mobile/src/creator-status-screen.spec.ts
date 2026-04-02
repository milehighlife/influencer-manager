import { render } from "@testing-library/react-native";
import { afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import React from "react";

import { CreatorStatusScreen } from "./screens/CreatorUpdatesScreen";
import * as workspaceQueries from "./hooks/use-influencer-workspace-queries";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    canGoBack: () => false,
    goBack: jest.fn(),
  }),
  useIsFocused: () => true,
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

beforeAll(() => {
  const globalWindow = (global as typeof global & {
    window?: { dispatchEvent?: () => void };
  });

  globalWindow.window = globalWindow.window ?? {};
  globalWindow.window.dispatchEvent = (() => true) as never;
});

describe("CreatorStatusScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders latest-signal copy and bounded digest rows from the backend digest", () => {
    jest.spyOn(workspaceQueries, "useCreatorStatusDigestQuery").mockReturnValue({
      data: {
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
        ],
        limit: 20,
        attention_count: 2,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    } as never);
    jest.spyOn(workspaceQueries, "useInfluencerAssignmentSummaryQuery").mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 1, total: 0, totalPages: 0 },
        summary: {
          total_assignments: 3,
          status_counts: {
            assigned: 0,
            accepted: 0,
            in_progress: 0,
            submitted: 1,
            approved: 1,
            rejected: 1,
            completed: 0,
          },
        },
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    } as never);

    const screen = render(React.createElement(CreatorStatusScreen));

    expect(screen.getByText("Latest creator workflow signals")).toBeTruthy();
    expect(
      screen.getByText(
        "This screen shows the latest 20 creator workflow signals by update time. The badge shows items that still need action, not a read or unread count.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Metrics currently available")).toBeTruthy();
    expect(
      screen.getByTestId("creator-status-row-post_metrics_available-demo"),
    ).toBeTruthy();
  });

  it("renders the empty digest state truthfully", () => {
    jest.spyOn(workspaceQueries, "useCreatorStatusDigestQuery").mockReturnValue({
      data: {
        items: [],
        limit: 20,
        attention_count: 0,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    } as never);
    jest.spyOn(workspaceQueries, "useInfluencerAssignmentSummaryQuery").mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 1, total: 0, totalPages: 0 },
        summary: {
          total_assignments: 0,
          status_counts: {
            assigned: 0,
            accepted: 0,
            in_progress: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
          },
        },
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn(),
    } as never);

    const screen = render(React.createElement(CreatorStatusScreen));

    expect(screen.getByText("No creator signals yet")).toBeTruthy();
    expect(
      screen.getByText(
        "Latest creator workflow signals will appear here when assignment reviews, linked posts, or tracked metrics exist.",
      ),
    ).toBeTruthy();
  });
});
