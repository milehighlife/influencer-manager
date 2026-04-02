import { PLANNING_WRITE_ROLES } from "@influencer-manager/shared/types/auth";
import {
  POST_MEDIA_TYPES,
  SOCIAL_PLATFORMS,
  DELIVERABLE_TYPES,
  type CreateDeliverablePostPayload,
  type DeliverableType,
  type LinkedPostRecord,
  type PostMediaType,
  type SocialPlatform,
} from "@influencer-manager/shared/types/mobile";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useAcceptAssignmentMutation,
  useActionQuery,
  useApproveDeliverableMutation,
  useAssignmentDeliverablesQuery,
  useAssignmentDetailQuery,
  useAssignmentPostsQuery,
  useCampaignPlanningViewQuery,
  useCreateDeliverablePostMutation,
  useMissionQuery,
  useRejectDeliverableMutation,
  useStartAssignmentMutation,
  useSubmitAssignmentMutation,
} from "../hooks/use-mobile-queries";
import type { RootStackParamList } from "../navigation/types";
import { ApiError } from "../services/api";
import { useAuthStore } from "../state/auth-store";
import { mobileTheme } from "../theme";
import { formatDate, formatNumber, formatStatus } from "../utils/format";

interface DeliverableDraft {
  key: string;
  deliverable_type: DeliverableType;
  description: string;
  submission_url: string;
}

interface PostDraft {
  platform: SocialPlatform;
  media_type: PostMediaType;
  post_url: string;
  external_post_id: string;
  caption: string;
  posted_at: string;
}

function createDeliverableDraft(index: number): DeliverableDraft {
  return {
    key: `draft-${index}`,
    deliverable_type: "final_asset",
    description: "",
    submission_url: "",
  };
}

function buildDeliverableDrafts(count: number) {
  return Array.from({ length: Math.max(1, count) }, (_, index) =>
    createDeliverableDraft(index),
  );
}

function createPostDraft(defaultPlatform: SocialPlatform): PostDraft {
  return {
    platform: defaultPlatform,
    media_type: "video",
    post_url: "",
    external_post_id: "",
    caption: "",
    posted_at: "",
  };
}

function getAssignmentStateHint(status: string) {
  switch (status) {
    case "assigned":
      return "Accept this assignment before work can start.";
    case "accepted":
      return "Start work to unlock deliverable submission.";
    case "in_progress":
      return "Add deliverables below to move this assignment into review.";
    case "submitted":
      return "This assignment is waiting for reviewer approval or rejection.";
    case "approved":
      return "Approved deliverables can now be linked to published posts.";
    case "rejected":
      return "This assignment was sent back and must return to In Progress before resubmission.";
    case "completed":
      return "This assignment is complete. Review linked posts and metrics below.";
    default:
      return "Review the current workflow state before taking the next action.";
  }
}

export function AssignmentDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "AssignmentDetail">>();
  const { assignmentId, assignmentTitle, influencerName } = route.params;
  const currentUser = useAuthStore((state) => state.user);
  const assignmentQuery = useAssignmentDetailQuery(assignmentId);
  const deliverablesQuery = useAssignmentDeliverablesQuery(assignmentId);
  const postsQuery = useAssignmentPostsQuery(assignmentId);
  const acceptMutation = useAcceptAssignmentMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const startMutation = useStartAssignmentMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const submitMutation = useSubmitAssignmentMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const createPostMutation = useCreateDeliverablePostMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const approveDeliverableMutation = useApproveDeliverableMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const rejectDeliverableMutation = useRejectDeliverableMutation(
    assignmentId,
    assignmentQuery.data?.action_id,
  );
  const actionQuery = useActionQuery(assignmentQuery.data?.action_id ?? "");
  const missionQuery = useMissionQuery(actionQuery.data?.mission_id ?? "");
  const campaignPlanningViewQuery = useCampaignPlanningViewQuery(
    missionQuery.data?.campaign_id ?? "",
  );
  const [deliverableDrafts, setDeliverableDrafts] = useState<DeliverableDraft[]>(
    [createDeliverableDraft(0)],
  );
  const [postComposerDeliverableId, setPostComposerDeliverableId] = useState<
    string | null
  >(null);
  const [rejectComposerDeliverableId, setRejectComposerDeliverableId] = useState<
    string | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [postDraft, setPostDraft] = useState<PostDraft>(
    createPostDraft("instagram"),
  );

  const canManageAssignment = currentUser
    ? PLANNING_WRITE_ROLES.includes(
        currentUser.role as (typeof PLANNING_WRITE_ROLES)[number],
      )
    : false;
  const assignmentWorkflowHint = assignmentQuery.data
    ? getAssignmentStateHint(assignmentQuery.data.assignment_status)
    : "";

  const activeDeliverableCount = useMemo(
    () =>
      deliverablesQuery.data?.data.filter((deliverable) =>
        ["submitted", "approved"].includes(deliverable.status),
      ).length ?? 0,
    [deliverablesQuery.data],
  );

  const deliverablesRemaining = useMemo(() => {
    if (!assignmentQuery.data) {
      return 1;
    }

    return Math.max(
      0,
      assignmentQuery.data.deliverable_count_expected - activeDeliverableCount,
    );
  }, [activeDeliverableCount, assignmentQuery.data]);

  const postsByDeliverable = useMemo(() => {
    const grouped = new Map<string, LinkedPostRecord[]>();

    for (const post of postsQuery.data?.posts ?? []) {
      const current = grouped.get(post.deliverable?.id ?? post.deliverable_id) ?? [];
      current.push(post);
      grouped.set(post.deliverable?.id ?? post.deliverable_id, current);
    }

    return grouped;
  }, [postsQuery.data]);

  const parentContextItems = useMemo(
    () => [
      {
        key: "campaign",
        label: "Campaign",
        value: campaignPlanningViewQuery.data?.name ?? "Loading campaign",
        onPress: campaignPlanningViewQuery.data
          ? () =>
              navigation.navigate("CampaignDetail", {
                campaignId: campaignPlanningViewQuery.data.id,
                campaignName: campaignPlanningViewQuery.data.name,
              })
          : undefined,
      },
      {
        key: "mission",
        label: "Mission",
        value: missionQuery.data?.name ?? "Loading mission",
        onPress: missionQuery.data
          ? () =>
              navigation.navigate("MissionDetail", {
                missionId: missionQuery.data.id,
                missionName: missionQuery.data.name,
              })
          : undefined,
      },
      {
        key: "action",
        label: "Action",
        value: actionQuery.data?.title ?? "Loading action",
        onPress: actionQuery.data
          ? () =>
              navigation.navigate("ActionDetail", {
                actionId: actionQuery.data.id,
                actionTitle: actionQuery.data.title,
              })
          : undefined,
      },
    ],
    [actionQuery.data, campaignPlanningViewQuery.data, missionQuery.data, navigation],
  );

  useEffect(() => {
    if (!assignmentQuery.data) {
      return;
    }

    setDeliverableDrafts(buildDeliverableDrafts(deliverablesRemaining || 1));
  }, [assignmentId, assignmentQuery.data, deliverablesRemaining]);

  useEffect(() => {
    if (!actionQuery.data) {
      return;
    }

    setPostDraft((current) =>
      current.platform === actionQuery.data.platform
        ? current
        : createPostDraft(actionQuery.data.platform),
    );
  }, [actionQuery.data]);

  const isBusy =
    acceptMutation.isPending ||
    startMutation.isPending ||
    submitMutation.isPending ||
    createPostMutation.isPending ||
    approveDeliverableMutation.isPending ||
    rejectDeliverableMutation.isPending;

  const refresh = () => {
    void Promise.all([
      assignmentQuery.refetch(),
      deliverablesQuery.refetch(),
      postsQuery.refetch(),
      actionQuery.refetch(),
      missionQuery.refetch(),
      campaignPlanningViewQuery.refetch(),
    ]);
  };

  const handleMutationError = (error: unknown, fallback: string) => {
    Alert.alert(
      "Workflow action failed",
      error instanceof ApiError ? error.message : fallback,
    );
  };

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync();
      Alert.alert("Assignment updated", "Assignment moved to Accepted.");
    } catch (error) {
      handleMutationError(error, "Assignment could not be accepted.");
    }
  };

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync();
      Alert.alert(
        "Assignment updated",
        assignmentQuery.data?.assignment_status === "rejected"
          ? "Assignment moved back to In Progress."
          : "Assignment moved to In Progress.",
      );
    } catch (error) {
      handleMutationError(error, "Assignment could not be started.");
    }
  };

  const updateDraft = (
    index: number,
    field: keyof Omit<DeliverableDraft, "key">,
    value: string,
  ) => {
    setDeliverableDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const handleSubmitDeliverables = async () => {
    const normalizedDrafts = deliverableDrafts.map((draft) => ({
      ...draft,
      description: draft.description.trim(),
      submission_url: draft.submission_url.trim(),
    }));

    if (
      normalizedDrafts.some(
        (draft) => !draft.description && !draft.submission_url,
      )
    ) {
      Alert.alert(
        "Deliverable details required",
        "Each deliverable needs a URL or a short description before submission.",
      );
      return;
    }

    try {
      await submitMutation.mutateAsync({
        deliverables: normalizedDrafts.map((draft) => ({
          deliverable_type: draft.deliverable_type,
          ...(draft.description ? { description: draft.description } : {}),
          ...(draft.submission_url ? { submission_url: draft.submission_url } : {}),
          submission_metadata_json: {
            source: "mobile_app",
          },
        })),
      });
      Alert.alert("Submitted", "Deliverables moved into review.");
    } catch (error) {
      handleMutationError(error, "Deliverables could not be submitted.");
    }
  };

  const handleCreatePost = async (deliverableId: string) => {
    const payload: CreateDeliverablePostPayload = {
      platform: postDraft.platform,
      media_type: postDraft.media_type,
      post_url: postDraft.post_url.trim(),
      ...(postDraft.external_post_id.trim()
        ? { external_post_id: postDraft.external_post_id.trim() }
        : {}),
      ...(postDraft.caption.trim() ? { caption: postDraft.caption.trim() } : {}),
      ...(postDraft.posted_at.trim() ? { posted_at: postDraft.posted_at.trim() } : {}),
    };

    if (!payload.post_url) {
      Alert.alert("Post URL required", "Add the published post URL before linking.");
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        deliverableId,
        payload,
      });
      setPostComposerDeliverableId(null);
      setPostDraft(createPostDraft(actionQuery.data?.platform ?? "instagram"));
      Alert.alert("Post linked", "Published post linked to the deliverable.");
    } catch (error) {
      handleMutationError(error, "Post could not be linked.");
    }
  };

  const handleApproveDeliverable = async (deliverableId: string) => {
    try {
      await approveDeliverableMutation.mutateAsync(deliverableId);
      Alert.alert("Approved", "Deliverable approved and assignment updated.");
    } catch (error) {
      handleMutationError(error, "Deliverable could not be approved.");
    }
  };

  const handleRejectDeliverable = async (deliverableId: string) => {
    const trimmedReason = rejectReason.trim();

    if (!trimmedReason) {
      Alert.alert(
        "Rejection reason required",
        "Add a rejection reason before sending the deliverable back.",
      );
      return;
    }

    try {
      await rejectDeliverableMutation.mutateAsync({
        deliverableId,
        payload: {
          reason: trimmedReason,
        },
      });
      setRejectComposerDeliverableId(null);
      setRejectReason("");
      Alert.alert("Rejected", "Deliverable rejected and assignment returned.");
    } catch (error) {
      handleMutationError(error, "Deliverable could not be rejected.");
    }
  };

  return (
    <Screen
      title={assignmentTitle ?? "Assignment detail"}
      subtitle={
        influencerName
          ? `Assigned to ${influencerName}`
          : "Assignment execution state and dates."
      }
      refreshing={
        assignmentQuery.isRefetching ||
        deliverablesQuery.isRefetching ||
        postsQuery.isRefetching ||
        actionQuery.isRefetching ||
        missionQuery.isRefetching ||
        campaignPlanningViewQuery.isRefetching
      }
      onRefresh={refresh}
    >
      {assignmentQuery.isLoading ||
      deliverablesQuery.isLoading ||
      postsQuery.isLoading ||
      actionQuery.isLoading ? (
        <LoadingState label="Loading assignment..." />
      ) : null}
      {assignmentQuery.isError ||
      deliverablesQuery.isError ||
      postsQuery.isError ||
      actionQuery.isError ? (
        <ErrorState
          message="Assignment detail could not be loaded."
          onRetry={refresh}
        />
      ) : null}
      {assignmentQuery.data ? (
        <>
          <Card
            eyebrow="Planning"
            title="Parent context"
            footer={
              <Text style={styles.contextFooter}>
                {formatNumber(deliverablesQuery.data?.data.length ?? 0)} deliverables ·{" "}
                {formatNumber(postsQuery.data?.posts.length ?? 0)} linked posts
              </Text>
            }
          >
            <Text style={styles.contextIntro}>
              Jump back into the parent planning structure without leaving the
              assignment workflow.
            </Text>
            <View style={styles.contextBreadcrumbs}>
              {parentContextItems.map((item, index) => (
                <View key={item.key} style={styles.contextStep}>
                  <Text style={styles.contextStepLabel}>{item.label}</Text>
                  <Pressable
                    disabled={!item.onPress}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.contextChip,
                      !item.onPress ? styles.contextChipDisabled : null,
                      pressed && item.onPress ? styles.buttonPressed : null,
                    ]}
                  >
                    <Text style={styles.contextChipText}>{item.value}</Text>
                  </Pressable>
                  {index < parentContextItems.length - 1 ? (
                    <Text style={styles.contextSeparator}>/</Text>
                  ) : null}
                </View>
              ))}
            </View>
            {campaignPlanningViewQuery.data ? (
              <MetricRow
                label="Campaign status"
                value={formatStatus(campaignPlanningViewQuery.data.status)}
              />
            ) : null}
            {missionQuery.data ? (
              <MetricRow
                label="Mission status"
                value={formatStatus(missionQuery.data.status)}
              />
            ) : null}
            {actionQuery.data ? (
              <>
                <MetricRow
                  label="Action platform"
                  value={formatStatus(actionQuery.data.platform)}
                />
                <MetricRow
                  label="Action status"
                  value={formatStatus(actionQuery.data.status)}
                />
              </>
            ) : null}
          </Card>

          <Card
            eyebrow="Assignment"
            title={`Assignment ${assignmentId.slice(0, 8)}`}
            footer={
              canManageAssignment ? (
                assignmentQuery.data.assignment_status === "assigned" ||
                ["accepted", "rejected"].includes(
                  assignmentQuery.data.assignment_status,
                ) ? (
                  <View style={styles.actionRow}>
                    {assignmentQuery.data.assignment_status === "assigned" ? (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => {
                          void handleAccept();
                        }}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          (pressed || isBusy) && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.primaryButtonLabel}>
                          {acceptMutation.isPending ? "Accepting..." : "Accept assignment"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {["accepted", "rejected"].includes(
                      assignmentQuery.data.assignment_status,
                    ) ? (
                      <Pressable
                        disabled={isBusy}
                        onPress={() => {
                          void handleStart();
                        }}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          (pressed || isBusy) && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.secondaryButtonLabel}>
                          {startMutation.isPending
                            ? "Updating..."
                            : assignmentQuery.data.assignment_status === "rejected"
                              ? "Resume work"
                              : "Start work"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.workflowHint}>{assignmentWorkflowHint}</Text>
                )
              ) : (
                <Text style={styles.blockedHint}>
                  Your role can view assignment progress, but only campaign managers and organization admins can change execution state.
                </Text>
              )
            }
          >
            <StatusBadge status={assignmentQuery.data.assignment_status} />
            <MetricRow
              label="Expected deliverables"
              value={formatNumber(assignmentQuery.data.deliverable_count_expected)}
            />
            <MetricRow
              label="Submitted deliverables"
              value={formatNumber(assignmentQuery.data.deliverable_count_submitted)}
              hint="Approved and submitted deliverables count toward review progress."
            />
            <MetricRow
              label="Assigned at"
              value={formatDate(assignmentQuery.data.assigned_at)}
            />
            <MetricRow
              label="Due date"
              value={formatDate(assignmentQuery.data.due_date)}
            />
            <MetricRow
              label="Completion date"
              value={formatDate(assignmentQuery.data.completion_date)}
            />
          </Card>

          <Card eyebrow="Review" title="Deliverables and review status">
            {!canManageAssignment ? (
              <Text style={styles.blockedHint}>
                Your role can monitor review outcomes, but reviewer actions stay locked to workflow managers.
              </Text>
            ) : assignmentQuery.data.assignment_status !== "submitted" ? (
              <Text style={styles.workflowHint}>
                Review actions unlock only after the assignment reaches Submitted.
              </Text>
            ) : null}
            {deliverablesQuery.data?.data.length ? (
              <View style={styles.deliverableList}>
                {deliverablesQuery.data.data.map((deliverable) => {
                  const isReviewable =
                    canManageAssignment &&
                    assignmentQuery.data.assignment_status === "submitted" &&
                    deliverable.status === "submitted";
                  const isOwnSubmission =
                    Boolean(currentUser?.id) &&
                    deliverable.submitted_by_user_id === currentUser?.id;

                  return (
                    <View key={deliverable.id} style={styles.deliverableItem}>
                    <View style={styles.deliverableHeader}>
                      <Text style={styles.deliverableType}>
                        {formatStatus(deliverable.deliverable_type)}
                      </Text>
                      <StatusBadge status={deliverable.status} />
                    </View>
                    <Text style={styles.deliverableText}>
                      {deliverable.description ?? "No description provided."}
                    </Text>
                    <Text style={styles.deliverableMeta}>
                      Submission URL: {deliverable.submission_url ?? "Not provided"}
                    </Text>
                    <Text style={styles.deliverableMeta}>
                      Submitted: {formatDate(deliverable.submitted_at)}
                    </Text>
                    <Text style={styles.deliverableMeta}>
                      Approved: {formatDate(deliverable.approved_at)}
                    </Text>
                    {deliverable.rejection_reason ? (
                      <Text style={styles.rejectionText}>
                        Rejection reason: {deliverable.rejection_reason}
                      </Text>
                    ) : null}
                    {!isReviewable && deliverable.status === "submitted" ? (
                      <Text style={styles.blockedHint}>
                        {!canManageAssignment
                          ? "You can see this submission, but you cannot approve or reject it with your current role."
                          : isOwnSubmission
                            ? "You submitted this deliverable, so another internal reviewer must approve or reject it."
                            : assignmentQuery.data.assignment_status !== "submitted"
                              ? "This deliverable is submitted, but the parent assignment is not currently in the review state."
                              : "This deliverable is waiting on a workflow change before review actions reopen."}
                      </Text>
                    ) : null}
                    {isReviewable ? (
                      <View style={styles.reviewActions}>
                        {isOwnSubmission ? (
                          <Text style={styles.blockedHint}>
                            Submitters cannot approve or reject their own deliverables.
                          </Text>
                        ) : (
                          <>
                            <View style={styles.actionRow}>
                              <Pressable
                                disabled={isBusy}
                                onPress={() => {
                                  void handleApproveDeliverable(deliverable.id);
                                }}
                                style={({ pressed }) => [
                                  styles.primaryButton,
                                  (pressed || isBusy) && styles.buttonPressed,
                                ]}
                              >
                                <Text style={styles.primaryButtonLabel}>
                                  {approveDeliverableMutation.isPending
                                    ? "Approving..."
                                    : "Approve deliverable"}
                                </Text>
                              </Pressable>
                              <Pressable
                                disabled={isBusy}
                                onPress={() => {
                                  setRejectComposerDeliverableId((current) =>
                                    current === deliverable.id ? null : deliverable.id,
                                  );
                                  if (rejectComposerDeliverableId !== deliverable.id) {
                                    setRejectReason("");
                                  }
                                }}
                                style={({ pressed }) => [
                                  styles.secondaryButton,
                                  (pressed || isBusy) && styles.buttonPressed,
                                ]}
                              >
                                <Text style={styles.secondaryButtonLabel}>
                                  {rejectComposerDeliverableId === deliverable.id
                                    ? "Hide reject form"
                                    : "Reject deliverable"}
                                </Text>
                              </Pressable>
                            </View>
                            {rejectComposerDeliverableId === deliverable.id ? (
                              <View style={styles.formGroup}>
                                <Text style={styles.fieldLabel}>Rejection reason</Text>
                                <TextInput
                                  multiline
                                  value={rejectReason}
                                  onChangeText={setRejectReason}
                                  placeholder="Explain what must change before approval."
                                  placeholderTextColor={mobileTheme.colors.textMuted}
                                  style={[styles.input, styles.textArea]}
                                />
                                <Pressable
                                  disabled={isBusy}
                                  onPress={() => {
                                    void handleRejectDeliverable(deliverable.id);
                                  }}
                                  style={({ pressed }) => [
                                    styles.dangerButton,
                                    (pressed || isBusy) && styles.buttonPressed,
                                  ]}
                                >
                                  <Text style={styles.primaryButtonLabel}>
                                    {rejectDeliverableMutation.isPending
                                      ? "Rejecting..."
                                      : "Confirm rejection"}
                                  </Text>
                                </Pressable>
                              </View>
                            ) : null}
                          </>
                        )}
                      </View>
                    ) : null}
                    <View style={styles.linkedPostsSection}>
                      <Text style={styles.subsectionTitle}>Linked posts</Text>
                      {(postsByDeliverable.get(deliverable.id) ?? []).length ? (
                        <View style={styles.postList}>
                          {(postsByDeliverable.get(deliverable.id) ?? []).map((post) => {
                            const latestSnapshot = post.performance_snapshots[0];
                            const totalEngagement = latestSnapshot
                              ? latestSnapshot.likes +
                                latestSnapshot.comments +
                                latestSnapshot.shares +
                                latestSnapshot.saves +
                                latestSnapshot.clicks
                              : 0;

                            return (
                              <View key={post.id} style={styles.postItem}>
                                <View style={styles.postHeader}>
                                  <Text style={styles.postTitle}>
                                    {formatStatus(post.media_type)} on{" "}
                                    {formatStatus(post.platform)}
                                  </Text>
                                  <Text style={styles.postUrl}>{post.post_url}</Text>
                                </View>
                                <Text style={styles.postMeta}>
                                  Posted: {formatDate(post.posted_at)}
                                </Text>
                                {latestSnapshot ? (
                                  <View style={styles.snapshotGrid}>
                                    <MetricRow
                                      label="Impressions"
                                      value={formatNumber(latestSnapshot.impressions)}
                                    />
                                    <MetricRow
                                      label="Engagement"
                                      value={formatNumber(totalEngagement)}
                                    />
                                    <MetricRow
                                      label="Captured"
                                      value={formatDate(latestSnapshot.captured_at)}
                                    />
                                  </View>
                                ) : (
                                  <Text style={styles.postMeta}>
                                    No performance snapshot recorded yet.
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.postMeta}>
                          No published posts linked yet.
                        </Text>
                      )}
                    </View>
                    {!canManageAssignment &&
                    ["approved", "submitted"].includes(deliverable.status) ? (
                      <Text style={styles.blockedHint}>
                        Published post linking is available only to workflow managers on mobile.
                      </Text>
                    ) : null}
                    {canManageAssignment &&
                    !["approved", "submitted"].includes(deliverable.status) ? (
                      <Text style={styles.workflowHint}>
                        Post linkage opens after the deliverable has been submitted or approved.
                      </Text>
                    ) : null}
                    {canManageAssignment &&
                    ["approved", "submitted"].includes(deliverable.status) ? (
                      <View style={styles.postComposerSection}>
                        <Pressable
                          onPress={() => {
                            setPostComposerDeliverableId((current) =>
                              current === deliverable.id ? null : deliverable.id,
                            );
                            if (postComposerDeliverableId !== deliverable.id) {
                              setPostDraft(
                                createPostDraft(
                                  actionQuery.data?.platform ?? "instagram",
                                ),
                              );
                            }
                          }}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Text style={styles.secondaryButtonLabel}>
                            {postComposerDeliverableId === deliverable.id
                              ? "Hide post form"
                              : "Link published post"}
                          </Text>
                        </Pressable>
                        {postComposerDeliverableId === deliverable.id ? (
                          <View style={styles.formGroup}>
                            <Text style={styles.fieldLabel}>Platform</Text>
                            <View style={styles.optionRow}>
                              {SOCIAL_PLATFORMS.map((platform) => {
                                const isSelected = postDraft.platform === platform;

                                return (
                                  <Pressable
                                    key={platform}
                                    onPress={() =>
                                      setPostDraft((current) => ({
                                        ...current,
                                        platform,
                                      }))
                                    }
                                    style={[
                                      styles.optionChip,
                                      isSelected ? styles.optionChipSelected : null,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.optionChipLabel,
                                        isSelected
                                          ? styles.optionChipLabelSelected
                                          : null,
                                      ]}
                                    >
                                      {formatStatus(platform)}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            <Text style={styles.fieldLabel}>Media type</Text>
                            <View style={styles.optionRow}>
                              {POST_MEDIA_TYPES.map((mediaType) => {
                                const isSelected =
                                  postDraft.media_type === mediaType;

                                return (
                                  <Pressable
                                    key={mediaType}
                                    onPress={() =>
                                      setPostDraft((current) => ({
                                        ...current,
                                        media_type: mediaType,
                                      }))
                                    }
                                    style={[
                                      styles.optionChip,
                                      isSelected ? styles.optionChipSelected : null,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.optionChipLabel,
                                        isSelected
                                          ? styles.optionChipLabelSelected
                                          : null,
                                      ]}
                                    >
                                      {formatStatus(mediaType)}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            <Text style={styles.fieldLabel}>Post URL</Text>
                            <TextInput
                              autoCapitalize="none"
                              keyboardType="url"
                              value={postDraft.post_url}
                              onChangeText={(value) =>
                                setPostDraft((current) => ({
                                  ...current,
                                  post_url: value,
                                }))
                              }
                              placeholder="https://instagram.com/p/..."
                              placeholderTextColor={mobileTheme.colors.textMuted}
                              style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>External post ID</Text>
                            <TextInput
                              autoCapitalize="none"
                              value={postDraft.external_post_id}
                              onChangeText={(value) =>
                                setPostDraft((current) => ({
                                  ...current,
                                  external_post_id: value,
                                }))
                              }
                              placeholder="Optional provider post id"
                              placeholderTextColor={mobileTheme.colors.textMuted}
                              style={styles.input}
                            />

                            <Text style={styles.fieldLabel}>Caption</Text>
                            <TextInput
                              multiline
                              value={postDraft.caption}
                              onChangeText={(value) =>
                                setPostDraft((current) => ({
                                  ...current,
                                  caption: value,
                                }))
                              }
                              placeholder="Optional caption excerpt"
                              placeholderTextColor={mobileTheme.colors.textMuted}
                              style={[styles.input, styles.textArea]}
                            />

                            <Text style={styles.fieldLabel}>Posted at</Text>
                            <TextInput
                              autoCapitalize="none"
                              value={postDraft.posted_at}
                              onChangeText={(value) =>
                                setPostDraft((current) => ({
                                  ...current,
                                  posted_at: value,
                                }))
                              }
                              placeholder="2026-03-12T17:30:00.000Z"
                              placeholderTextColor={mobileTheme.colors.textMuted}
                              style={styles.input}
                            />

                            <Pressable
                              disabled={isBusy}
                              onPress={() => {
                                void handleCreatePost(deliverable.id);
                              }}
                              style={({ pressed }) => [
                                styles.primaryButton,
                                (pressed || isBusy) && styles.buttonPressed,
                              ]}
                            >
                              <Text style={styles.primaryButtonLabel}>
                                {createPostMutation.isPending
                                  ? "Linking..."
                                  : "Create linked post"}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                title="No deliverables submitted"
                message={
                  canManageAssignment
                    ? assignmentQuery.data.assignment_status === "in_progress"
                      ? "This assignment is ready for submission. Add deliverables below to move it into review."
                      : "Deliverables will appear here once the assignment reaches the review stage."
                    : "No deliverables have been submitted yet. You can monitor review status here once work is sent in."
                }
              />
            )}
          </Card>

          {canManageAssignment &&
          assignmentQuery.data.assignment_status === "in_progress" ? (
            <Card
              eyebrow="Submit"
              title="Send deliverables for review"
              footer={
                <Pressable
                  disabled={isBusy || deliverablesRemaining === 0}
                  onPress={() => {
                    void handleSubmitDeliverables();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isBusy || deliverablesRemaining === 0) &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {submitMutation.isPending
                      ? "Submitting..."
                      : `Submit ${deliverablesRemaining} deliverable${
                          deliverablesRemaining === 1 ? "" : "s"
                        }`}
                  </Text>
                </Pressable>
              }
            >
              <Text style={styles.formIntro}>
                Add the deliverables needed to move this assignment into review.
              </Text>
              {deliverableDrafts.map((draft, index) => (
                <View key={draft.key} style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Deliverable {index + 1} type
                  </Text>
                  <View style={styles.optionRow}>
                    {DELIVERABLE_TYPES.map((type) => {
                      const isSelected = draft.deliverable_type === type;

                      return (
                        <Pressable
                          key={type}
                          onPress={() => updateDraft(index, "deliverable_type", type)}
                          style={[
                            styles.optionChip,
                            isSelected ? styles.optionChipSelected : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionChipLabel,
                              isSelected ? styles.optionChipLabelSelected : null,
                            ]}
                          >
                            {formatStatus(type)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    multiline
                    value={draft.description}
                    onChangeText={(value) =>
                      updateDraft(index, "description", value)
                    }
                    placeholder="Summarize what was submitted."
                    placeholderTextColor={mobileTheme.colors.textMuted}
                    style={[styles.input, styles.textArea]}
                  />

                  <Text style={styles.fieldLabel}>Submission URL</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="url"
                    value={draft.submission_url}
                    onChangeText={(value) =>
                      updateDraft(index, "submission_url", value)
                    }
                    placeholder="https://drive.google.com/... or preview link"
                    placeholderTextColor={mobileTheme.colors.textMuted}
                    style={styles.input}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Card eyebrow="Submit" title="Submission state">
              <Text style={styles.workflowHint}>
                {!canManageAssignment
                  ? "Your role can view submitted work, but only workflow managers can send deliverables into review."
                  : assignmentQuery.data.assignment_status === "assigned"
                    ? "Accept the assignment before submission is available."
                    : assignmentQuery.data.assignment_status === "accepted"
                      ? "Start work before preparing deliverables for review."
                      : assignmentQuery.data.assignment_status === "submitted"
                        ? "This assignment is already in review. Submission will reopen only if the work is rejected."
                        : assignmentQuery.data.assignment_status === "approved"
                          ? "Submission is complete for now. Link published posts from approved deliverables instead."
                          : assignmentQuery.data.assignment_status === "completed"
                            ? "This assignment is complete. No further submissions are expected."
                            : "Submission is currently unavailable for this workflow state."}
              </Text>
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  contextIntro: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: mobileTheme.spacing.md,
  },
  contextBreadcrumbs: {
    gap: mobileTheme.spacing.sm,
    marginBottom: mobileTheme.spacing.md,
  },
  contextStep: {
    gap: mobileTheme.spacing.xs,
  },
  contextStepLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contextChip: {
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.accentSoft,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
  },
  contextChipDisabled: {
    backgroundColor: mobileTheme.colors.background,
  },
  contextChipText: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  contextSeparator: {
    color: mobileTheme.colors.textMuted,
    fontSize: 18,
    fontWeight: "700",
  },
  contextFooter: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.accent,
  },
  primaryButtonLabel: {
    color: mobileTheme.colors.white,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  secondaryButtonLabel: {
    color: mobileTheme.colors.text,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.66,
  },
  readOnlyHint: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  blockedHint: {
    color: mobileTheme.colors.warning,
    fontSize: 14,
    lineHeight: 20,
    marginTop: mobileTheme.spacing.xs,
  },
  workflowHint: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  deliverableList: {
    gap: mobileTheme.spacing.md,
  },
  deliverableItem: {
    gap: mobileTheme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
    paddingBottom: mobileTheme.spacing.md,
  },
  linkedPostsSection: {
    gap: mobileTheme.spacing.xs,
    marginTop: mobileTheme.spacing.sm,
  },
  subsectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  postList: {
    gap: mobileTheme.spacing.sm,
  },
  postItem: {
    gap: mobileTheme.spacing.xs,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.sm,
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  postHeader: {
    gap: 2,
  },
  postTitle: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  postUrl: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
  },
  postMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  snapshotGrid: {
    marginTop: mobileTheme.spacing.xs,
  },
  postComposerSection: {
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.md,
  },
  reviewActions: {
    gap: mobileTheme.spacing.sm,
    marginTop: mobileTheme.spacing.sm,
  },
  dangerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.danger,
  },
  deliverableHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  deliverableType: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  deliverableText: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  deliverableMeta: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
  },
  rejectionText: {
    color: mobileTheme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  formIntro: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
    marginBottom: mobileTheme.spacing.sm,
  },
  formGroup: {
    gap: mobileTheme.spacing.sm,
    marginBottom: mobileTheme.spacing.lg,
  },
  fieldLabel: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.xs,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: mobileTheme.colors.white,
  },
  optionChipSelected: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  optionChipLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  optionChipLabelSelected: {
    color: mobileTheme.colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.white,
    color: mobileTheme.colors.text,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
});
