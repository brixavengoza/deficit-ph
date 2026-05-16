import { Stack, useSegments } from 'expo-router';
import { OnboardingHeader } from '@/components/onboarding/header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, type OnboardingFormValues } from '@/lib/onboarding-form';

const STEP_MAP = {
  'step-1': 1,
  'step-2': 2,
  'step-3': 3,
} as const;

export default function OnboardingLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1] as keyof typeof STEP_MAP | undefined;
  const currentStep = currentScreen ? STEP_MAP[currentScreen] : undefined;
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      sex: 'male',
    },
  });

  return (
    <FormProvider {...form}>
      <View
        className="bg-background flex-1"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {currentStep ? <OnboardingHeader currentStep={currentStep} /> : null}

        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="step-1" />
            <Stack.Screen name="step-2" />
            <Stack.Screen name="step-3" />
          </Stack>
        </View>
      </View>
    </FormProvider>
  );
}
