import { StyleSheet, Text, View } from "react-native";

import { mobileTheme } from "../theme";
import { getInitials } from "../utils/format";

interface AvatarProps {
  name: string;
}

export function Avatar({ name }: AvatarProps) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.label}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.accentSoft,
  },
  label: {
    color: mobileTheme.colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
});
