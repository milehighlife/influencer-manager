import { useEffect } from "react";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  getEmptyInfluencerAssignmentSummary,
  useCreatorStatusDigestQuery,
  useInfluencerAssignmentSummaryQuery,
} from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { mobileTheme } from "../theme";
import { formatDate } from "../utils/format";

function createStatusDigestRowTestId(item: {
  type: string;
  destination:
    | { type: "assignment"; assignment_id: string }
    | { type: "post"; post_id: string; post_url: string };
}) {
  if (item.destination.type === "assignment") {
    return `creator-status-row-${item.type}-${item.destination.assignment_id}`;
  }

  const postToken =
    item.destination.post_url
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/[^a-zA-Z0-9_-]/g, "-") ?? item.destination.post_id;

  return `creator-status-row-${item.type}-${postToken}`;
}

export function CreatorStatusScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const digestQuery = useCreatorStatusDigestQuery();
  const assignmentSummaryQuery = useInfluencerAssignmentSummaryQuery();
  const items = digestQuery.data?.items ?? [];
  const attentionCount = digestQuery.data?.attention_count ?? 0;
  const digestLimit = digestQuery.data?.limit ?? 20;
  const assignmentSummary =
    assignmentSummaryQuery.data?.summary ?? getEmptyInfluencerAssignmentSummary();
  const isLoading = digestQuery.isLoading || assignmentSummaryQuery.isLoading;
  const isError = digestQuery.isError || assignmentSummaryQuery.isError;
  const isRefetching =
    digestQuery.isRefetching || assignmentSummaryQuery.isRefetching;
  const refetch = async () => {
    await Promise.all([digestQuery.refetch(), assignmentSummaryQuery.refetch()]);
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void refetch();
  }, [isFocused, digestQuery.refetch, assignmentSummaryQuery.refetch]);

  return (
    <Screen
      title="Status"
      subtitle="Current review, posting, and tracking state across your creator work."
      refreshing={isRefetching}
      onRefresh={() => {
        void refetch();
      }}
    >
      <Card eyebrow="Attention" title="What needs action now">
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>{attentionCount}</Text>
            <Text style={styles.summaryLabel}>Needs attention</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>
              {assignmentSummary.status_counts.submitted}
            </Text>
            <Text style={styles.summaryLabel}>Awaiting review</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>
              {assignmentSummary.status_counts.rejected}
            </Text>
            <Text style={styles.summaryLabel}>Changes requested</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>
              {assignmentSummary.status_counts.approved}
            </Text>
            <Text style={styles.summaryLabel}>Ready to post</Text>
          </View>
        </View>
        <Text style={styles.summaryNote}>
          {`This screen shows the latest ${digestLimit} creator workflow signals by update time. The badge shows items that still need action, not a read or unread count.`}
        </Text>
      </Card>

      {isLoading ? <LoadingState label="Loading current status..." /> : null}

      {isError ? (
        <ErrorState
          message="Current status could not be loaded."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          title="No creator signals yet"
          message="Latest creator workflow signals will appear here when assignment reviews, linked posts, or tracked metrics exist."
        />
      ) : null}

      {!isLoading && !isError && items.length > 0 ? (
        <Card eyebrow="Latest signals" title="Latest creator workflow signals">
          <View style={styles.list}>
            {items.map((item) => (
              <ListItem
                key={item.id}
                testID={createStatusDigestRowTestId(item)}
                title={item.title}
                subtitle={`Last updated ${formatDate(item.updated_at)}`}
                description={item.description}
                rightAccessory={
                  <View style={styles.notificationRight}>
                    <StatusBadge
                      status={item.badge_status}
                      label={item.badge_label}
                    />
                    {item.attention ? (
                      <Text style={styles.attentionLabel}>Needs attention</Text>
                    ) : null}
                  </View>
                }
                onPress={() => {
                  if (item.destination.type === "assignment") {
                    navigation.navigate("InfluencerAssignmentDetail", {
                      assignmentId: item.destination.assignment_id,
                      assignmentTitle: item.destination.assignment_title,
                    });
                    return;
                  }

                  navigation.navigate("PostPerformance", {
                    postId: item.destination.post_id,
                    postUrl: item.destination.post_url,
                  });
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card eyebrow="How to read this" title="What this screen means">
        <View style={styles.guidanceList}>
          <Text style={styles.guidanceItem}>
            {"\u2022"} These rows show the latest creator workflow signals, not a recent activity timeline or full history.
          </Text>
          <Text style={styles.guidanceItem}>
            {`\u2022 The list is intentionally bounded to the latest ${digestLimit} signals ordered by update time.`}
          </Text>
          <Text style={styles.guidanceItem}>
            {"\u2022"} Use the attention badge to focus on items that still require creator action.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  summaryCard: {
    minWidth: 120,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.white,
    gap: mobileTheme.spacing.xs,
  },
  summaryCount: {
    color: mobileTheme.colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  summaryLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryNote: {
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: mobileTheme.spacing.sm,
  },
  notificationRight: {
    alignItems: "flex-end",
    gap: mobileTheme.spacing.xs,
  },
  attentionLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  guidanceList: {
    gap: mobileTheme.spacing.sm,
  },
  guidanceItem: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
