import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEPS = ['Basic Info', 'Activity Level', 'Goal'] as const;

function OnboardingHeader({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <View className="bg-background-light pt-4 pb-3">
      <View className="flex-row items-center justify-between px-4">
        {STEPS.map((label, idx) => {
          const step = (idx + 1) as 1 | 2 | 3;
          const active = step === currentStep;
          const complete = step < currentStep;

          return (
            <View key={label} className="flex-1 items-center">
              <Text
                className={
                  active || complete
                    ? 'text-primary text-[11px] font-semibold tracking-wide uppercase'
                    : 'text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'
                }>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center gap-2 px-4">
        <View
          className={
            currentStep >= 1
              ? 'bg-primary h-1.5 flex-1 rounded-full'
              : 'bg-primary/20 h-1.5 flex-1 rounded-full'
          }
        />
        <View
          className={
            currentStep >= 2
              ? 'bg-primary h-1.5 flex-1 rounded-full'
              : 'bg-primary/20 h-1.5 flex-1 rounded-full'
          }
        />
        <View
          className={
            currentStep >= 3
              ? 'bg-primary h-1.5 flex-1 rounded-full'
              : 'bg-primary/20 h-1.5 flex-1 rounded-full'
          }
        />
      </View>
    </View>
  );
}

export { OnboardingHeader };
