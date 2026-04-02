import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { useInfluencersQuery } from "../hooks/use-mobile-queries";

export function InfluencerListScreen() {
  const influencersQuery = useInfluencersQuery();

  return (
    <Screen
      title="Influencers"
      subtitle="Roster view for planning and assignment staffing."
      refreshing={influencersQuery.isRefetching}
      onRefresh={() => {
        void influencersQuery.refetch();
      }}
    >
      {influencersQuery.isLoading ? <LoadingState label="Loading influencers..." /> : null}
      {influencersQuery.isError ? (
        <ErrorState
          message="Influencers could not be loaded."
          onRetry={() => {
            void influencersQuery.refetch();
          }}
        />
      ) : null}
      {influencersQuery.data ? (
        <Card eyebrow="Roster" title="Active partners">
          {influencersQuery.data.data.length === 0 ? (
            <EmptyState
              title="No influencers available"
              message="Influencers created through the API will appear here."
            />
          ) : (
            influencersQuery.data.data.map((influencer) => (
              <ListItem
                key={influencer.id}
                title={influencer.name}
                subtitle={influencer.primary_platform}
                description={influencer.location ?? influencer.email ?? "No contact details provided."}
                leftAccessory={<Avatar name={influencer.name} />}
                rightAccessory={<StatusBadge status={influencer.status} />}
              />
            ))
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
