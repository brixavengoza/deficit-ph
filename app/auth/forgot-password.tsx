import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    console.log('[forgot password submit]', values);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#f8fbfa' }}>
        <View className="bg-background-light flex-1 items-center justify-center">
          <View className="w-full flex-1 justify-center">
            <View className="px-6 pb-2">
              <Button
                // variant=""
                size="sm"
                className="h-10 self-start rounded-full px-3"
                onPress={() => router.push('/auth/login')}>
                <Icon as={ArrowLeft} className="text-primary-light size-4" />
                <Text className="text-primary-light text-sm font-semibold">Back to login</Text>
              </Button>
            </View>

            <View className="my-auto">
              <View className="px-6 pt-2 pb-6">
                <Text className="text-foreground mb-2 text-center text-3xl leading-tight font-bold">
                  Forgot password?
                </Text>
                <Text className="text-muted-foreground text-center text-base">
                  Enter your email and we&apos;ll send a reset link.
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

                <Button
                  variant="default"
                  size="lg"
                  className="mt-4 h-14 w-full rounded-full"
                  onPress={handleSubmit(onSubmit)}>
                  <Text className="text-primary-foreground font-semibold">Send Reset Link</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
