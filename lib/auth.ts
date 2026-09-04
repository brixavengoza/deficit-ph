import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { parseCallbackParams } from '@/lib/oauth-callback';
import { getSupabase } from '@/lib/supabase';

/**
 * Every authentication operation the app performs. Screens call these; they never
 * touch the Supabase client directly.
 *
 * Password reset and social sign-in interact in a way worth stating plainly, because
 * it is the source of most "I can't get in" support messages:
 *
 *   An account created with Google or Apple has NO password at all. Sending it a
 *   password-reset email does not "reset" anything, it ADDS a password to the account.
 *   That is a legitimate flow (it gives the user a second way in), but the copy must
 *   never imply their existing password is being changed, and the login screen should
 *   nudge people back to the provider they actually signed up with.
 */

export type AuthProviderId = 'google' | 'apple';

/** The redirect the OAuth browser returns to. Must be allow-listed in Supabase Auth. */
export function getAuthRedirectUrl(path = 'auth/callback'): string {
  return AuthSession.makeRedirectUri({ scheme: 'trackk', path });
}

/**
 * Turn a Supabase auth error into something a user can act on. Supabase's own
 * messages are technical and sometimes misleading on mobile.
 */
export function describeAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Wrong email or password. If you signed up with Google or Apple, use that button instead.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox, and your spam folder.';
  }
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'This email already has an account. Log in instead.';
  }
  if (message.includes('password should be at least')) {
    return 'That password is too short. Use at least 8 characters.';
  }
  if (message.includes('pwned') || message.includes('compromised')) {
    return 'This password showed up in a data breach. Please choose a different one.';
  }
  if (message.includes('for security purposes') || message.includes('rate limit')) {
    return 'Too many attempts. Wait a few seconds and try again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'No connection. Check your internet and try again.';
  }
  if (message.includes('not configured')) {
    return raw; // developer-facing setup error, show it verbatim
  }
  return raw || 'Something went wrong. Please try again.';
}


export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
  return data;
}

/**
 * Send the reset email. Deliberately does NOT tell the caller whether the address
 * exists: revealing that turns the screen into an account-enumeration oracle, so the
 * UI always shows the same "check your inbox" confirmation.
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getAuthRedirectUrl('auth/reset-password'),
  });
  if (error) throw error;
}

/**
 * Turn the `code` from a recovery/confirmation deep link into a real session.
 *
 * Required because the client runs with `detectSessionInUrl: false` (correct for a
 * mobile app, which has no URL bar) and PKCE, so nothing exchanges the code for us.
 * Without this the reset screen would always report an expired link.
 */
export async function exchangeRecoveryCode(code: string) {
  const { data, error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data;
}

/** Set a new password. Requires the recovery session created by the emailed link. */
export async function updatePassword(newPassword: string) {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Google, and Apple on Android, both go through the browser. Apple on iOS does NOT
 * (see signInWithApple below) because App Review expects the native sheet.
 */
async function signInWithOAuthBrowser(provider: AuthProviderId) {
  const supabase = getSupabase();
  const redirectTo = getAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not open the sign-in page. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    // 'cancel' / 'dismiss' are the user backing out; not an error worth shouting about.
    return null;
  }

  const params = parseCallbackParams(result.url);
  if (params.error_description) throw new Error(params.error_description);
  if (params.error) throw new Error(params.error);

  const code = params.code;
  if (!code) throw new Error('No code was returned by the provider. Please try again.');

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
  return exchange.data;
}

export async function signInWithGoogle() {
  return signInWithOAuthBrowser('google');
}

/**
 * iOS uses the NATIVE Apple sheet and hands Supabase the identity token directly.
 * Two reasons: it is the experience App Review expects, and it avoids a browser
 * round-trip. Android has no native sheet, so it falls back to the web flow, which
 * is what the Apple Service ID and redirect URL in .env are for.
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    return signInWithOAuthBrowser('apple');
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No token was returned by Apple. Please try again.');
  }

  const { data, error } = await getSupabase().auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  // Apple sends the full name ONLY on the very first authorization, never again,
  // so it has to be captured now or it is gone for good.
  //
  // It goes into auth user_metadata rather than a profiles column: profiles.full_name
  // was dropped when identity became email-only, and user_metadata is already where
  // Google's name lands, so the greeting reads one place for both providers.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const existingName = (data.user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  if (fullName && !existingName) {
    try {
      await getSupabase().auth.updateUser({ data: { full_name: fullName } });
    } catch (updateError) {
      console.warn('[auth.signInWithApple] could not save Apple name', updateError);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/**
 * Which providers this account can actually sign in with. Used to tell someone
 * "you signed up with Google" instead of letting them fight a password box.
 */
export async function getLinkedProviders(): Promise<string[]> {
  const { data } = await getSupabase().auth.getUser();
  const identities = data.user?.identities ?? [];
  return identities.map((identity) => identity.provider);
}

/**
 * Apple Guideline 5.1.1(v): account deletion must be available IN the app.
 * Calls the server-side RPC, which anonymises shared foods and removes the account.
 */
export async function deleteAccount() {
  const { error } = await getSupabase().rpc('delete_own_account');
  if (error) throw error;
  await getSupabase().auth.signOut();
}
