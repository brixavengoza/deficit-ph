import { AppleBrandIcon, GoogleBrandIcon } from '@/components/auth/brand-icons';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

type SocialSignInProps = {
  busyProvider: 'google' | 'apple' | null;
  disabled: boolean;
  onGoogle: () => void;
  onApple: () => void;
};

/**
 * Google and Apple buttons.
 *
 * Both are shown on both platforms on purpose. Apple sign-in uses the native sheet on
 * iOS and the browser flow on Android, so someone who created their account on an
 * iPhone can still get in on an Android phone. Hiding it on Android would lock those
 * accounts out of the app entirely.
 *
 * The buttons are WHITE IN BOTH THEMES, which is a style both providers sanction (a
 * white button with dark text and the coloured mark). That is a deliberate exception to
 * the app's theming: because the surface never turns dark, the label, the spinner and
 * the Apple mark must NOT follow the theme either, or they would render white-on-white
 * in dark mode and vanish. Hence the hardcoded colours below rather than `text-foreground`.
 */

// Google's own button spec uses #3c4043 for label text on a white button.
const LABEL_COLOR = '#3c4043';
const BUTTON_CLASS =
  'h-14 flex-row items-center justify-center gap-3 rounded-xl border border-black/15 bg-white active:bg-neutral-100';

export function SocialSignIn({ busyProvider, disabled, onGoogle, onApple }: SocialSignInProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="bg-border h-px flex-1" />
        <Text className="text-muted-foreground text-xs font-semibold uppercase">or</Text>
        <View className="bg-border h-px flex-1" />
      </View>

      <Button variant="outline" className={BUTTON_CLASS} disabled={disabled} onPress={onGoogle}>
        {busyProvider === 'google' ? (
          <ActivityIndicator size="small" color={LABEL_COLOR} />
        ) : (
          <>
            <GoogleBrandIcon size={20} />
            <Text style={{ color: LABEL_COLOR }} className="text-base font-semibold">
              Continue with Google
            </Text>
          </>
        )}
      </Button>

      <Button variant="outline" className={BUTTON_CLASS} disabled={disabled} onPress={onApple}>
        {busyProvider === 'apple' ? (
          <ActivityIndicator size="small" color={LABEL_COLOR} />
        ) : (
          <>
            {/* Forced black: the button is white in dark mode too, so the theme-aware
                default would paint this white-on-white. */}
            <AppleBrandIcon size={20} color="#000000" />
            <Text style={{ color: LABEL_COLOR }} className="text-base font-semibold">
              Continue with Apple
            </Text>
          </>
        )}
      </Button>
    </View>
  );
}
