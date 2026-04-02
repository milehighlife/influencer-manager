import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  onPress?: () => void;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  description,
  leftAccessory,
  rightAccessory,
  onPress,
  testID,
}: ListItemProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      {leftAccessory ? <View style={styles.left}>{leftAccessory}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {rightAccessory ? <View style={styles.right}>{rightAccessory}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  left: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: 14,
  },
  description: {
    color: mobileTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
