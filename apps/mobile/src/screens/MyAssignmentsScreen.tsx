import type { AssignmentStatus } from "@influencer-manager/shared/types/mobile";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import {
  useInfluencerAssignmentsQuery,
} from "../hooks/use-influencer-workspace-queries";
import type { RootStackParamList } from "../navigation/types";
import { mobileTheme } from "../theme";
import { formatDate, formatPlatform } from "../utils/format";
import {
  formatCreatorAssignmentStatus,
  getCreatorAssignmentActionPrompt,
} from "../utils/creator-workspace";

const FILTERS: Array<{ label: string; value: AssignmentStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Awaiting Review", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Changes Requested", value: "rejected" },
  { label: "Completed", value: "completed" },
];

const SORT_OPTIONS = [
  { label: "Due Soon", value: "due_date" },
  { label: "Recently Updated", value: "updated_at" },
] as const;

export function MyAssignmentsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">(
    "all",
  );
  const [sortOrder, setSortOrder] =
    useState<(typeof SORT_OPTIONS)[number]["value"]>("due_date");
  const [searchTerm, setSearchTerm] = useState("");
  const query = useInfluencerAssignmentsQuery({
    page: 1,
    limit: 25,
    assignment_status: statusFilter === "all" ? undefined : statusFilter,
    search: searchTerm.trim() || undefined,
    sort_by: sortOrder,
  });
  const assignments = query.data?.data ?? [];
  const summary = query.data?.summary;

  const subtitle = useMemo(() => {
    if (!query.data) {
      return "Your creator workload, review updates, and due dates.";
    }

    const totalMatches = query.data.meta.total;

    if (totalMatches > assignments.length) {
      return `Showing ${assignments.length} of ${totalMatches} assignments in this view`;
    }

    return `${totalMatches} assignment${totalMatches === 1 ? "" : "s"} in view`;
  }, [assignments.length, query.data]);

  return (
    <Screen
      title="My Assignments"
      subtitle={subtitle}
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <Card eyebrow="Review status" title="Current assignment states">
        <View style={styles.signalGrid}>
          <Pressable
            onPress={() => setStatusFilter("submitted")}
            style={styles.signalCard}
          >
            <Text style={styles.signalCount}>
              {summary?.status_counts.submitted ?? 0}
            </Text>
            <Text style={styles.signalLabel}>Awaiting Review</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("approved")}
            style={styles.signalCard}
          >
            <Text style={styles.signalCount}>
              {summary?.status_counts.approved ?? 0}
            </Text>
            <Text style={styles.signalLabel}>Approved</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("rejected")}
            style={styles.signalCard}
          >
            <Text style={styles.signalCount}>
              {summary?.status_counts.rejected ?? 0}
            </Text>
            <Text style={styles.signalLabel}>Changes Requested</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter("completed")}
            style={styles.signalCard}
          >
            <Text style={styles.signalCount}>
              {summary?.status_counts.completed ?? 0}
            </Text>
            <Text style={styles.signalLabel}>Completed</Text>
          </Pressable>
        </View>
      </Card>

      <Card eyebrow="Workspace" title="Filters and sorting">
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                onPress={() => setStatusFilter(filter.value)}
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

        <Text style={styles.inputLabel}>Search</Text>
        <TextInput
          testID="my-assignments-search-input"
          style={styles.input}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Campaign, mission, action, or platform"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Text style={styles.inputLabel}>Sort</Text>
        <View style={styles.filterRow}>
          {SORT_OPTIONS.map((option) => {
            const isActive = sortOrder === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => setSortOrder(option.value)}
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
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {query.isLoading ? <LoadingState label="Loading assignments..." /> : null}

      {query.isError ? (
        <ErrorState
          message="Assignments could not be loaded right now."
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : null}

      {!query.isLoading && !query.isError && assignments.length === 0 ? (
        <EmptyState
          title="No assignments here"
          message={
            searchTerm.trim().length > 0 || statusFilter !== "all"
              ? "No assignments match the current search or status filter."
              : "New work will appear here when a campaign manager assigns an action to you."
          }
        />
      ) : null}

      {!query.isLoading && !query.isError && assignments.length > 0 ? (
        <Card eyebrow="Assignments" title="Your current queue">
          <View style={styles.list}>
            {assignments.map((assignment) => (
              <ListItem
                key={assignment.id}
                testID={`my-assignment-row-${assignment.id}`}
                title={assignment.action.title}
                subtitle={`${assignment.action.mission.campaign.name} • ${formatPlatform(
                  assignment.action.platform,
                )}`}
                description={`Due ${formatDate(assignment.due_date)} • ${assignment.action.mission.name} • ${getCreatorAssignmentActionPrompt(
                  assignment.assignment_status,
                )}`}
                rightAccessory={
                  <View style={styles.rightAccessory}>
                    <StatusBadge
                      status={assignment.assignment_status}
                      label={formatCreatorAssignmentStatus(
                        assignment.assignment_status,
                      )}
                    />
                  </View>
                }
                onPress={() =>
                  navigation.navigate("InfluencerAssignmentDetail", {
                    assignmentId: assignment.id,
                    assignmentTitle: assignment.action.title,
                  })
                }
              />
            ))}
          </View>
          {query.data && query.data.meta.total > assignments.length ? (
            <Text style={styles.resultsNote}>
              Refine your search or status filter to narrow older assignments that are outside the first page.
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
  signalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  signalCard: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.white,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.xs,
  },
  signalCount: {
    color: mobileTheme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  signalLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
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
  inputLabel: {
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    marginTop: mobileTheme.spacing.sm,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: mobileTheme.colors.white,
    color: mobileTheme.colors.text,
    fontSize: 15,
  },
  list: {
    gap: mobileTheme.spacing.sm,
  },
  rightAccessory: {
    minWidth: 116,
    alignItems: "flex-end",
  },
  resultsNote: {
    marginTop: mobileTheme.spacing.md,
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
