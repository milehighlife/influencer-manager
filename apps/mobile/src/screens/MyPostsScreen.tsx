import type { SocialPlatform } from "@influencer-manager/shared/types/mobile";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { useInfluencerPostsQuery } from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { mobileTheme } from "../theme";
import { formatDate, formatNumber, formatPlatform } from "../utils/format";

const PLATFORM_FILTERS: Array<{ label: string; value: SocialPlatform | "all" }> = [
  { label: "All", value: "all" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "X", value: "x" },
];

export function MyPostsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">(
    "all",
  );
  const query = useInfluencerPostsQuery({
    page: 1,
    limit: 25,
    platform: platformFilter === "all" ? undefined : platformFilter,
  });
  const posts = query.data?.data ?? [];
  const summary = query.data?.summary ?? {
    total_posts: 0,
    tracked_posts: 0,
    pending_sync_posts: 0,
    latest_snapshot_at: null,
  };
  const hasAdditionalPosts = (query.data?.meta.total ?? 0) > posts.length;

  return (
    <Screen
      title="My Posts"
      subtitle="Published content linked back to your approved deliverables."
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <Card eyebrow="History" title="Post tracking status">
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>{summary.total_posts}</Text>
            <Text style={styles.summaryLabel}>Linked posts</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>{summary.tracked_posts}</Text>
            <Text style={styles.summaryLabel}>With metrics</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCount}>{summary.pending_sync_posts}</Text>
            <Text style={styles.summaryLabel}>Awaiting sync</Text>
          </View>
        </View>
        <Text style={styles.historyNote}>
          {summary.latest_snapshot_at
            ? `Latest tracked snapshot: ${formatDate(summary.latest_snapshot_at)}`
            : "No metrics have synced yet. Published posts will start showing counts after snapshot ingestion runs."}
        </Text>
        {hasAdditionalPosts ? (
          <Text style={styles.historyNote}>
            {`Showing the latest ${posts.length} linked posts from ${summary.total_posts} total in this view.`}
          </Text>
        ) : null}
      </Card>

      <Card eyebrow="Filters" title="Platform">
        <View style={styles.filterRow}>
          {PLATFORM_FILTERS.map((filter) => {
            const isActive = platformFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                onPress={() => setPlatformFilter(filter.value)}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    isActive ? styles.filterLabelActive : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {query.isLoading ? <LoadingState label="Loading posts..." /> : null}

      {query.isError ? (
        <ErrorState
          message="Posts could not be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : null}

      {!query.isLoading && !query.isError && posts.length === 0 ? (
        <EmptyState
          title="No posts linked yet"
          message="Approved deliverables will appear here after you link the published post URLs."
        />
      ) : null}

      {!query.isLoading && !query.isError && posts.length > 0 ? (
        <Card eyebrow="Posts" title="Published content">
          <View style={styles.list}>
            {posts.map((post) => (
              <View
                key={post.id}
                testID={
                  post.external_post_id
                    ? `my-post-marker-${post.external_post_id}`
                    : undefined
                }
              >
                <ListItem
                  testID={`my-post-row-${post.id}`}
                  title={post.post_url}
                  subtitle={`${formatPlatform(post.platform)} • Posted ${formatDate(
                    post.posted_at,
                  )}`}
                  description={
                    post.performance_snapshots[0]
                      ? `Latest impressions ${formatNumber(
                          post.performance_snapshots[0].impressions,
                        )} • Latest likes ${formatNumber(
                          post.performance_snapshots[0].likes,
                        )} • Captured ${formatDate(
                          post.performance_snapshots[0].captured_at,
                        )}`
                      : "Awaiting first metric snapshot. The post is linked and ready for tracking."
                  }
                  rightAccessory={
                    <Text style={styles.postStatus}>
                      {post.performance_snapshots[0] ? "Tracked" : "Pending"}
                    </Text>
                  }
                  onPress={() =>
                    navigation.navigate("PostPerformance", {
                      postId: post.id,
                      postUrl: post.post_url,
                    })
                  }
                />
              </View>
            ))}
          </View>
          {hasAdditionalPosts ? (
            <Text style={styles.listNote}>
              Refine the platform filter to narrow the list when you need older linked posts.
            </Text>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  summaryCard: {
    minWidth: 100,
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
  historyNote: {
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  listNote: {
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.white,
  },
  filterChipActive: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  filterLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  filterLabelActive: {
    color: mobileTheme.colors.accent,
  },
  list: {
    gap: mobileTheme.spacing.sm,
  },
  postStatus: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
