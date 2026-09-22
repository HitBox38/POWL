import "@/global.css";

import { AppThemeProvider } from "@/components/app-theme-provider";
import { WakeWidgetSync } from "@/components/wake-widget-sync";
import { QuickActionsSync } from "@/components/quick-actions-sync";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import { DeviceDataGate } from "@/components/device-data-gate";
import { AvailabilityMonitor } from "@/components/availability-monitor";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { goBack } from "@/components/screen";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <WakeWidgetSync />
        <QuickActionsSync />
        <DeviceDataGate>
          <AvailabilityMonitor />
          <Navigation />
        </DeviceDataGate>
        <PortalHost />
      </GestureHandlerRootView>
    </AppThemeProvider>
  );
}

function Navigation() {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 22, fontWeight: "600" },
        headerLeft: () => (
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Go back"
            onPress={goBack}
          >
            <Icon name="arrow-back" size={24} />
          </Button>
        ),
        contentStyle: { backgroundColor: colors.background },
        animation: reduced ? "fade" : "default",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
