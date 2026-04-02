import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useCampaignPlanningViewQuery,
  useCampaignSummaryQuery,
} from "../hooks/use-mobile-queries";
import { mobileTheme } from "../theme";
import { formatNumber, formatPercent } from "../utils/format";
import type { RootStackParamList } from "../navigation/types";

export function CampaignDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "CampaignDetail">>();
  const { campaignId, campaignName } = route.params;
  const planningQuery = useCampaignPlanningViewQuery(campaignId);
  const summaryQuery = useCampaignSummaryQuery(campaignId);

  const refresh = () => {
    void Promise.all([planningQuery.refetch(), summaryQuery.refetch()]);
  };

  return (
    <Screen
      title={campaignName ?? "Campaign detail"}
      subtitle="Planning view with nested missions, actions, and assignments."
      refreshing={planningQuery.isRefetching || summaryQuery.isRefetching}
      onRefresh={refresh}
    >
      {planningQuery.isLoading || summaryQuery.isLoading ? (
        <LoadingState label="Loading campaign view..." />
      ) : null}
      {planningQuery.isError || summaryQuery.isError ? (
        <ErrorState
          message="Campaign detail could not be loaded."
          onRetry={refresh}
        />
      ) : null}

      {planningQuery.data && summaryQuery.data ? (
        <>
          <Card eyebrow="Summary" title={planningQuery.data.company.name}>
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
              label="Influencers in scope"
              value={formatNumber(summaryQuery.data.total_influencers)}
            />
            <Pressable
              onPress={() =>
                navigation.navigate("CampaignReport", {
                  campaignId: planningQuery.data.id,
                  campaignName: planningQuery.data.name,
                })
              }
              style={({ pressed }) => [
                styles.reportLink,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.reportLinkLabel}>Open report summary</Text>
            </Pressable>
          </Card>

          <Card eyebrow="Missions" title="Execution map">
            {planningQuery.data.missions.length === 0 ? (
              <EmptyState
                title="No missions created"
                message="This campaign exists, but missions have not been planned yet."
              />
            ) : (
              planningQuery.data.missions.map((mission) => (
                <ListItem
                  key={mission.id}
                  title={mission.name}
                  subtitle={`${mission.actions.length} actions`}
                  description={mission.description ?? "Mission detail not provided."}
                  onPress={() =>
                    navigation.navigate("MissionDetail", {
                      missionId: mission.id,
                      missionName: mission.name,
                    })
                  }
                  rightAccessory={<StatusBadge status={mission.status} />}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reportLink: {
    marginTop: mobileTheme.spacing.md,
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  reportLinkLabel: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
