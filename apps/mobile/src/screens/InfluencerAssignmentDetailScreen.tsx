import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useInfluencerAcceptAssignmentMutation,
  useInfluencerAssignmentDetailQuery,
  useInfluencerStartAssignmentMutation,
} from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { ApiError } from "../services/api";
import { mobileTheme } from "../theme";
import {
  formatDate,
  formatNumber,
  formatPlatform,
  formatStatus,
} from "../utils/format";
import {
  formatCreatorAssignmentStatus,
  formatCreatorDeliverableStatus,
  getLatestRejectedDeliverable,
  getLatestSubmittedDeliverable,
  getCreatorReviewSignal,
  getRevisionGuidanceSteps,
} from "../utils/creator-workspace";

function getActionLabel(status: string) {
  switch (status) {
    case "assigned":
      return "Accept Assignment";
    case "accepted":
      return "Start Work";
    case "rejected":
      return "Resume Work";
    default:
      return null;
  }
}

function getWorkflowHint(status: string) {
  switch (status) {
    case "assigned":
      return "Review the brief, then accept the assignment to confirm you’re taking it on.";
    case "accepted":
      return "Move the assignment into active execution once production starts.";
    case "in_progress":
      return "Submit your draft deliverable when it is ready for review.";
    case "submitted":
      return "Your deliverable is waiting on reviewer feedback. Changes are locked until a decision is made.";
    case "approved":
      return "Your deliverable is approved. Link the published post so metrics can be tracked.";
    case "rejected":
      return "Reviewer feedback sent this work back. Resume work, update the draft, and submit again.";
    case "completed":
      return "This assignment is complete. You can still review linked content and performance.";
    default:
      return "Follow the next valid assignment action shown below.";
  }
}

export function InfluencerAssignmentDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "InfluencerAssignmentDetail">>();
  const { assignmentId, assignmentTitle } = route.params;
  const query = useInfluencerAssignmentDetailQuery(assignmentId);
  const acceptMutation = useInfluencerAcceptAssignmentMutation(assignmentId);
  const startMutation = useInfluencerStartAssignmentMutation(assignmentId);

  const assignment = query.data?.assignment;
  const deliverables = query.data?.deliverables ?? [];
  const posts = query.data?.posts ?? [];
  const approvedDeliverables = deliverables.filter(
    (deliverable) => deliverable.status === "approved",
  );
  const primaryAction = assignment?.action;
  const primaryMission = primaryAction?.mission;
  const primaryCampaign = primaryMission?.campaign;
  const workflowActionLabel = assignment
    ? getActionLabel(assignment.assignment_status)
    : null;
  const canSubmit = assignment?.assignment_status === "in_progress";
  const canLinkPosts = Boolean(
    assignment &&
      ["approved", "completed"].includes(assignment.assignment_status) &&
      approvedDeliverables.length > 0,
  );
  const reviewSignal = assignment
    ? getCreatorReviewSignal(
        assignment.assignment_status,
        deliverables,
        posts.length,
      )
    : null;
  const latestRejectedDeliverable = getLatestRejectedDeliverable(deliverables);
  const latestSubmittedDeliverable = getLatestSubmittedDeliverable(deliverables);
  const revisionSteps = assignment
    ? getRevisionGuidanceSteps(assignment.assignment_status)
    : [];

  const headerSubtitle = useMemo(() => {
    if (!assignment) {
      return "Assignment instructions, deliverables, and linked posts.";
    }

    return `${primaryCampaign?.name ?? "Campaign"} • Due ${formatDate(
      assignment.due_date,
    )}`;
  }, [assignment, primaryCampaign?.name]);

  const workflowHint = assignment
    ? getWorkflowHint(assignment.assignment_status)
    : "";

  const refresh = () => {
    void query.refetch();
  };

  const handlePrimaryAction = async () => {
    if (!assignment || !workflowActionLabel) {
      return;
    }

    try {
      if (assignment.assignment_status === "assigned") {
        await acceptMutation.mutateAsync();
      } else {
        await startMutation.mutateAsync();
      }

      Alert.alert(
        "Assignment updated",
        assignment.assignment_status === "rejected"
          ? "Changes requested acknowledged. You can update the work and submit again."
          : `${workflowActionLabel} complete.`,
      );
    } catch (error) {
      Alert.alert(
        "Action failed",
        error instanceof ApiError ? error.message : "Assignment update failed.",
      );
    }
  };

  const handleResubmit = async () => {
    if (!assignment) {
      return;
    }

    try {
      if (assignment.assignment_status === "rejected") {
        await startMutation.mutateAsync();
      }

      navigation.navigate("SubmitDeliverable", {
        assignmentId: assignment.id,
        assignmentTitle: assignment.action.title,
      });
    } catch (error) {
      Alert.alert(
        "Unable to reopen work",
        error instanceof ApiError
          ? error.message
          : "The assignment could not be reopened for revision.",
      );
    }
  };

  if (query.isLoading) {
    return (
      <Screen title={assignmentTitle ?? "Assignment"} subtitle={headerSubtitle}>
        <LoadingState label="Loading assignment..." />
      </Screen>
    );
  }

  const detail = query.data;

  if (query.isError || !assignment || !detail) {
    return (
      <Screen title={assignmentTitle ?? "Assignment"} subtitle={headerSubtitle}>
        <ErrorState
          message="Assignment details could not be loaded."
          onRetry={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={assignment.action.title}
      subtitle={headerSubtitle}
      refreshing={query.isRefetching}
      onRefresh={refresh}
      actions={
        <StatusBadge
          status={assignment.assignment_status}
          label={formatCreatorAssignmentStatus(assignment.assignment_status)}
        />
      }
    >
      <Card eyebrow="Context" title="Campaign structure">
        <MetricRow label="Campaign" value={primaryCampaign?.name ?? "Unknown"} />
        <MetricRow label="Mission" value={primaryMission?.name ?? "Unknown"} />
        <MetricRow label="Action" value={primaryAction?.title ?? "Unknown"} />
        <MetricRow
          label="Platform"
          value={formatPlatform(primaryAction?.platform)}
        />
      </Card>

      <Card eyebrow="Assignment" title="Execution brief">
        <MetricRow
          label="Status"
          value={formatCreatorAssignmentStatus(assignment.assignment_status)}
        />
        <MetricRow label="Due date" value={formatDate(assignment.due_date)} />
        <MetricRow
          label="Deliverables expected"
          value={String(assignment.deliverable_count_expected)}
        />
        <MetricRow
          label="Deliverables submitted"
          value={String(assignment.deliverable_count_submitted)}
        />
        <View style={styles.copyBlock}>
          <Text style={styles.copyLabel}>Instructions</Text>
          <Text style={styles.copyText}>
            {assignment.action.instructions ??
              "Campaign managers have not added detailed instructions yet."}
          </Text>
        </View>
      </Card>

      {reviewSignal ? (
        <Card eyebrow={reviewSignal.eyebrow} title={reviewSignal.title}>
          <Text style={styles.helpText}>{reviewSignal.message}</Text>
        </Card>
      ) : null}

      {assignment.assignment_status === "rejected" ? (
        <Card eyebrow="Changes requested" title="What happened and what to do next">
          <View style={styles.revisionPanel}>
            <Text style={styles.revisionLabel}>Feedback from reviewer</Text>
            <Text style={styles.revisionFeedback}>
              {latestRejectedDeliverable?.rejection_reason ??
                "A reviewer requested changes before this work can be approved."}
            </Text>
            <MetricRow
              label="Latest reviewer decision"
              value={formatCreatorDeliverableStatus(
                latestRejectedDeliverable?.status ?? "rejected",
              )}
            />
            <MetricRow
              label="Previous submission"
              value={formatDate(latestSubmittedDeliverable?.submitted_at)}
            />
            <MetricRow
              label="Last deliverable update"
              value={formatDate(latestRejectedDeliverable?.updated_at)}
            />
            <Text style={styles.revisionLabel}>What to do next</Text>
            <View style={styles.revisionStepList}>
              {revisionSteps.map((step) => (
                <Text key={step} style={styles.revisionStep}>
                  {`\u2022 ${step}`}
                </Text>
              ))}
            </View>
            <Pressable
              testID="influencer-assignment-revision-resubmit-button"
              onPress={() => {
                void handleResubmit();
              }}
              disabled={startMutation.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>Resubmit Deliverable</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <Card eyebrow="Actions" title="Next step">
        <Text style={styles.helpText}>{workflowHint}</Text>
        <View style={styles.actionRow}>
          {workflowActionLabel ? (
            <Pressable
              testID="influencer-assignment-primary-action-button"
              onPress={() => {
                void handlePrimaryAction();
              }}
              disabled={acceptMutation.isPending || startMutation.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>{workflowActionLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            testID="influencer-assignment-submit-button"
            onPress={() => {
              void handleResubmit();
            }}
            disabled={!canSubmit && assignment.assignment_status !== "rejected"}
            style={({ pressed }) => [
              styles.secondaryButton,
              !canSubmit && assignment.assignment_status !== "rejected"
                ? styles.buttonDisabled
                : null,
              pressed &&
              (canSubmit || assignment.assignment_status === "rejected")
                ? styles.buttonPressed
                : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>
              {assignment.assignment_status === "rejected"
                ? "Resubmit Deliverable"
                : "Submit Deliverable"}
            </Text>
          </Pressable>

          <Pressable
            testID="influencer-assignment-link-post-button"
            onPress={() =>
              navigation.navigate("LinkPost", {
                assignmentId: assignment.id,
                assignmentTitle: assignment.action.title,
                deliverableId:
                  approvedDeliverables.length === 1
                    ? approvedDeliverables[0]?.id
                    : undefined,
              })
            }
            disabled={!canLinkPosts}
            style={({ pressed }) => [
              styles.secondaryButton,
              !canLinkPosts ? styles.buttonDisabled : null,
              pressed && canLinkPosts ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>
              {posts.length > 0 ? "Link Another Post" : "Link Post"}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Card eyebrow="Deliverables" title="Submission history">
        {deliverables.length === 0 ? (
          <EmptyState
            title="Nothing submitted yet"
            message="Submitted deliverables will appear here with their review status."
          />
        ) : (
          <View style={styles.list}>
            {deliverables.map((deliverable) => (
              <View key={deliverable.id} style={styles.deliverableRow}>
                <View style={styles.deliverableHeader}>
                  <Text style={styles.deliverableTitle}>
                    {formatStatus(deliverable.deliverable_type)}
                  </Text>
                  <StatusBadge
                    status={deliverable.status}
                    label={formatCreatorDeliverableStatus(deliverable.status)}
                  />
                </View>
                {deliverable.description ? (
                  <Text style={styles.deliverableText}>
                    {deliverable.description}
                  </Text>
                ) : null}
                <MetricRow
                  label="Draft link"
                  value={deliverable.submission_url ?? "Not provided"}
                />
                {deliverable.rejection_reason ? (
                  <MetricRow
                    label="Requested change"
                    value={deliverable.rejection_reason}
                  />
                ) : null}
                {deliverable.status === "approved" ? (
                  <Pressable
                    testID={`influencer-deliverable-link-post-button-${deliverable.id}`}
                    onPress={() =>
                      navigation.navigate("LinkPost", {
                        assignmentId: assignment.id,
                        assignmentTitle: assignment.action.title,
                        deliverableId: deliverable.id,
                      })
                    }
                    style={({ pressed }) => [
                      styles.inlineButton,
                      pressed ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.inlineButtonLabel}>
                      {(deliverable.posts?.length ?? 0) > 0
                        ? "Link another post"
                        : "Link published post"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card eyebrow="Posts" title="Published content">
        {posts.length === 0 ? (
          <EmptyState
            title="No posts linked yet"
            message="Approved deliverables can be connected to the published posts they produced."
          />
        ) : (
          <View style={styles.list}>
            {posts.map((post) => (
              <View
                key={post.id}
                testID={
                  post.external_post_id
                    ? `influencer-assignment-post-marker-${post.external_post_id}`
                    : undefined
                }
              >
                <ListItem
                  testID={`influencer-assignment-post-row-${post.id}`}
                  title={post.post_url}
                  subtitle={`${formatPlatform(post.platform)} • Posted ${formatDate(
                    post.posted_at,
                  )}`}
                  description={`Impressions ${formatNumber(
                    post.performance_snapshots[0]?.impressions ?? 0,
                  )} • Likes ${formatNumber(
                    post.performance_snapshots[0]?.likes ?? 0,
                  )}`}
                  rightAccessory={
                    <StatusBadge
                      status={
                        post.performance_snapshots[0] ? "completed" : "submitted"
                      }
                      label={
                        post.performance_snapshots[0]
                          ? "Tracked"
                          : "Awaiting Metrics"
                      }
                    />
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
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.md,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: mobileTheme.radius.pill,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonLabel: {
    color: mobileTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.pill,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.white,
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  copyBlock: {
    marginTop: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.xs,
  },
  copyLabel: {
    color: mobileTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  copyText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  helpText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  revisionPanel: {
    gap: mobileTheme.spacing.sm,
  },
  revisionLabel: {
    color: mobileTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  revisionFeedback: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  revisionStepList: {
    gap: mobileTheme.spacing.xs,
  },
  revisionStep: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: mobileTheme.spacing.md,
  },
  deliverableRow: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  deliverableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  deliverableTitle: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  deliverableText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineButton: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  inlineButtonLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
