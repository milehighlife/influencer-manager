import {
  PLANNING_WRITE_ROLES,
  READ_ONLY_ROLES,
} from "@influencer-manager/shared/types/auth";
import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAssignmentsQuery,
  useCampaignsQuery,
  useInfluencersQuery,
} from "../hooks/use-mobile-queries";
import type { RootStackParamList } from "../navigation/types";
import { useAuthStore } from "../state/auth-store";
import { mobileTheme } from "../theme";
import { formatDate, formatNumber } from "../utils/format";

export function AssignmentQueueScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AssignmentQueue">>();
  const currentUser = useAuthStore((state) => state.user);
  const { assignmentStatus, title, subtitle } = route.params;
  const [campaignId, setCampaignId] = useState<string | undefined>();
  const [influencerId, setInfluencerId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState("");
  const assignmentsQuery = useAssignmentsQuery({
    page: 1,
    limit: 20,
    assignment_status: assignmentStatus,
    campaign_id: campaignId,
    influencer_id: influencerId,
  });
  const campaignsQuery = useCampaignsQuery({ page: 1, limit: 50 });
  const influencersQuery = useInfluencersQuery();
  const campaigns = campaignsQuery.data?.data ?? [];
  const influencers = influencersQuery.data?.data ?? [];
  const canManageWorkflow = currentUser
    ? PLANNING_WRITE_ROLES.includes(
        currentUser.role as (typeof PLANNING_WRITE_ROLES)[number],
      )
    : false;
  const isReadOnlyUser = currentUser
    ? READ_ONLY_ROLES.includes(
        currentUser.role as (typeof READ_ONLY_ROLES)[number],
      )
    : false;
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredAssignments = (assignmentsQuery.data?.data ?? []).filter(
    (assignment) => {
      if (!normalizedSearch) {
        return true;
      }

      const influencer = influencers.find(
        (entry) => entry.id === assignment.influencer_id,
      );
      const searchFields = [
        assignment.id,
        assignment.action_id,
        assignment.influencer_id,
        assignment.assignment_status,
        assignment.due_date ?? "",
        influencer?.name ?? "",
        influencer?.handle ?? "",
        influencer?.email ?? "",
      ];

      return searchFields.some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      );
    },
  );
  const selectedCampaignName =
    campaigns.find((campaign) => campaign.id === campaignId)?.name ?? "All campaigns";
  const selectedInfluencerName =
    influencers.find((influencer) => influencer.id === influencerId)?.name ??
    "All influencers";
  const isLoading =
    assignmentsQuery.isLoading || campaignsQuery.isLoading || influencersQuery.isLoading;
  const isError =
    assignmentsQuery.isError || campaignsQuery.isError || influencersQuery.isError;
  const refresh = () => {
    void Promise.all([
      assignmentsQuery.refetch(),
      campaignsQuery.refetch(),
      influencersQuery.refetch(),
    ]);
  };

  return (
    <Screen
      title={title}
      subtitle={
        subtitle ??
        (assignmentStatus === "submitted"
          ? "Assignments currently waiting for deliverable review."
          : "Assignments that were rejected and need another work pass.")
      }
      refreshing={
        assignmentsQuery.isRefetching ||
        campaignsQuery.isRefetching ||
        influencersQuery.isRefetching
      }
      onRefresh={refresh}
    >
      <Card eyebrow="Filters" title="Queue controls">
        <Text style={styles.queueHint}>
          {canManageWorkflow
            ? "Open any assignment in this queue to review it, resume work, or link approved posts."
            : isReadOnlyUser
              ? "Your role can monitor this queue, but workflow actions stay locked to campaign managers and organization admins."
              : "Use this queue to track assignments that need attention."}
        </Text>
        <TextInput
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Search by assignment, influencer, or due date"
          placeholderTextColor={mobileTheme.colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.filterLabel}>Campaign</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setCampaignId(undefined)}
            style={[
              styles.filterChip,
              !campaignId ? styles.filterChipSelected : null,
            ]}
          >
            <Text
              style={[
                styles.filterChipLabel,
                !campaignId ? styles.filterChipLabelSelected : null,
              ]}
            >
              All campaigns
            </Text>
          </Pressable>
          {campaigns.map((campaign) => (
            <Pressable
              key={campaign.id}
              onPress={() =>
                setCampaignId((current) =>
                  current === campaign.id ? undefined : campaign.id,
                )
              }
              style={[
                styles.filterChip,
                campaignId === campaign.id ? styles.filterChipSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  campaignId === campaign.id
                    ? styles.filterChipLabelSelected
                    : null,
                ]}
              >
                {campaign.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.filterLabel}>Influencer</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setInfluencerId(undefined)}
            style={[
              styles.filterChip,
              !influencerId ? styles.filterChipSelected : null,
            ]}
          >
            <Text
              style={[
                styles.filterChipLabel,
                !influencerId ? styles.filterChipLabelSelected : null,
              ]}
            >
              All influencers
            </Text>
          </Pressable>
          {influencers.map((influencer) => (
            <Pressable
              key={influencer.id}
              onPress={() =>
                setInfluencerId((current) =>
                  current === influencer.id ? undefined : influencer.id,
                )
              }
              style={[
                styles.filterChip,
                influencerId === influencer.id ? styles.filterChipSelected : null,
              ]}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  influencerId === influencer.id
                    ? styles.filterChipLabelSelected
                    : null,
                ]}
              >
                {influencer.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            {selectedCampaignName} · {selectedInfluencerName}
          </Text>
          <Pressable
            onPress={() => {
              setCampaignId(undefined);
              setInfluencerId(undefined);
              setSearchValue("");
            }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      </Card>
      {isLoading ? (
        <LoadingState label="Loading assignment queue..." />
      ) : null}
      {isError ? (
        <ErrorState
          message="Assignment queue could not be loaded."
          onRetry={refresh}
        />
      ) : null}
      {assignmentsQuery.data ? (
        <Card
          eyebrow="Queue"
          title={`${formatNumber(filteredAssignments.length)} shown`}
          footer={
            <Text style={styles.queueMeta}>
              {formatNumber(assignmentsQuery.data.meta.total)} total in{" "}
              {assignmentStatus === "submitted" ? "pending review" : "rework"} queue
            </Text>
          }
        >
          {filteredAssignments.length === 0 ? (
            <EmptyState
              title={
                normalizedSearch || campaignId || influencerId
                  ? "No assignments match these filters"
                  : "No assignments in this queue"
              }
              message={
                normalizedSearch || campaignId || influencerId
                  ? "Adjust the selected campaign, influencer, or search text to widen the queue."
                  : assignmentStatus === "submitted"
                    ? "Submitted assignments will appear here when creators send work into review."
                    : "Rejected assignments will appear here when reviewers send work back."
              }
            />
          ) : (
            filteredAssignments.map((assignment) => {
              const influencer = influencers.find(
                (entry) => entry.id === assignment.influencer_id,
              );

              return (
                <ListItem
                  key={assignment.id}
                  title={`Assignment ${assignment.id.slice(0, 8)}`}
                  subtitle={
                    influencer
                      ? `${influencer.name} · Expected deliverables: ${assignment.deliverable_count_expected}`
                      : `Expected deliverables: ${assignment.deliverable_count_expected}`
                  }
                  description={
                    assignment.due_date
                      ? `Due ${formatDate(assignment.due_date)}`
                      : "No due date"
                  }
                  onPress={() =>
                    navigation.navigate("AssignmentDetail", {
                      assignmentId: assignment.id,
                      assignmentTitle: `Assignment ${assignment.id.slice(0, 8)}`,
                    })
                  }
                  rightAccessory={<StatusBadge status={assignment.assignment_status} />}
                />
              );
            })
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  queueHint: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: mobileTheme.spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    backgroundColor: mobileTheme.colors.background,
    color: mobileTheme.colors.text,
    fontSize: 15,
    marginBottom: mobileTheme.spacing.md,
  },
  filterLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: mobileTheme.spacing.xs,
  },
  filterRow: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.xs,
    backgroundColor: mobileTheme.colors.background,
  },
  filterChipSelected: {
    backgroundColor: mobileTheme.colors.accent,
    borderColor: mobileTheme.colors.accent,
  },
  filterChipLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipLabelSelected: {
    color: mobileTheme.colors.white,
  },
  filterSummary: {
    marginTop: mobileTheme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.md,
  },
  filterSummaryText: {
    flex: 1,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  clearText: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  queueMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
  },
});
