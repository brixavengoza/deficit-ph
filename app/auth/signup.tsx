import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Text } from '@/components/ui/text';
import GoogleIcon from '@/assets/images/google-icon.svg';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { Mail, ShieldCheck, User } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (values: SignupFormValues) => {
    console.log('[signup submit]', values);
    router.push('/onboarding/step-1');
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
                <Text className="text-center text-[50px]">💪</Text>
                <Text className="text-foreground mb-2 text-center text-3xl leading-tight font-bold">
                  Create your account
                </Text>
                <Text className="text-muted-foreground text-center text-base">
                  Simulan na ang journey mo today.
                </Text>
              </View>

              <View className="w-full gap-4 px-6">
                <View className="gap-1.5">
                  <View className="relative justify-center">
                    <View className="pointer-events-none absolute left-4 z-10">
                      <Icon as={User} className="text-muted-foreground size-5" />
                    </View>
                    <Controller
                      control={control}
                      name="fullName"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <Input
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Full Name"
                          className="bg-input-bg h-14 rounded-xl border-transparent pr-4 pl-12"
                        />
                      )}
                    />
                  </View>
                  {errors.fullName?.message ? (
                    <Text className="text-destructive pl-2 text-xs">{errors.fullName.message}</Text>
                  ) : null}
                </View>

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
                          placeholder="Email"
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
                        placeholder="Password"
                      />
                    )}
                  />
                  {errors.password?.message ? (
                    <Text className="text-destructive pl-2 text-xs">{errors.password.message}</Text>
                  ) : null}
                </View>

                <View className="gap-1.5">
                  <View className="relative justify-center">
                    <View className="pointer-events-none absolute left-4 z-10">
                      <Icon as={ShieldCheck} className="text-muted-foreground size-5" />
                    </View>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { value, onChange, onBlur } }) => (
                        <PasswordInput
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Confirm Password"
                          showLockIcon={false}
                          className="pl-12"
                        />
                      )}
                    />
                  </View>
                  {errors.confirmPassword?.message ? (
                    <Text className="text-destructive pl-2 text-xs">
                      {errors.confirmPassword.message}
                    </Text>
                  ) : null}
                </View>

                <Button
                  variant="default"
                  size="lg"
                  className="mt-4 h-14 w-full rounded-full"
                  onPress={handleSubmit(onSubmit)}>
                  <Text className="text-primary-foreground font-semibold">Create Account</Text>
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
                Already have an account?
                <Text
                  className="text-primary font-semibold"
                  onPress={() => router.push('/auth/login')}>
                  {' '}
                  Log in
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
