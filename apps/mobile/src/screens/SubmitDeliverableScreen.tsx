import {
  DELIVERABLE_TYPES,
  type DeliverableType,
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
import {
  useInfluencerAssignmentDetailQuery,
  useInfluencerSubmitDeliverablesMutation,
} from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { ApiError } from "../services/api";
import { mobileTheme } from "../theme";
import { formatDate, formatStatus } from "../utils/format";
import {
  formatCreatorAssignmentStatus,
  getLatestRejectedDeliverable,
  getLatestSubmittedDeliverable,
  getRevisionGuidanceSteps,
} from "../utils/creator-workspace";

interface DeliverableDraft {
  key: string;
  deliverable_type: DeliverableType;
  description: string;
  submission_url: string;
  caption_draft: string;
}

function createDraft(index: number): DeliverableDraft {
  return {
    key: `deliverable-${index}`,
    deliverable_type: "final_asset",
    description: "",
    submission_url: "",
    caption_draft: "",
  };
}

export function SubmitDeliverableScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, "SubmitDeliverable">>();
  const { assignmentId, assignmentTitle } = route.params;
  const query = useInfluencerAssignmentDetailQuery(assignmentId);
  const submitMutation = useInfluencerSubmitDeliverablesMutation(assignmentId);
  const [drafts, setDrafts] = useState<DeliverableDraft[]>([createDraft(0)]);

  const activeDeliverableCount =
    query.data?.deliverables.filter((deliverable) =>
      ["submitted", "approved"].includes(deliverable.status),
    ).length ?? 0;
  const remainingSlots = useMemo(() => {
    if (!query.data) {
      return 1;
    }

    return Math.max(
      0,
      query.data.assignment.deliverable_count_expected - activeDeliverableCount,
    );
  }, [activeDeliverableCount, query.data]);

  useEffect(() => {
    setDrafts((current) => {
      const targetCount = Math.max(1, remainingSlots || current.length || 1);

      if (current.length === targetCount) {
        return current;
      }

      return Array.from({ length: targetCount }, (_, index) =>
        current[index] ?? createDraft(index),
      );
    });
  }, [remainingSlots]);

  const latestRejectedDeliverable = query.data
    ? getLatestRejectedDeliverable(query.data.deliverables)
    : undefined;
  const latestSubmittedDeliverable = query.data
    ? getLatestSubmittedDeliverable(query.data.deliverables)
    : undefined;
  const revisionSteps = query.data
    ? getRevisionGuidanceSteps(query.data.assignment.assignment_status)
    : [];

  const isBlocked =
    !query.data || query.data.assignment.assignment_status !== "in_progress";

  const updateDraft = (
    index: number,
    field: keyof Omit<DeliverableDraft, "key">,
    value: string,
  ) => {
    setDrafts((current) =>
      current.map((draft, currentIndex) =>
        currentIndex === index ? { ...draft, [field]: value } : draft,
      ),
    );
  };

  const handleSubmit = async () => {
    const preparedDeliverables = drafts
      .map((draft) => ({
        deliverable_type: draft.deliverable_type,
        description: draft.description.trim() || undefined,
        submission_url: draft.submission_url.trim() || undefined,
        submission_metadata_json: draft.caption_draft.trim()
          ? { caption_draft: draft.caption_draft.trim() }
          : undefined,
      }))
      .filter(
        (deliverable) => deliverable.description || deliverable.submission_url,
      );

    if (preparedDeliverables.length === 0) {
      Alert.alert(
        "Add deliverable details",
        "Include at least a note or draft link before submitting.",
      );
      return;
    }

    try {
      await submitMutation.mutateAsync({
        deliverables: preparedDeliverables,
      });
      Alert.alert(
        "Deliverables submitted",
        latestRejectedDeliverable
          ? "Your revised work is now waiting for review."
          : "Your work is now waiting for review.",
        [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error instanceof ApiError
          ? error.message
          : "Deliverables could not be submitted.",
      );
    }
  };

  if (query.isLoading) {
    return (
      <Screen
        title="Submit Deliverable"
        subtitle={assignmentTitle ?? "Prepare your draft handoff."}
      >
        <LoadingState label="Loading assignment..." />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen
        title="Submit Deliverable"
        subtitle={assignmentTitle ?? "Prepare your draft handoff."}
      >
        <ErrorState
          message="Assignment details could not be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Submit Deliverable"
      subtitle={assignmentTitle ?? query.data.assignment.action.title}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <Card eyebrow="Assignment" title="Submission rules">
        <MetricRow
          label="Current status"
          value={formatCreatorAssignmentStatus(
            query.data.assignment.assignment_status,
          )}
        />
        <MetricRow
          label="Expected deliverables"
          value={String(query.data.assignment.deliverable_count_expected)}
        />
        <MetricRow
          label="Remaining suggested slots"
          value={String(remainingSlots)}
        />
      </Card>

      {latestRejectedDeliverable ? (
        <Card eyebrow="Revision notes" title="Latest requested change">
          <Text style={styles.revisionText}>
            {latestRejectedDeliverable.rejection_reason ??
              "Review feedback is available on the previous submission."}
          </Text>
          <MetricRow
            label="Previous submission"
            value={formatDate(latestSubmittedDeliverable?.submitted_at)}
          />
          <MetricRow
            label="Last deliverable update"
            value={formatDate(latestRejectedDeliverable.updated_at)}
          />
          <View style={styles.revisionSteps}>
            {revisionSteps.map((step) => (
              <Text key={step} style={styles.revisionStep}>
                {`\u2022 ${step}`}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}

      {isBlocked ? (
        <EmptyState
          title="Submission unavailable"
          message={
            query.data.assignment.assignment_status === "rejected"
              ? "Changes were requested. Return to the assignment and tap Resume Work before resubmitting."
              : query.data.assignment.assignment_status === "submitted"
                ? "Your latest submission is still in review."
                : "Deliverables can only be submitted when the assignment is In Progress."
          }
        />
      ) : null}

      {!isBlocked ? (
        <Card eyebrow="Drafts" title="Add your deliverables">
          <View style={styles.formList}>
            {drafts.map((draft, index) => (
              <View key={draft.key} style={styles.formCard}>
                <Text style={styles.formTitle}>Deliverable {index + 1}</Text>

                <Text style={styles.label}>Deliverable type</Text>
                <View style={styles.optionRow}>
                  {DELIVERABLE_TYPES.map((type) => {
                    const isActive = draft.deliverable_type === type;

                    return (
                      <Pressable
                        key={type}
                        onPress={() => updateDraft(index, "deliverable_type", type)}
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
                          {formatStatus(type)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  testID={`submit-deliverable-notes-input-${index}`}
                  multiline
                  style={[styles.input, styles.multilineInput]}
                  value={draft.description}
                  onChangeText={(value) => updateDraft(index, "description", value)}
                  placeholder="Explain what you created, what still needs feedback, or what changed."
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />

                <Text style={styles.label}>Draft link</Text>
                <TextInput
                  testID={`submit-deliverable-link-input-${index}`}
                  style={styles.input}
                  value={draft.submission_url}
                  onChangeText={(value) => updateDraft(index, "submission_url", value)}
                  placeholder="https://drive.google.com/..."
                  placeholderTextColor={mobileTheme.colors.textMuted}
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Caption draft</Text>
                <TextInput
                  testID={`submit-deliverable-caption-input-${index}`}
                  multiline
                  style={[styles.input, styles.multilineInput]}
                  value={draft.caption_draft}
                  onChangeText={(value) => updateDraft(index, "caption_draft", value)}
                  placeholder="Optional caption notes for reviewer context."
                  placeholderTextColor={mobileTheme.colors.textMuted}
                />
              </View>
            ))}
          </View>

          <View style={styles.footerRow}>
            <Pressable
              testID="submit-deliverable-submit-button"
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {submitMutation.isPending ? "Submitting..." : "Submit Deliverables"}
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  formList: {
    gap: mobileTheme.spacing.lg,
  },
  formCard: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  formTitle: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
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
  footerRow: {
    marginTop: mobileTheme.spacing.lg,
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
  buttonPressed: {
    opacity: 0.8,
  },
  revisionText: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  revisionSteps: {
    gap: mobileTheme.spacing.xs,
  },
  revisionStep: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
