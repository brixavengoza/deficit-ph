import { SocialSignIn } from '@/components/auth/social-sign-in';
import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { EmailInput } from '@/components/ui/email-input';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/components/ui/text';
import { describeAuthError, signInWithApple, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [busyProvider, setBusyProvider] = React.useState<'google' | 'apple' | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const isBusy = isSubmitting || busyProvider !== null;

  const onSubmit = React.useCallback(async (values: LoginValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await signInWithEmail(values.email, values.password);
      // The root guard reacts to the session change and routes onward.
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const runProvider = React.useCallback(
    async (provider: 'google' | 'apple', action: () => Promise<unknown>) => {
      setBusyProvider(provider);
      setFormError(null);
      try {
        await action();
      } catch (error) {
        // A cancelled Apple sheet throws ERR_REQUEST_CANCELED; that is not a failure.
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ERR_REQUEST_CANCELED') && !message.includes('canceled')) {
          setFormError(describeAuthError(error));
        }
      } finally {
        setBusyProvider(null);
      }
    },
    []
  );

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
            paddingTop: insets.top + 32,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          contentContainerClassName="px-6 gap-6">
          <View className="items-center gap-3">
            <View className="bg-primary h-16 w-16 items-center justify-center rounded-2xl">
              <MaterialIcons name="local-fire-department" size={36} color="#FFFFFF" />
            </View>
            <Text className="text-muted-foreground text-center text-base">
              Track your calories, reach your goal
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-1.5">
              <Text className="text-foreground px-1 text-[15px] font-medium">Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onBlur, onChange, value } }) => (
                  <EmailInput
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="you@email.com"
                    returnKeyType="next"
                  />
                )}
              />
              <FieldError message={errors.email?.message} />
            </View>

            <View className="gap-1.5">
              <Text className="text-foreground px-1 text-[15px] font-medium">Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onBlur, onChange, value } }) => (
                  <PasswordInput
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Your password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
              <FieldError message={errors.password?.message} />
              <Link href="/auth/forgot-password" asChild>
                <Text className="text-primary self-end px-1 pt-1 text-sm font-semibold">
                  Forgot password?
                </Text>
              </Link>
            </View>

            {formError ? (
              <View className="bg-destructive/10 rounded-xl px-4 py-3">
                <Text className="text-destructive text-sm leading-5">{formError}</Text>
              </View>
            ) : null}

            <Button
              className="h-14 rounded-xl"
              disabled={isBusy}
              onPress={handleSubmit(onSubmit)}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-primary-foreground text-base font-bold">Log In</Text>
              )}
            </Button>
          </View>

          <SocialSignIn
            busyProvider={busyProvider}
            disabled={isBusy}
            onGoogle={() => void runProvider('google', signInWithGoogle)}
            onApple={() => void runProvider('apple', signInWithApple)}
          />

          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-muted-foreground text-sm">No account yet?</Text>
            <Link href="/auth/sign-up" asChild>
              <Text className="text-primary text-sm font-bold">Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
