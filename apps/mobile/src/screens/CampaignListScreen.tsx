import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ListItem } from "../components/ListItem";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { useCampaignsQuery, useCompaniesQuery } from "../hooks/use-mobile-queries";
import { mobileTheme } from "../theme";
import { formatDate } from "../utils/format";
import type { RootStackParamList } from "../navigation/types";

export function CampaignListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>();
  const campaignsQuery = useCampaignsQuery({
    page: 1,
    limit: 20,
    company_id: selectedCompanyId,
  });
  const companiesQuery = useCompaniesQuery();

  const campaigns = campaignsQuery.data?.data ?? [];
  const companies = companiesQuery.data?.data ?? [];

  return (
    <Screen
      title="Campaigns"
      subtitle="Browse planning work by company, then drill into missions and action staffing."
      refreshing={campaignsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([campaignsQuery.refetch(), companiesQuery.refetch()]);
      }}
    >
      <Card eyebrow="Filter" title="Company">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedCompanyId(undefined)}
              style={[
                styles.filterChip,
                !selectedCompanyId ? styles.filterChipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  !selectedCompanyId ? styles.filterChipLabelActive : null,
                ]}
              >
                All companies
              </Text>
            </Pressable>
            {companies.map((company) => (
              <Pressable
                key={company.id}
                onPress={() => setSelectedCompanyId(company.id)}
                style={[
                  styles.filterChip,
                  selectedCompanyId === company.id ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipLabel,
                    selectedCompanyId === company.id
                      ? styles.filterChipLabelActive
                      : null,
                  ]}
                >
                  {company.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      {campaignsQuery.isLoading ? <LoadingState label="Loading campaigns..." /> : null}
      {campaignsQuery.isError ? (
        <ErrorState
          message="Campaigns could not be loaded."
          onRetry={() => {
            void campaignsQuery.refetch();
          }}
        />
      ) : null}

      {!campaignsQuery.isLoading && !campaignsQuery.isError ? (
        <Card eyebrow="Planning" title="Campaign list">
          {campaigns.length === 0 ? (
            <EmptyState
              title="No campaigns match this filter"
              message="Try another company or create a campaign from the web or API layer."
            />
          ) : (
            campaigns.map((campaign) => {
              const companyName =
                companies.find((company) => company.id === campaign.company_id)?.name ??
                "Unknown company";

              return (
                <ListItem
                  key={campaign.id}
                  title={campaign.name}
                  subtitle={companyName}
                  description={`Start ${formatDate(campaign.start_date)} · End ${formatDate(campaign.end_date)}`}
                  onPress={() =>
                    navigation.navigate("CampaignDetail", {
                      campaignId: campaign.id,
                      campaignName: campaign.name,
                    })
                  }
                  rightAccessory={<StatusBadge status={campaign.status} />}
                />
              );
            })
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
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
    backgroundColor: mobileTheme.colors.accent,
  },
  filterChipLabel: {
    color: mobileTheme.colors.text,
    fontWeight: "600",
  },
  filterChipLabelActive: {
    color: mobileTheme.colors.white,
  },
});
