import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[splash] preventAutoHideAsync skipped', error);
});

export default function RootLayout() {
  const { theme } = useUniwind();
  const [appIsReady, setAppIsReady] = React.useState(false);
  const hasHiddenSplash = React.useRef(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        // Keep splash visible briefly for brand exposure and smoother transition.
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        setAppIsReady(true);
      }
    }

    void prepare();
  }, []);

  React.useEffect(() => {
    if (!appIsReady || hasHiddenSplash.current) return;

    hasHiddenSplash.current = true;
    try {
      // Use sync hide to avoid promise rejection noise when native modal/view-controller
      // transitions occur on iOS after initial render.
      SplashScreen.hide();
    } catch (error) {
      console.warn('[splash] hide skipped', error);
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
      <SafeAreaProvider>
        <View className="flex-1">
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </View>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
