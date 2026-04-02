import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import {
  useCampaignPlanningViewQuery,
  useCampaignSummaryQuery,
} from "../hooks/use-mobile-queries";
import type { RootStackParamList } from "../navigation/types";
import { mobileTheme } from "../theme";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatStatus,
} from "../utils/format";

export function CampaignReportScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CampaignReport">>();
  const { campaignId, campaignName } = route.params;
  const planningQuery = useCampaignPlanningViewQuery(campaignId);
  const summaryQuery = useCampaignSummaryQuery(campaignId);

  const refresh = () => {
    void Promise.all([planningQuery.refetch(), summaryQuery.refetch()]);
  };

  const missionCount = planningQuery.data?.missions.length ?? 0;
  const actionCount =
    planningQuery.data?.missions.reduce(
      (total, mission) => total + mission.actions.length,
      0,
    ) ?? 0;
  const activeMissions =
    planningQuery.data?.missions.filter((mission) => mission.status === "active")
      .length ?? 0;

  return (
    <Screen
      title={campaignName ?? planningQuery.data?.name ?? "Campaign report"}
      subtitle="A lightweight performance view tied directly to campaign execution."
      refreshing={planningQuery.isRefetching || summaryQuery.isRefetching}
      onRefresh={refresh}
    >
      {planningQuery.isLoading || summaryQuery.isLoading ? (
        <LoadingState label="Loading campaign report..." />
      ) : null}
      {planningQuery.isError || summaryQuery.isError ? (
        <ErrorState
          message="Campaign report could not be loaded."
          onRetry={refresh}
        />
      ) : null}
      {planningQuery.data && summaryQuery.data ? (
        <>
          <Card eyebrow="Performance" title="Outcome snapshot">
            <MetricRow
              label="Total impressions"
              value={formatNumber(summaryQuery.data.total_impressions)}
            />
            <MetricRow
              label="Total engagement"
              value={formatNumber(summaryQuery.data.total_engagement)}
            />
            <MetricRow
              label="Engagement rate"
              value={formatPercent(summaryQuery.data.engagement_rate)}
            />
            <MetricRow
              label="Published posts"
              value={formatNumber(summaryQuery.data.total_posts)}
            />
            <MetricRow
              label="Influencers in scope"
              value={formatNumber(summaryQuery.data.total_influencers)}
            />
            <MetricRow
              label="Last snapshot"
              value={formatDate(summaryQuery.data.last_snapshot_at)}
            />
          </Card>

          <Card
            eyebrow="Execution"
            title="Planning context"
            footer={
              <Pressable
                onPress={() =>
                  navigation.navigate("CampaignDetail", {
                    campaignId: planningQuery.data.id,
                    campaignName: planningQuery.data.name,
                  })
                }
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.linkButtonLabel}>Open planning view</Text>
              </Pressable>
            }
          >
            <MetricRow
              label="Company"
              value={planningQuery.data.company.name}
            />
            <MetricRow
              label="Campaign status"
              value={formatStatus(planningQuery.data.status)}
            />
            <MetricRow
              label="Mission count"
              value={formatNumber(missionCount)}
            />
            <MetricRow
              label="Active missions"
              value={formatNumber(activeMissions)}
            />
            <MetricRow
              label="Action count"
              value={formatNumber(actionCount)}
            />
          </Card>

          <Card eyebrow="Interpretation" title="What this means">
            {summaryQuery.data.total_posts === 0 ? (
              <EmptyState
                title="No published posts yet"
                message="Execution is in flight, but campaign reporting will stay sparse until approved deliverables are linked to posts."
              />
            ) : (
              <View style={styles.interpretationList}>
                <Text style={styles.interpretationText}>
                  This report uses raw performance snapshots as the source of truth.
                </Text>
                <Text style={styles.interpretationText}>
                  Summary metrics refresh as new posts and snapshots land in the operational workflow.
                </Text>
                <Text style={styles.interpretationText}>
                  Use the planning view to trace any performance result back to its missions, actions, and assignments.
                </Text>
              </View>
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  interpretationList: {
    gap: mobileTheme.spacing.sm,
  },
  interpretationText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  linkButton: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  linkButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
