import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind, useUniwind } from 'uniwind';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[splash] preventAutoHideAsync skipped', error);
});

export default function RootLayout() {
  const { theme } = useUniwind();
  const preferredTheme = useProfileBundleStore((state) => state.bundle.theme);
  const hasLoadedProfile = useProfileBundleStore((state) => state.hasLoaded);
  const ensureLoaded = useProfileBundleStore((state) => state.ensureLoaded);
  const [appIsReady, setAppIsReady] = React.useState(false);
  const hasHiddenSplash = React.useRef(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        await ensureLoaded();
        // Keep splash visible briefly for brand exposure and smoother transition.
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        setAppIsReady(true);
      }
    }

    void prepare();
  }, [ensureLoaded]);

  React.useEffect(() => {
    if (!hasLoadedProfile) return;
    if (preferredTheme === 'Auto') {
      Uniwind.setTheme('system');
      return;
    }
    Uniwind.setTheme(preferredTheme.toLowerCase() as 'light' | 'dark');
  }, [hasLoadedProfile, preferredTheme]);

  React.useEffect(() => {
    if (!appIsReady || !hasLoadedProfile || hasHiddenSplash.current) return;

    hasHiddenSplash.current = true;
    try {
      // Use sync hide to avoid promise rejection noise when native modal/view-controller
      // transitions occur on iOS after initial render.
      SplashScreen.hide();
    } catch (error) {
      console.warn('[splash] hide skipped', error);
    }
  }, [appIsReady, hasLoadedProfile]);

  if (!appIsReady || !hasLoadedProfile) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
        <GestureHandlerRootView className="flex-1">
          <SafeAreaProvider>
            <View className="flex-1">
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }} />
              <PortalHost />
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
