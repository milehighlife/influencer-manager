import { StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { useInfluencerPostPerformanceQuery } from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { mobileTheme } from "../theme";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatPlatform,
  formatStatus,
} from "../utils/format";

export function PostPerformanceScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "PostPerformance">>();
  const { postId, postUrl } = route.params;
  const query = useInfluencerPostPerformanceQuery(postId);

  if (query.isLoading) {
    return (
      <Screen title="Post Performance" subtitle={postUrl ?? "Loading post metrics."}>
        <LoadingState label="Loading performance..." />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen title="Post Performance" subtitle={postUrl ?? "Loading post metrics."}>
        <ErrorState
          message="Performance details could not be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  const { post, latest_snapshot: latestSnapshot, summary } = query.data;
  const assignment = post.deliverable.action_assignment;

  return (
    <Screen
      title="Post Performance"
      subtitle={post.post_url}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <Card eyebrow="Post" title="Content context">
        <MetricRow label="Platform" value={formatPlatform(post.platform)} />
        <MetricRow label="Posted at" value={formatDate(post.posted_at)} />
        <MetricRow
          label="Campaign"
          value={assignment.action.mission.campaign.name}
        />
        <MetricRow label="Action" value={assignment.action.title} />
        <MetricRow
          label="Deliverable"
          value={formatStatus(post.deliverable.deliverable_type)}
        />
      </Card>

      <Card eyebrow="Summary" title="Current rollup">
        <MetricRow
          label="Impressions"
          value={formatNumber(summary.total_impressions)}
        />
        <MetricRow
          label="Engagement"
          value={formatNumber(summary.total_engagement)}
        />
        <MetricRow
          label="Engagement rate"
          value={formatPercent(summary.engagement_rate)}
        />
        <MetricRow label="Tracked posts" value={String(summary.total_posts)} />
        <MetricRow
          label="Last snapshot"
          value={formatDate(summary.last_snapshot_at)}
        />
      </Card>

      {latestSnapshot ? (
        <Card eyebrow="Snapshot" title="Latest raw platform metrics">
          <View style={styles.metricGrid}>
            <MetricRow
              label="Impressions"
              value={formatNumber(latestSnapshot.impressions)}
            />
            <MetricRow label="Reach" value={formatNumber(latestSnapshot.reach)} />
            <MetricRow label="Views" value={formatNumber(latestSnapshot.views)} />
            <MetricRow
              label="Video views"
              value={formatNumber(latestSnapshot.video_views)}
            />
            <MetricRow label="Likes" value={formatNumber(latestSnapshot.likes)} />
            <MetricRow
              label="Comments"
              value={formatNumber(latestSnapshot.comments)}
            />
            <MetricRow label="Shares" value={formatNumber(latestSnapshot.shares)} />
            <MetricRow label="Saves" value={formatNumber(latestSnapshot.saves)} />
            <MetricRow label="Clicks" value={formatNumber(latestSnapshot.clicks)} />
            <MetricRow
              label="Conversions"
              value={formatNumber(latestSnapshot.conversions)}
            />
            <MetricRow
              label="Captured at"
              value={formatDate(latestSnapshot.captured_at)}
            />
          </View>
        </Card>
      ) : (
        <EmptyState
          title="No metrics yet"
          message="Metric sync has not written a snapshot for this post yet."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    gap: mobileTheme.spacing.sm,
  },
});
