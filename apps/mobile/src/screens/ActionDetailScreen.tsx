import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";

import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { MetricRow } from "../components/MetricRow";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { useActionAssignmentsQuery, useActionQuery } from "../hooks/use-mobile-queries";
import { formatNumber, formatPlatform } from "../utils/format";
import type { RootStackParamList } from "../navigation/types";

export function ActionDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ActionDetail">>();
  const { actionId, actionTitle } = route.params;
  const actionQuery = useActionQuery(actionId);
  const assignmentsQuery = useActionAssignmentsQuery(actionId);

  const refresh = () => {
    void Promise.all([actionQuery.refetch(), assignmentsQuery.refetch()]);
  };

  return (
    <Screen
      title={actionTitle ?? actionQuery.data?.title ?? "Action detail"}
      subtitle="Assignment visibility for a single campaign task."
      refreshing={actionQuery.isRefetching || assignmentsQuery.isRefetching}
      onRefresh={refresh}
    >
      {actionQuery.isLoading || assignmentsQuery.isLoading ? (
        <LoadingState label="Loading action..." />
      ) : null}
      {actionQuery.isError || assignmentsQuery.isError ? (
        <ErrorState message="Action detail could not be loaded." onRetry={refresh} />
      ) : null}
      {actionQuery.data && assignmentsQuery.data ? (
        <>
          <Card eyebrow="Action" title={actionQuery.data.title}>
            <MetricRow
              label="Platform"
              value={formatPlatform(actionQuery.data.platform)}
            />
            <MetricRow
              label="Required deliverables"
              value={formatNumber(actionQuery.data.required_deliverables)}
            />
            <MetricRow
              label="Approval"
              value={actionQuery.data.approval_required ? "Required" : "Optional"}
            />
          </Card>

          <Card eyebrow="Assignments" title="Influencer coverage">
            {assignmentsQuery.data.assignments.length === 0 ? (
              <EmptyState
                title="No influencers assigned"
                message="Assignments will appear here once the planning workflow staffs the action."
              />
            ) : (
              assignmentsQuery.data.assignments.map((assignment) => (
                <ListItem
                  key={assignment.id}
                  title={assignment.influencer.name}
                  subtitle={assignment.influencer.primary_platform}
                  description={assignment.influencer.location ?? "Location not provided."}
                  leftAccessory={<Avatar name={assignment.influencer.name} />}
                  onPress={() =>
                    navigation.navigate("AssignmentDetail", {
                      assignmentId: assignment.id,
                      assignmentTitle: assignmentsQuery.data.action.title,
                      influencerName: assignment.influencer.name,
                    })
                  }
                  rightAccessory={<StatusBadge status={assignment.assignment_status} />}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
