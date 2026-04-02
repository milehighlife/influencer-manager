import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";
import { formatStatus } from "../utils/format";

interface StatusBadgeProps {
  status: string;
  label?: string;
}

function getColors(status: string) {
  if (["active", "approved", "completed"].includes(status)) {
    return {
      backgroundColor: mobileTheme.colors.successSoft,
      color: mobileTheme.colors.success,
    };
  }

  if (["paused", "under_review", "submitted", "planned", "scheduled"].includes(status)) {
    return {
      backgroundColor: mobileTheme.colors.warningSoft,
      color: mobileTheme.colors.warning,
    };
  }

  if (["rejected", "archived", "inactive"].includes(status)) {
    return {
      backgroundColor: mobileTheme.colors.dangerSoft,
      color: mobileTheme.colors.danger,
    };
  }

  return {
    backgroundColor: mobileTheme.colors.infoSoft,
    color: mobileTheme.colors.info,
  };
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = getColors(status);

  return (
    <View style={[styles.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.label, { color: colors.color }]}>
        {label ?? formatStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
