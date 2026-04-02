import {
  POST_MEDIA_TYPES,
  SOCIAL_PLATFORMS,
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
  useInfluencerAssignmentDetailQuery,
  useInfluencerLinkPostMutation,
} from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { ApiError } from "../services/api";
import { mobileTheme } from "../theme";
import { formatDate, formatPlatform, formatStatus } from "../utils/format";
import {
  formatCreatorAssignmentStatus,
  formatCreatorDeliverableStatus,
} from "../utils/creator-workspace";

interface PostDraft {
  platform: SocialPlatform;
  media_type: PostMediaType;
  post_url: string;
  external_post_id: string;
  caption: string;
  posted_at: string;
}

function createDraft(platform: SocialPlatform): PostDraft {
  return {
    platform,
    media_type: "video",
    post_url: "",
    external_post_id: "",
    caption: "",
    posted_at: "",
  };
}

export function LinkPostScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "LinkPost">>();
  const { assignmentId, assignmentTitle, deliverableId } = route.params;
  const query = useInfluencerAssignmentDetailQuery(assignmentId);
  const linkPostMutation = useInfluencerLinkPostMutation(assignmentId);
  const approvedDeliverables = useMemo(
    () =>
      query.data?.deliverables.filter((deliverable) => deliverable.status === "approved") ??
      [],
    [query.data],
  );
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(
    deliverableId ?? null,
  );
  const [draft, setDraft] = useState<PostDraft>(createDraft("instagram"));

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const defaultDeliverableId = deliverableId ?? approvedDeliverables[0]?.id ?? null;
    setSelectedDeliverableId(defaultDeliverableId);
    setDraft((current) =>
      current.platform === query.data.assignment.action.platform
        ? current
        : createDraft(query.data.assignment.action.platform),
    );
  }, [approvedDeliverables, deliverableId, query.data]);

  const selectedDeliverable = approvedDeliverables.find(
    (deliverable) => deliverable.id === selectedDeliverableId,
  );

  const handleSubmit = async () => {
    if (!selectedDeliverableId) {
      Alert.alert(
        "Choose a deliverable",
        "Select which approved deliverable produced this post.",
      );
      return;
    }

    if (!draft.post_url.trim()) {
      Alert.alert("Post URL required", "Add the published post URL to continue.");
      return;
    }

    try {
      const response = await linkPostMutation.mutateAsync({
        deliverableId: selectedDeliverableId,
        payload: {
          platform: draft.platform,
          media_type: draft.media_type,
          post_url: draft.post_url.trim(),
          external_post_id: draft.external_post_id.trim() || undefined,
          caption: draft.caption.trim() || undefined,
          posted_at: draft.posted_at.trim() || undefined,
        },
      });

      Alert.alert(
        "Post linked",
        response.metric_sync_enqueued
          ? "The published post is linked and metric sync was queued."
          : "The published post is linked. Metric sync will need to run later.",
        [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Post could not be linked",
        error instanceof ApiError ? error.message : "Try again in a moment.",
      );
    }
  };

  if (query.isLoading) {
    return (
      <Screen title="Link Post" subtitle={assignmentTitle ?? "Connect a published post."}>
        <LoadingState label="Loading approved deliverables..." />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen title="Link Post" subtitle={assignmentTitle ?? "Connect a published post."}>
        <ErrorState
          message="Assignment details could not be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  if (approvedDeliverables.length === 0) {
    return (
      <Screen title="Link Post" subtitle={assignmentTitle ?? "Connect a published post."}>
        <EmptyState
          title="No approved deliverables"
          message="Posts can only be linked after at least one deliverable has been approved."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Link Post"
      subtitle={assignmentTitle ?? query.data.assignment.action.title}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <Card eyebrow="Assignment" title="Posting context">
        <MetricRow
          label="Campaign"
          value={query.data.assignment.action.mission.campaign.name}
        />
        <MetricRow
          label="Platform"
          value={formatPlatform(query.data.assignment.action.platform)}
        />
        <MetricRow
          label="Assignment status"
          value={formatCreatorAssignmentStatus(
            query.data.assignment.assignment_status,
          )}
        />
      </Card>

      <Card eyebrow="Deliverable" title="Choose approved work">
        <View style={styles.deliverableList}>
          {approvedDeliverables.map((deliverable) => {
            const isActive = deliverable.id === selectedDeliverableId;

            return (
              <Pressable
                key={deliverable.id}
                testID={`link-post-deliverable-${deliverable.id}`}
                onPress={() => setSelectedDeliverableId(deliverable.id)}
                style={[
                  styles.deliverableCard,
                  isActive ? styles.deliverableCardActive : null,
                ]}
              >
                <View style={styles.deliverableHeader}>
                  <Text style={styles.deliverableTitle}>
                    {formatStatus(deliverable.deliverable_type)}
                  </Text>
                  <StatusBadge
                    status={deliverable.status}
                    label={formatCreatorDeliverableStatus(deliverable.status)}
                  />
                </View>
                <Text style={styles.deliverableText}>
                  {deliverable.description ?? "No additional notes."}
                </Text>
                <MetricRow
                  label="Approved"
                  value={formatDate(deliverable.approved_at)}
                />
                {(deliverable.posts?.length ?? 0) > 0 ? (
                  <Text style={styles.helperText}>
                    {deliverable.posts.length} post
                    {deliverable.posts.length === 1 ? "" : "s"} already linked.
                    Add another only if this deliverable produced more than one
                    published post.
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card eyebrow="Post" title="Published post details">
        {selectedDeliverable ? (
          <MetricRow
            label="Selected deliverable"
            value={formatStatus(selectedDeliverable.deliverable_type)}
          />
        ) : null}

        {selectedDeliverable && selectedDeliverable.posts.length > 0 ? (
          <Text style={styles.helperText}>
            This approved deliverable already has linked content. Add another
            post only if the same deliverable produced a second published asset.
          </Text>
        ) : null}

        <Text style={styles.label}>Platform</Text>
        <View style={styles.optionRow}>
          {SOCIAL_PLATFORMS.map((platform) => {
            const isActive = draft.platform === platform;

            return (
              <Pressable
                key={platform}
                onPress={() =>
                  setDraft((current) => ({ ...current, platform }))
                }
                style={[
                  styles.optionChip,
                  isActive ? styles.optionChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isActive ? styles.optionLabelActive : null,
                  ]}
                >
                  {formatPlatform(platform)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Media type</Text>
        <View style={styles.optionRow}>
          {POST_MEDIA_TYPES.map((mediaType) => {
            const isActive = draft.media_type === mediaType;

            return (
              <Pressable
                key={mediaType}
                onPress={() =>
                  setDraft((current) => ({ ...current, media_type: mediaType }))
                }
                style={[
                  styles.optionChip,
                  isActive ? styles.optionChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isActive ? styles.optionLabelActive : null,
                  ]}
                >
                  {formatStatus(mediaType)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Post URL</Text>
        <TextInput
          testID="link-post-url-input"
          autoCapitalize="none"
          style={styles.input}
          value={draft.post_url}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, post_url: value }))
          }
          placeholder="https://instagram.com/p/..."
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Text style={styles.label}>External post ID</Text>
        <TextInput
          testID="link-post-external-id-input"
          autoCapitalize="none"
          style={styles.input}
          value={draft.external_post_id}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, external_post_id: value }))
          }
          placeholder="Optional platform-native ID"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Text style={styles.label}>Posted at</Text>
        <TextInput
          testID="link-post-posted-at-input"
          autoCapitalize="none"
          style={styles.input}
          value={draft.posted_at}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, posted_at: value }))
          }
          placeholder="2026-03-13T18:30:00.000Z"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Text style={styles.label}>Caption</Text>
        <TextInput
          testID="link-post-caption-input"
          multiline
          style={[styles.input, styles.multilineInput]}
          value={draft.caption}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, caption: value }))
          }
          placeholder="Optional caption text"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Pressable
          testID="link-post-submit-button"
          onPress={() => {
            void handleSubmit();
          }}
          disabled={linkPostMutation.isPending}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {linkPostMutation.isPending ? "Linking..." : "Link Published Post"}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deliverableList: {
    gap: mobileTheme.spacing.sm,
  },
  deliverableCard: {
    gap: mobileTheme.spacing.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.white,
  },
  deliverableCardActive: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  deliverableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
    alignItems: "center",
  },
  deliverableTitle: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  deliverableText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    marginTop: mobileTheme.spacing.sm,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    marginTop: mobileTheme.spacing.md,
    marginBottom: mobileTheme.spacing.xs,
    color: mobileTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: mobileTheme.colors.white,
  },
  optionChipActive: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  optionLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  optionLabelActive: {
    color: mobileTheme.colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.white,
    color: mobileTheme.colors.text,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: mobileTheme.spacing.lg,
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
  buttonPressed: {
    opacity: 0.8,
  },
});
