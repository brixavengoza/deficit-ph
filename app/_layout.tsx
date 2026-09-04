import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind, useUniwind } from 'uniwind';
import { useAuthStore } from '@/stores/use-auth-store';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('[splash] preventAutoHideAsync skipped', error);
});


/**
 * Route guard. Login is REQUIRED at app start, so an unauthenticated session is bounced
 * to /auth/login from ANY route, not just the index. Guarding only the index would let a
 * deep link walk straight into the dashboard.
 *
 * The one exception is password recovery: that session IS signed in, but must land on
 * the new-password screen rather than the dashboard.
 */
function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const status = useAuthStore((state) => state.status);
  const isRecovering = useAuthStore((state) => state.isRecovering);

  React.useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === 'auth';
    // 'unconfigured' is treated as signed-out on purpose: the login screen surfaces the
    // exact missing-env-var message, which beats a blank screen nobody can diagnose.
    const needsSignIn = status === 'signed-out' || status === 'unconfigured';

    if (needsSignIn && !inAuthGroup) {
      router.replace('/auth/login');
      return;
    }
    if (status === 'signed-in' && isRecovering && segments[1] !== 'reset-password') {
      router.replace('/auth/reset-password');
      return;
    }
    if (status === 'signed-in' && !isRecovering && inAuthGroup) {
      router.replace('/');
    }
  }, [isRecovering, router, segments, status]);
}

export default function RootLayout() {
  const { theme } = useUniwind();
  const preferredTheme = useProfileBundleStore((state) => state.bundle.theme);
  const hasLoadedProfile = useProfileBundleStore((state) => state.hasLoaded);
  const profileLoadError = useProfileBundleStore((state) => state.error);
  const ensureLoaded = useProfileBundleStore((state) => state.ensureLoaded);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const authStatus = useAuthStore((state) => state.status);
  const refreshProfile = useProfileBundleStore((state) => state.refresh);
  const [appIsReady, setAppIsReady] = React.useState(false);
  const hasHiddenSplash = React.useRef(false);

  useAuthGuard();

  React.useEffect(() => {
    async function prepare() {
      try {
        // Restore the session from the keychain alongside the local profile, so the
        // splash covers both and the guard never sees a half-initialised state.
        await Promise.all([ensureLoaded(), initializeAuth()]);
        // Keep splash visible briefly for brand exposure and smoother transition.
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        setAppIsReady(true);
      }
    }

    void prepare();
  }, [ensureLoaded, initializeAuth]);

  React.useEffect(() => {
    if (!hasLoadedProfile) return;
    if (preferredTheme === 'Auto') {
      Uniwind.setTheme('system');
      return;
    }
    Uniwind.setTheme(preferredTheme.toLowerCase() as 'light' | 'dark');
  }, [hasLoadedProfile, preferredTheme]);

  React.useEffect(() => {
    if (!appIsReady || !hasLoadedProfile || authStatus === 'loading') return;
    if (hasHiddenSplash.current) return;

    hasHiddenSplash.current = true;
    try {
      // Use sync hide to avoid promise rejection noise when native modal/view-controller
      // transitions occur on iOS after initial render.
      SplashScreen.hide();
    } catch (error) {
      console.warn('[splash] hide skipped', error);
    }
  }, [appIsReady, authStatus, hasLoadedProfile]);

  if (!appIsReady || !hasLoadedProfile || authStatus === 'loading') {
    return null;
  }

  if (profileLoadError) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
          <GestureHandlerRootView className="flex-1">
            <SafeAreaProvider>
              <View className="bg-background flex-1 items-center justify-center px-6">
                <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
                <Text className="text-foreground text-center text-xl font-bold">
                  We could not open your local data
                </Text>
                <Text className="text-muted-foreground mt-2 text-center text-sm leading-5">
                  Your food logs are stored on this device. Try again, and if this keeps happening,
                  restart the app.
                </Text>
                <Button
                  className="mt-5 h-12 rounded-full px-6"
                  onPress={() => {
                    void refreshProfile();
                  }}>
                  <Text>Try Again</Text>
                </Button>
              </View>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </QueryClientProvider>
    );
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
