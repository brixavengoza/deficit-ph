import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getOAuthRedirectUri } from '@/lib/auth-redirect';
import { supabase } from '@/lib/supabase';
import { getPostAuthRoute } from '@/lib/supabase-data';
import GoogleIcon from '@/assets/images/google-icon.svg';
import { Stack, useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function LoginScreen() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = React.useState<OAuthProvider | null>(null);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = React.useState(false);

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
        console.error('[LoginScreen.getSession]', error);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  React.useEffect(() => {
    let isMounted = true;

    if (Platform.OS !== 'ios') {
      setAppleAuthAvailable(false);
      return () => {
        isMounted = false;
      };
    }

    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) {
          setAppleAuthAvailable(available);
        }
      })
      .catch((error) => {
        console.error('[LoginScreen.isAppleAuthAvailable]', error);
        if (isMounted) {
          setAppleAuthAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onOAuthLogin = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    setAuthError(null);

    try {
      const redirectTo = getOAuthRedirectUri();
      console.log('[LoginScreen.redirectTo]', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'consent' } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('Supabase did not return an OAuth URL.');
      }

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
      const message = getErrorMessage(error);
      setAuthError(message);
      console.error('[LoginScreen.onOAuthLogin]', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  const onAppleNativeLogin = async () => {
    setLoadingProvider('apple');
    setAuthError(null);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned by Apple.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        throw error;
      }

      if (credential.fullName) {
        const nameParts = [
          credential.fullName.givenName,
          credential.fullName.middleName,
          credential.fullName.familyName,
        ].filter(Boolean);

        if (nameParts.length > 0) {
          const fullName = nameParts.join(' ');
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              given_name: credential.fullName.givenName,
              family_name: credential.fullName.familyName,
            },
          });
        }
      }

      const nextRoute = await getPostAuthRoute();
      router.replace(nextRoute);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : undefined;

      if (code === 'ERR_REQUEST_CANCELED') {
        setAuthError('Sign-in canceled.');
        return;
      }

      const message = getErrorMessage(error);
      setAuthError(message);
      console.error('[LoginScreen.onAppleNativeLogin]', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top', 'bottom']} className="bg-background flex-1">
        <KeyboardAvoidingView
          className="bg-background flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerClassName="flex-grow justify-center"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View className="w-full flex-1 justify-center">
              <View className="px-6 pt-2 pb-6">
                <Text className="text-center text-[50px]">🎉</Text>
                <Text className="text-foreground mb-2 text-center text-3xl leading-tight font-bold">
                  Welcome back
                </Text>
                <Text className="text-muted-foreground text-center text-base">
                  I-track ang calories mo, then reach your goal.
                </Text>
              </View>

              <View className="w-full gap-3 px-6">
                <Button
                  variant="outline"
                  disabled={loadingProvider !== null}
                  className="h-14 w-full rounded-full"
                  onPress={() => onOAuthLogin('google')}>
                  <GoogleIcon width={20} height={20} />
                  <Text className="text-foreground font-semibold">
                    {loadingProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
                  </Text>
                </Button>

                {appleAuthAvailable ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={999}
                    style={{ width: '100%', height: 56, opacity: loadingProvider ? 0.6 : 1 }}
                    onPress={() => {
                      if (loadingProvider !== null) return;
                      void onAppleNativeLogin();
                    }}
                  />
                ) : (
                  <Button
                    variant="outline"
                    disabled={loadingProvider !== null}
                    className="h-14 w-full rounded-full"
                    onPress={() => onOAuthLogin('apple')}>
                    <Text className="text-foreground font-semibold">
                      {loadingProvider === 'apple' ? 'Signing in...' : 'Continue with Apple'}
                    </Text>
                  </Button>
                )}

                {authError ? <Text className="text-destructive text-sm">{authError}</Text> : null}
              </View>
            </View>

            <View className="mt-auto flex items-center px-6 pb-4 text-center">
              <Text className="text-muted-foreground text-center text-sm">
                Use your Google or Apple account to continue.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
