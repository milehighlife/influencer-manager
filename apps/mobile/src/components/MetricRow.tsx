import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";

interface MetricRowProps {
  label: string;
  value: string;
  hint?: string;
}

export function MetricRow({ label, value, hint }: MetricRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.labelColumn}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.md,
    paddingVertical: mobileTheme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
  },
  labelColumn: {
    flexBasis: "34%",
    flexGrow: 0,
    flexShrink: 0,
  },
  label: {
    color: mobileTheme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    marginTop: 2,
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
  },
  value: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
});
