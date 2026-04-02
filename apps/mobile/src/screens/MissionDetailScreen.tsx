import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { useMissionActionsQuery, useMissionQuery } from "../hooks/use-mobile-queries";
import type { RootStackParamList } from "../navigation/types";

export function MissionDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MissionDetail">>();
  const { missionId, missionName } = route.params;
  const missionQuery = useMissionQuery(missionId);
  const actionsQuery = useMissionActionsQuery(missionId);

  const refresh = () => {
    void Promise.all([missionQuery.refetch(), actionsQuery.refetch()]);
  };

  return (
    <Screen
      title={missionName ?? missionQuery.data?.name ?? "Mission detail"}
      subtitle="Actions scheduled inside this mission."
      refreshing={missionQuery.isRefetching || actionsQuery.isRefetching}
      onRefresh={refresh}
    >
      {missionQuery.isLoading || actionsQuery.isLoading ? (
        <LoadingState label="Loading mission..." />
      ) : null}
      {missionQuery.isError || actionsQuery.isError ? (
        <ErrorState message="Mission detail could not be loaded." onRetry={refresh} />
      ) : null}
      {missionQuery.data && actionsQuery.data ? (
        <>
          <Card eyebrow="Mission" title={missionQuery.data.name}>
            <ListItem
              title={`Sequence ${missionQuery.data.sequence_order}`}
              subtitle={missionQuery.data.description ?? "No description provided."}
              rightAccessory={<StatusBadge status={missionQuery.data.status} />}
            />
          </Card>

          <Card eyebrow="Actions" title="Planned tasks">
            {actionsQuery.data.length === 0 ? (
              <EmptyState
                title="No actions in this mission"
                message="Add actions from the planning workflow to see assignments here."
              />
            ) : (
              actionsQuery.data.map((action) => (
                <ListItem
                  key={action.id}
                  title={action.title}
                  subtitle={`${action.platform} · ${action._count.action_assignments} assignments`}
                  description={action.instructions ?? "No instructions provided."}
                  onPress={() =>
                    navigation.navigate("ActionDetail", {
                      actionId: action.id,
                      actionTitle: action.title,
                    })
                  }
                  rightAccessory={<StatusBadge status={action.status} />}
                />
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
