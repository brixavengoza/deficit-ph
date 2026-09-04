import { SocialSignIn } from '@/components/auth/social-sign-in';
import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { EmailInput } from '@/components/ui/email-input';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/components/ui/text';
import { describeAuthError, signInWithApple, signInWithGoogle, signUpWithEmail } from '@/lib/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack, router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const MIN_PASSWORD_LENGTH = 8;

const signUpSchema = z
  .object({
    email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email.'),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [busyProvider, setBusyProvider] = React.useState<'google' | 'apple' | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const isBusy = isSubmitting || busyProvider !== null;

  const onSubmit = React.useCallback(async (values: SignUpValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await signUpWithEmail(values.email, values.password);
      // When email confirmation is ON, Supabase returns a user with no session.
      // Saying "check your inbox" is the only honest next step.
      if (!result.session) {
        setNeedsConfirmation(true);
      }
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

  if (needsConfirmation) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="bg-background flex-1 items-center justify-center gap-4 px-8"
          style={{ paddingTop: insets.top }}>
          <View className="bg-primary/10 h-16 w-16 items-center justify-center rounded-2xl">
            <Icon as={MailCheck} className="text-primary size-8" />
          </View>
          <Text className="text-foreground text-center text-2xl font-extrabold">
            Check your email
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            We sent a confirmation link to{' '}
            <Text className="text-foreground font-semibold">{getValues('email')}</Text>. Open it to activate your account. Check your spam folder too.
          </Text>
          <Button
            variant="outline"
            className="mt-2 h-13 rounded-xl px-6"
            onPress={() => router.replace('/auth/login')}>
            <Text>Back to Log In</Text>
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
            paddingTop: insets.top + 32,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          contentContainerClassName="px-6 gap-6">
          <View className="items-center gap-3">
            <View className="bg-primary h-16 w-16 items-center justify-center rounded-2xl">
              <MaterialIcons name="local-fire-department" size={36} color="#FFFFFF" />
            </View>
            <Text className="text-foreground text-3xl font-extrabold tracking-tight">
              Create your account
            </Text>
            <Text className="text-muted-foreground text-center text-base">
              Keep your progress safe, even if you change phones.
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
                    placeholder="Re-enter your password"
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

            <Button className="h-14 rounded-xl" disabled={isBusy} onPress={handleSubmit(onSubmit)}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-primary-foreground text-base font-bold">Sign Up</Text>
              )}
            </Button>

            <Text className="text-muted-foreground px-1 text-center text-xs leading-5">
              By signing up, you agree not to post offensive or misleading content. We may remove
              content and accounts that break this.
            </Text>
          </View>

          <SocialSignIn
            busyProvider={busyProvider}
            disabled={isBusy}
            onGoogle={() => void runProvider('google', signInWithGoogle)}
            onApple={() => void runProvider('apple', signInWithApple)}
          />

          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-muted-foreground text-sm">Already have an account?</Text>
            <Link href="/auth/login" asChild>
              <Text className="text-primary text-sm font-bold">Log in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
