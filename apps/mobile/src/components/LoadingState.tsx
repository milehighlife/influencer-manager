import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={mobileTheme.colors.accent} size="small" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: mobileTheme.spacing.sm,
    paddingVertical: mobileTheme.spacing.xl,
  },
  label: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
  },
});
