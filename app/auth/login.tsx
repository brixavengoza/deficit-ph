import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/components/ui/text';
import GoogleIcon from '@/assets/images/google-icon.svg';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    console.log('[login submit]', values);
    router.replace('/onboarding/step-1');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#f8fbfa' }}>
        <KeyboardAvoidingView
          className="bg-background-light flex-1"
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

              <View className="w-full gap-4 px-6">
                <View className="gap-1.5">
                  <View className="relative justify-center">
                    <View className="pointer-events-none absolute left-4 z-10">
                      <Icon as={Mail} className="text-muted-foreground size-5" />
                    </View>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter your email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          className="bg-input-bg h-14 rounded-xl border-transparent pr-4 pl-12"
                        />
                      )}
                    />
                  </View>
                  {errors.email?.message ? (
                    <Text className="text-destructive pl-2 text-xs">{errors.email.message}</Text>
                  ) : null}
                </View>

                <View className="gap-1.5">
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { value, onChange, onBlur } }) => (
                      <PasswordInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your password"
                      />
                    )}
                  />
                  {errors.password?.message ? (
                    <Text className="text-destructive pl-2 text-xs">{errors.password.message}</Text>
                  ) : null}
                  <View className="items-end pt-1">
                    <Pressable onPress={() => router.push('/auth/forgot-password')}>
                      <Text className="text-primary text-sm font-semibold">Forgot password?</Text>
                    </Pressable>
                  </View>
                </View>

                <Button
                  variant="default"
                  size="lg"
                  className="mt-4 h-14 w-full rounded-full"
                  onPress={handleSubmit(onSubmit)}>
                  <Text className="text-primary-foreground font-semibold">Log In</Text>
                </Button>
              </View>

              <View className="flex-row items-center gap-4 px-6 py-6">
                <View className="bg-border h-px flex-1" />
                <Text className="text-muted-foreground text-xs">or</Text>
                <View className="bg-border h-px flex-1" />
              </View>

              <View className="px-6">
                <Button variant="outline" className="h-14 w-full rounded-full">
                  <GoogleIcon width={20} height={20} />
                  <Text className="text-foreground font-medium">Continue with Google</Text>
                </Button>
              </View>
            </View>

            <View className="mt-auto flex items-center pb-2 text-center">
              <Text className="text-muted-foreground text-sm">
                Don't have an account?
                <Text
                  className="text-primary font-semibold"
                  onPress={() => router.push('/auth/signup')}>
                  {' '}
                  Sign up
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
