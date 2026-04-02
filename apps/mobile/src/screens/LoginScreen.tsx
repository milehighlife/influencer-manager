import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError } from "../services/api";
import { useAuthStore } from "../state/auth-store";
import { mobileTheme } from "../theme";

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : "Unable to sign in.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", default: undefined })}
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Influencer Campaign Manager</Text>
        <Text style={styles.title}>Mobile campaign workspace</Text>
        <Text style={styles.subtitle}>
          Creators and managers can stay on top of assignments, deliverables,
          posts, and campaign progress from anywhere.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          testID="login-email-input"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="name@agency.com"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          testID="login-password-input"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={mobileTheme.colors.textMuted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
          disabled={isAuthenticating}
          testID="login-submit-button"
          style={({ pressed }) => [
            styles.button,
            pressed ? { opacity: 0.85 } : null,
            isAuthenticating ? { opacity: 0.6 } : null,
          ]}
        >
          <Text style={styles.buttonLabel}>
            {isAuthenticating ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: mobileTheme.spacing.xl,
    backgroundColor: mobileTheme.colors.background,
    gap: mobileTheme.spacing.xl,
  },
  hero: {
    gap: mobileTheme.spacing.sm,
  },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.xl,
    backgroundColor: mobileTheme.colors.surface,
    gap: mobileTheme.spacing.sm,
    ...mobileTheme.shadow,
  },
  label: {
    color: mobileTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.md,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.white,
    color: mobileTheme.colors.text,
  },
  error: {
    color: mobileTheme.colors.danger,
    fontSize: 14,
  },
  button: {
    marginTop: mobileTheme.spacing.md,
    alignItems: "center",
    borderRadius: mobileTheme.radius.pill,
    paddingVertical: 14,
    backgroundColor: mobileTheme.colors.accent,
  },
  buttonLabel: {
    color: mobileTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
