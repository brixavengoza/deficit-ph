import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { getPostAuthRoute } from '@/lib/supabase-data';
import { getOAuthRedirectUri } from '@/lib/auth-redirect';
import { Text } from '@/components/ui/text';
import GoogleIcon from '@/assets/images/google-icon.svg';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = 'google' | 'apple';

function extractAuthParamsFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(
    parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash
  );

  return {
    code: parsedUrl.searchParams.get('code') ?? hashParams.get('code'),
    accessToken: parsedUrl.searchParams.get('access_token') ?? hashParams.get('access_token'),
    refreshToken: parsedUrl.searchParams.get('refresh_token') ?? hashParams.get('refresh_token'),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong while signing in.';
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useUniwind();
  const [loadingProvider, setLoadingProvider] = React.useState<OAuthProvider | null>(null);
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!isMounted || !data.session) return;
        const nextRoute = await getPostAuthRoute();
        if (!isMounted) return;
        router.replace(nextRoute);
      })
      .catch((error) => {
        console.error('[WelcomeScreen.getSession]', error);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const onOAuthLogin = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    setAuthError(null);

    try {
      const redirectTo = getOAuthRedirectUri();
      console.log('[WelcomeScreen.redirectTo]', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'consent' } : undefined,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('Supabase did not return an OAuth URL.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
      });

      if (result.type !== 'success') {
        throw new Error(
          result.type === 'cancel'
            ? 'Sign-in canceled.'
            : 'Unable to complete sign-in from browser.'
        );
      }

      const { code, accessToken, refreshToken } = extractAuthParamsFromUrl(result.url);

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) throw setSessionError;
      } else {
        throw new Error('No session tokens found in OAuth callback.');
      }

      const nextRoute = await getPostAuthRoute();
      router.replace(nextRoute);
    } catch (error) {
      setAuthError(getErrorMessage(error));
      console.error('[WelcomeScreen.onOAuthLogin]', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-background flex-1">
        <View className="bg-primary relative flex-1 items-center justify-center overflow-hidden">
          <View className="absolute -top-18 -left-14 h-72 w-72 rounded-full bg-white/10" />
          <View className="absolute -right-10 bottom-28 h-52 w-52 rounded-full bg-emerald-200/25" />

          <MaterialIcons name="local-fire-department" size={96} color="#FFFFFF" />

          <View className="mt-4 mb-12 items-center px-6">
            <Text className="text-center text-[42px] font-extrabold tracking-tight text-white">
              Deficit PH
            </Text>
            <Text className="mt-2 max-w-xs text-center text-base leading-6 font-semibold text-white/90">
              Hit your macros, and stay consistent
            </Text>
          </View>
        </View>

        <View className="bg-background -mt-8 rounded-[40px] px-8 pt-4 pb-10 shadow-lg shadow-black/10">
          <View className="items-center gap-4 pt-5">
            <View className="mb-1 items-center gap-2">
              <Text className="text-foreground text-center text-[30px] font-extrabold tracking-tight">
                Run toward your goals
              </Text>
              <Text className="text-muted-foreground text-center text-sm leading-5">
                Track calories, stay in deficit, and build momentum.
              </Text>
            </View>

            <Button
              variant="outline"
              size="lg"
              disabled={loadingProvider !== null}
              className="h-14 w-full max-w-[360px] rounded-full"
              onPress={() => onOAuthLogin('google')}>
              <GoogleIcon width={20} height={20} />
              <Text className="text-foreground font-semibold">
                {loadingProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </Button>

            <Button
              variant="outline"
              size="lg"
              disabled={loadingProvider !== null}
              className="h-14 w-full max-w-[360px] rounded-full"
              onPress={() => onOAuthLogin('apple')}>
              <FontAwesome
                name="apple"
                size={20}
                color={theme === 'dark' ? '#f8fafc' : '#111827'}
              />
              <Text className="text-foreground font-semibold">
                {loadingProvider === 'apple' ? 'Signing in...' : 'Continue with Apple'}
              </Text>
            </Button>

            {authError ? (
              <Text className="text-destructive w-full max-w-[360px] text-center text-sm">
                {authError}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );
}
