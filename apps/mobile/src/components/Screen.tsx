import type { PropsWithChildren, ReactNode } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mobileTheme } from "../theme";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  title,
  subtitle,
  actions,
  refreshing,
  onRefresh,
  children,
}: ScreenProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={mobileTheme.colors.accent}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          {canGoBack ? (
            <Pressable
              onPress={() => navigation.goBack()}
              testID="screen-back-button"
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.backButtonPressed : null,
              ]}
            >
              <Text style={styles.backButtonLabel}>Back</Text>
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {actions ? <View>{actions}</View> : null}
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.lg,
  },
  header: {
    gap: mobileTheme.spacing.sm,
  },
  backButton: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: mobileTheme.colors.white,
    ...mobileTheme.shadow,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  backButtonLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  headerText: {
    gap: mobileTheme.spacing.xs,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  body: {
    gap: mobileTheme.spacing.lg,
  },
});
