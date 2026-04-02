import { Pressable, StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something failed</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.dangerSoft,
    borderRadius: mobileTheme.radius.md,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.white,
    gap: mobileTheme.spacing.sm,
  },
  title: {
    color: mobileTheme.colors.danger,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.danger,
  },
  buttonLabel: {
    color: mobileTheme.colors.white,
    fontWeight: "700",
  },
});
