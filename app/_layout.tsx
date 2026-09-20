import '@/global.css';

import { AppThemeProvider } from '@/components/app-theme-provider';
import { WakeWidgetSync } from '@/components/wake-widget-sync';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <WakeWidgetSync />
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
    </AppThemeProvider>
  );
}
