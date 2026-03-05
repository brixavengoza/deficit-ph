import { Stack, useSegments } from 'expo-router';
import { OnboardingHeader } from '@/components/onboarding/header';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#f8fbfa' }}>
        {currentStep ? <OnboardingHeader currentStep={currentStep} /> : null}

        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#f8fbfa' },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="step-1" />
            <Stack.Screen name="step-2" />
            <Stack.Screen name="step-3" />
          </Stack>
        </View>
      </SafeAreaView>
    </FormProvider>
  );
}
