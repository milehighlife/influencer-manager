import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import {
  PLANNING_WRITE_ROLES,
  READ_ONLY_ROLES,
} from "@influencer-manager/shared/types/auth";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAssignmentsQuery,
  useCampaignsQuery,
  useCampaignSummaryQuery,
  useInfluencersQuery,
} from "../hooks/use-mobile-queries";
import { useAuthStore } from "../state/auth-store";
import { mobileTheme } from "../theme";
import { formatDate, formatNumber, formatPercent } from "../utils/format";
import type { RootStackParamList } from "../navigation/types";

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const campaignsQuery = useCampaignsQuery({ page: 1, limit: 5 });
  const assignmentsQuery = useAssignmentsQuery({ page: 1, limit: 8 });
  const submittedAssignmentsQuery = useAssignmentsQuery({
    page: 1,
    limit: 5,
    assignment_status: "submitted",
  });
  const rejectedAssignmentsQuery = useAssignmentsQuery({
    page: 1,
    limit: 5,
    assignment_status: "rejected",
  });
  const influencersQuery = useInfluencersQuery();
  const firstActiveCampaign = campaignsQuery.data?.data.find(
    (campaign) => campaign.status === "active",
  );
  const reportSpotlightQuery = useCampaignSummaryQuery(firstActiveCampaign?.id ?? "");

  const canManageWorkflow = user
    ? PLANNING_WRITE_ROLES.includes(
      user.role as (typeof PLANNING_WRITE_ROLES)[number],
    )
    : false;
  const isReadOnlyUser = user
    ? READ_ONLY_ROLES.includes(user.role as (typeof READ_ONLY_ROLES)[number])
    : false;

  const isLoading =
    campaignsQuery.isLoading ||
    assignmentsQuery.isLoading ||
    submittedAssignmentsQuery.isLoading ||
    rejectedAssignmentsQuery.isLoading ||
    influencersQuery.isLoading;

  const isError =
    campaignsQuery.isError ||
    assignmentsQuery.isError ||
    submittedAssignmentsQuery.isError ||
    rejectedAssignmentsQuery.isError ||
    influencersQuery.isError;

  const refresh = () => {
    void Promise.all([
      campaignsQuery.refetch(),
      assignmentsQuery.refetch(),
      submittedAssignmentsQuery.refetch(),
      rejectedAssignmentsQuery.refetch(),
      influencersQuery.refetch(),
      ...(firstActiveCampaign ? [reportSpotlightQuery.refetch()] : []),
    ]);
  };

  const campaigns = campaignsQuery.data?.data ?? [];
  const assignments = assignmentsQuery.data?.data ?? [];
  const submittedAssignments = submittedAssignmentsQuery.data?.data ?? [];
  const rejectedAssignments = rejectedAssignmentsQuery.data?.data ?? [];
  const influencers = influencersQuery.data?.data ?? [];
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");

  const taskSubtitle = canManageWorkflow
    ? "Review submitted deliverables and send rejected work back into motion."
    : isReadOnlyUser
      ? "Watch the review queue and rework backlog without editing workflow state."
      : "Monitor assignments that need review attention.";

  const pendingReviewCount = submittedAssignmentsQuery.data?.meta.total ?? 0;
  const rejectedCount = rejectedAssignmentsQuery.data?.meta.total ?? 0;

  const openAssignmentQueue = (
    assignmentStatus: "submitted" | "rejected",
    title: string,
    subtitle: string,
  ) => {
    navigation.navigate("AssignmentQueue", {
      assignmentStatus,
      title,
      subtitle,
    });
  };

  return (
    <Screen
      title={`Welcome, ${user?.fullName?.split(" ")[0] ?? "team"}`}
      subtitle="Campaign planning visibility and execution task tracking across the organization."
      actions={
        <View style={styles.headerBadges}>
          {pendingReviewCount > 0 ? (
            <Pressable
              onPress={() =>
                openAssignmentQueue(
                  "submitted",
                  "Pending review",
                  "Assignments waiting for deliverable review.",
                )
              }
              style={({ pressed }) => [
                styles.headerBadge,
                pressed ? styles.badgePressed : null,
              ]}
            >
              <Text style={styles.headerBadgeValue}>{formatNumber(pendingReviewCount)}</Text>
              <Text style={styles.headerBadgeLabel}>Pending review</Text>
            </Pressable>
          ) : null}
          {rejectedCount > 0 ? (
            <Pressable
              onPress={() =>
                openAssignmentQueue(
                  "rejected",
                  "Need rework",
                  "Assignments that were rejected and need another pass.",
                )
              }
              style={({ pressed }) => [
                styles.headerBadge,
                styles.headerBadgeWarning,
                pressed ? styles.badgePressed : null,
              ]}
            >
              <Text style={styles.headerBadgeValue}>{formatNumber(rejectedCount)}</Text>
              <Text style={styles.headerBadgeLabel}>Need rework</Text>
            </Pressable>
          ) : null}
        </View>
      }
      refreshing={
        campaignsQuery.isRefetching ||
        assignmentsQuery.isRefetching ||
        submittedAssignmentsQuery.isRefetching ||
        rejectedAssignmentsQuery.isRefetching ||
        influencersQuery.isRefetching
      }
      onRefresh={refresh}
    >
      {isLoading ? <LoadingState label="Loading dashboard..." /> : null}
      {isError ? (
        <ErrorState
          message="Dashboard data could not be loaded from the API."
          onRetry={refresh}
        />
      ) : null}
      {!isLoading && !isError ? (
        <>
          <Card eyebrow="Overview" title="Pipeline snapshot">
            <MetricRow
              label="Campaigns in motion"
              value={formatNumber(activeCampaigns.length)}
              hint="Active campaigns from the cached campaign list"
            />
            <MetricRow
              label="Assignments needing review"
              value={formatNumber(submittedAssignmentsQuery.data?.meta.total ?? 0)}
              hint="Submitted assignments currently in review"
            />
            <MetricRow
              label="Assignments sent back"
              value={formatNumber(rejectedAssignmentsQuery.data?.meta.total ?? 0)}
              hint="Rejected assignments that need another work pass"
            />
            <MetricRow
              label="Available influencers"
              value={formatNumber(influencers.length)}
              hint="Influencer roster loaded into the mobile cache"
            />
          </Card>

          <Card eyebrow="Reports" title="Campaign report spotlight">
            {reportSpotlightQuery.isLoading ? (
              <LoadingState label="Loading report spotlight..." />
            ) : firstActiveCampaign && reportSpotlightQuery.data ? (
              <>
                <Text style={styles.queueIntro}>
                  Outcome view for {firstActiveCampaign.name}. Use this to connect execution activity to current campaign performance.
                </Text>
                <MetricRow
                  label="Impressions"
                  value={formatNumber(reportSpotlightQuery.data.total_impressions)}
                />
                <MetricRow
                  label="Engagement"
                  value={formatNumber(reportSpotlightQuery.data.total_engagement)}
                />
                <MetricRow
                  label="Engagement rate"
                  value={formatPercent(reportSpotlightQuery.data.engagement_rate)}
                />
                <MetricRow
                  label="Posts"
                  value={formatNumber(reportSpotlightQuery.data.total_posts)}
                />
                <Pressable
                  onPress={() =>
                    navigation.navigate("CampaignReport", {
                      campaignId: firstActiveCampaign.id,
                      campaignName: firstActiveCampaign.name,
                    })
                  }
                  style={({ pressed }) => [
                    styles.queueLink,
                    pressed ? styles.queueLinkPressed : null,
                  ]}
                >
                  <Text style={styles.queueLinkLabel}>Open campaign report</Text>
                  <Text style={styles.queueLinkCount}>
                    {formatNumber(reportSpotlightQuery.data.total_influencers)}
                    {" "}influencers
                  </Text>
                </Pressable>
              </>
            ) : reportSpotlightQuery.isError ? (
              <ErrorState
                message="Campaign reporting could not be loaded."
                onRetry={() => {
                  void reportSpotlightQuery.refetch();
                }}
              />
            ) : (
              <EmptyState
                title="No report spotlight yet"
                message="Active campaign reporting will appear here once planning and performance data are available."
              />
            )}
          </Card>

          <Card eyebrow="Tasks" title="Review queue">
            <Text style={styles.queueIntro}>{taskSubtitle}</Text>
            {submittedAssignments.length === 0 ? (
              <EmptyState
                title="Nothing waiting for review"
                message="Submitted assignments will appear here when creators send deliverables into review."
              />
            ) : (
              submittedAssignments.map((assignment) => (
                <ListItem
                  key={assignment.id}
                  title={`Assignment ${assignment.id.slice(0, 8)}`}
                  subtitle={`Due ${formatDate(assignment.due_date)}`}
                  description={`Submitted deliverables: ${assignment.deliverable_count_submitted} of ${assignment.deliverable_count_expected}`}
                  onPress={() =>
                    navigation.navigate("AssignmentDetail", {
                      assignmentId: assignment.id,
                      assignmentTitle: `Assignment ${assignment.id.slice(0, 8)}`,
                    })
                  }
                  rightAccessory={<StatusBadge status={assignment.assignment_status} />}
                />
              ))
            )}
            <Pressable
              onPress={() =>
                openAssignmentQueue(
                  "submitted",
                  "Pending review",
                  "Assignments waiting for deliverable review.",
                )
              }
              style={({ pressed }) => [
                styles.queueLink,
                pressed ? styles.queueLinkPressed : null,
              ]}
            >
              <Text style={styles.queueLinkLabel}>
                Open pending review queue
              </Text>
              <Text style={styles.queueLinkCount}>
                {formatNumber(pendingReviewCount)}
              </Text>
            </Pressable>
          </Card>

          <Card eyebrow="Tasks" title="Rejected assignments">
            {rejectedAssignments.length === 0 ? (
              <EmptyState
                title="No assignments in rework"
                message="Rejected assignments will appear here when reviewers send work back with changes."
              />
            ) : (
              rejectedAssignments.map((assignment) => (
                <ListItem
                  key={assignment.id}
                  title={`Assignment ${assignment.id.slice(0, 8)}`}
                  subtitle="Rework required"
                  description={
                    assignment.due_date
                      ? `Due ${formatDate(assignment.due_date)}`
                      : "No due date set"
                  }
                  onPress={() =>
                    navigation.navigate("AssignmentDetail", {
                      assignmentId: assignment.id,
                      assignmentTitle: `Assignment ${assignment.id.slice(0, 8)}`,
                    })
                  }
                  rightAccessory={<StatusBadge status={assignment.assignment_status} />}
                />
              ))
            )}
            <Pressable
              onPress={() =>
                openAssignmentQueue(
                  "rejected",
                  "Need rework",
                  "Assignments that were rejected and need another pass.",
                )
              }
              style={({ pressed }) => [
                styles.queueLink,
                styles.queueLinkWarning,
                pressed ? styles.queueLinkPressed : null,
              ]}
            >
              <Text style={styles.queueLinkLabel}>Open rework queue</Text>
              <Text style={styles.queueLinkCount}>
                {formatNumber(rejectedCount)}
              </Text>
            </Pressable>
          </Card>

          <Card eyebrow="Campaigns" title="Recent campaigns">
            {campaigns.length === 0 ? (
              <EmptyState
                title="No campaigns yet"
                message="Campaigns will appear here once the planning API has data."
              />
            ) : (
              campaigns.map((campaign) => (
                <ListItem
                  key={campaign.id}
                  title={campaign.name}
                  subtitle={campaign.campaign_type ?? "General campaign"}
                  description={`Start ${formatDate(campaign.start_date)} · End ${formatDate(campaign.end_date)}`}
                  onPress={() =>
                    navigation.navigate("CampaignDetail", {
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                    })
                  }
                  rightAccessory={<StatusBadge status={campaign.status} />}
                />
              ))
            )}
          </Card>

          <Card eyebrow="Assignments" title="Latest workload">
            {assignments.length === 0 ? (
              <EmptyState
                title="No assignments found"
                message="Assignment activity will appear here when campaign actions are staffed."
              />
            ) : (
              assignments.slice(0, 5).map((assignment) => (
                <ListItem
                  key={assignment.id}
                  title={`Assignment ${assignment.id.slice(0, 8)}`}
                  subtitle={`Expected deliverables: ${assignment.deliverable_count_expected}`}
                  description={assignment.due_date ? `Due ${assignment.due_date}` : "No due date"}
                  onPress={() =>
                    navigation.navigate("AssignmentDetail", {
                      assignmentId: assignment.id,
                      assignmentTitle: `Assignment ${assignment.id.slice(0, 8)}`,
                    })
                  }
                  rightAccessory={<StatusBadge status={assignment.assignment_status} />}
                />
              ))
            )}
          </Card>

          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickAction}
              onPress={() =>
                navigation.navigate("AppTabs", {
                  screen: "CampaignList",
                })
              }
            >
              <Text style={styles.quickActionTitle}>Open campaign board</Text>
              <Text style={styles.quickActionText}>
                Review campaign structure, missions, and action staffing.
              </Text>
            </Pressable>
            <Pressable
              style={[styles.quickAction, styles.quickActionSecondary]}
              onPress={() =>
                navigation.navigate("AppTabs", {
                  screen: "InfluencerList",
                })
              }
            >
              <Text style={styles.quickActionTitle}>Open influencer roster</Text>
              <Text style={styles.quickActionText}>
                Check creator availability and planning coverage.
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: mobileTheme.spacing.sm,
  },
  headerBadge: {
    minWidth: 94,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.accentSoft,
    gap: 2,
  },
  headerBadgeWarning: {
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  badgePressed: {
    opacity: 0.76,
  },
  headerBadgeValue: {
    color: mobileTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  headerBadgeLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActions: {
    gap: mobileTheme.spacing.md,
  },
  queueIntro: {
    marginBottom: mobileTheme.spacing.sm,
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  queueLink: {
    marginTop: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  queueLinkWarning: {
    backgroundColor: mobileTheme.colors.warningSoft,
  },
  queueLinkPressed: {
    opacity: 0.78,
  },
  queueLinkLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  queueLinkCount: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  quickAction: {
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.accent,
    gap: mobileTheme.spacing.xs,
    ...mobileTheme.shadow,
  },
  quickActionTitle: {
    color: mobileTheme.colors.white,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  },
  quickActionText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  quickActionSecondary: {
    backgroundColor: mobileTheme.colors.info,
  },
});
