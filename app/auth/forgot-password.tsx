import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { describeAuthError, sendPasswordResetEmail } from '@/lib/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Info, MailCheck } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const forgotSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email.'),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = React.useCallback(async (values: ForgotValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await sendPasswordResetEmail(values.email);
      // Always confirm, even if no such account exists. Saying "no account found"
      // would let anyone test which emails are registered.
      setSentTo(values.email.trim());
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="bg-background flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          contentContainerClassName="px-6 gap-6 pt-4">
          {sentTo ? (
            <View className="items-center gap-4 pt-8">
              <View className="bg-primary/10 h-16 w-16 items-center justify-center rounded-2xl">
                <Icon as={MailCheck} className="text-primary size-8" />
              </View>
              <Text className="text-foreground text-center text-2xl font-extrabold">
                Check your email
              </Text>
              <Text className="text-muted-foreground text-center text-base leading-6">
                If there is an account for{' '}
                <Text className="text-foreground font-semibold">{sentTo}</Text>, we sent it a reset
                link. Open the link on this phone so it works.
              </Text>
              <Button
                variant="outline"
                className="mt-2 h-13 rounded-xl px-6"
                onPress={() => router.replace('/auth/login')}>
                <Text>Back to Log In</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="gap-2">
                <Text className="text-foreground text-3xl font-extrabold tracking-tight">
                  Reset password
                </Text>
                <Text className="text-muted-foreground text-base leading-6">
                  Enter your email and we will send you a link to create a new password.
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-foreground px-1 text-[15px] font-medium">Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <Input
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="you@email.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      className="bg-input-bg h-14 rounded-xl px-4"
                      returnKeyType="send"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  )}
                />
                <FieldError message={errors.email?.message} />
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
                  <Text className="text-primary-foreground text-base font-bold">
                    Send reset link
                  </Text>
                )}
              </Button>

              {/*
                The Google/Apple case, explained where people actually hit it. An account
                created with a provider has no password at all, so there is nothing to
                "reset" and the fastest way back in is the provider button.
              */}
              <View className="bg-primary/10 flex-row items-start gap-3 rounded-xl p-4">
                <View className="bg-primary/15 mt-0.5 h-7 w-7 items-center justify-center rounded-lg">
                  <Icon as={Info} className="text-primary size-4" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-foreground text-sm font-semibold">
                    Did you sign up with Google or Apple?
                  </Text>
                  <Text className="text-muted-foreground mt-1 text-sm leading-5">
                    Then you do not have a password to reset. Go back to Log In and tap Continue
                    with Google or Apple instead.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
