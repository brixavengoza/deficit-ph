import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/components/ui/text';
import { describeAuthError, exchangeRecoveryCode, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/stores/use-auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CircleCheck, ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 8;

const resetSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetValues = z.infer<typeof resetSchema>;

/**
 * Landing screen for the emailed recovery link.
 *
 * Supabase turns that link into a real (recovery) session before this screen renders,
 * which is why updateUser({ password }) is allowed here without asking for the old one.
 * If there is no session, the link was opened on a different device, already used, or
 * expired, and the only honest thing to do is say so.
 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const setRecovering = useAuthStore((state) => state.setRecovering);
  const params = useLocalSearchParams<{ code?: string }>();
  const incomingCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isDone, setIsDone] = React.useState(false);
  // Start as "checking" whenever a code arrived, so the expired-link screen never
  // flashes before the exchange has had a chance to run.
  const [isExchanging, setIsExchanging] = React.useState(Boolean(incomingCode));

  React.useEffect(() => {
    if (!incomingCode || session) {
      setIsExchanging(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await exchangeRecoveryCode(incomingCode);
      } catch (error) {
        console.warn('[ResetPasswordScreen.exchange]', error);
      } finally {
        if (!cancelled) setIsExchanging(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incomingCode, session]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = React.useCallback(
    async (values: ResetValues) => {
      setIsSubmitting(true);
      setFormError(null);
      try {
        await updatePassword(values.password);
        setRecovering(false);
        setIsDone(true);
      } catch (error) {
        setFormError(describeAuthError(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [setRecovering]
  );

  if (isExchanging) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="bg-background flex-1 items-center justify-center gap-4 px-8"
          style={{ paddingTop: insets.top }}>
          <View className="bg-warning/10 h-16 w-16 items-center justify-center rounded-2xl">
            <Icon as={ShieldAlert} className="text-warning size-8" />
          </View>
          <Text className="text-foreground text-center text-2xl font-extrabold">
            This link has expired
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            It may already be used, too old, or opened on a different device. Request a new reset
            link.
          </Text>
          <Button
            className="mt-2 h-13 rounded-xl px-6"
            onPress={() => router.replace('/auth/forgot-password')}>
            <Text className="text-primary-foreground font-bold">Request a new link</Text>
          </Button>
        </View>
      </>
    );
  }

  if (isDone) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="bg-background flex-1 items-center justify-center gap-4 px-8"
          style={{ paddingTop: insets.top }}>
          <View className="bg-primary/10 h-16 w-16 items-center justify-center rounded-2xl">
            <Icon as={CircleCheck} className="text-primary size-8" />
          </View>
          <Text className="text-foreground text-center text-2xl font-extrabold">
            Password updated
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            You can now log in with your new password.
          </Text>
          <Button className="mt-2 h-13 rounded-xl px-6" onPress={() => router.replace('/')}>
            <Text className="text-primary-foreground font-bold">Continue</Text>
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="bg-background flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 40,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          contentContainerClassName="px-6 gap-6">
          <View className="gap-2">
            <Text className="text-foreground text-3xl font-extrabold tracking-tight">
              New password
            </Text>
            <Text className="text-muted-foreground text-base leading-6">
              Choose a password you do not use on other apps.
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-foreground px-1 text-[15px] font-medium">New password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onBlur, onChange, value } }) => (
                  <PasswordInput
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                  />
                )}
              />
              <FieldError message={errors.password?.message} />
            </View>

            <View className="gap-1.5">
              <Text className="text-foreground px-1 text-[15px] font-medium">Confirm password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onBlur, onChange, value } }) => (
                  <PasswordInput
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Re-enter your new password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
              <FieldError message={errors.confirmPassword?.message} />
            </View>

            {formError ? (
              <View className="bg-destructive/10 rounded-xl px-4 py-3">
                <Text className="text-destructive text-sm leading-5">{formError}</Text>
              </View>
            ) : null}

            <Button
              className="h-14 rounded-xl"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-primary-foreground text-base font-bold">Save password</Text>
              )}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
