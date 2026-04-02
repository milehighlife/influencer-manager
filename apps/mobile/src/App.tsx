import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppProviders } from "./providers/AppProviders";
import { AppNavigator } from "./navigation/AppNavigator";
import { mobileTheme } from "./theme";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style="dark" />
        <AppNavigator />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

export { mobileTheme };
