import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surface,
    gap: mobileTheme.spacing.sm,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
