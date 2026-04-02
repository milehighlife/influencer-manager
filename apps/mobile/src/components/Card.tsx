import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface CardProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  footer?: ReactNode;
}

export function Card({ eyebrow, title, footer, children }: CardProps) {
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.lg,
    backgroundColor: mobileTheme.colors.surface,
    ...mobileTheme.shadow,
  },
  eyebrow: {
    marginBottom: mobileTheme.spacing.sm,
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginBottom: mobileTheme.spacing.md,
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  footer: {
    marginTop: mobileTheme.spacing.md,
  },
});
