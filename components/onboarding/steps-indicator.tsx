import { Text } from '@/components/ui/text';
import { View } from 'react-native';

const STEPS = ['Basic Info', 'Activity Level', 'Goal'] as const;

function OnboardingStepsIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <View className="bg-background-light px-6 pb-3 pt-4">
      <View className="flex-row items-center justify-between">
        {STEPS.map((label, idx) => {
          const step = (idx + 1) as 1 | 2 | 3;
          const active = step === currentStep;
          const complete = step < currentStep;

          return (
            <View key={label} className="flex-1 items-center">
              <Text
                className={
                  active || complete
                    ? 'text-primary text-xs font-semibold uppercase tracking-wide'
                    : 'text-muted-foreground text-xs font-semibold uppercase tracking-wide'
                }>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <View className={currentStep >= 1 ? 'bg-primary h-1.5 flex-1 rounded-full' : 'bg-primary/20 h-1.5 flex-1 rounded-full'} />
        <View className={currentStep >= 2 ? 'bg-primary h-1.5 flex-1 rounded-full' : 'bg-primary/20 h-1.5 flex-1 rounded-full'} />
        <View className={currentStep >= 3 ? 'bg-primary h-1.5 flex-1 rounded-full' : 'bg-primary/20 h-1.5 flex-1 rounded-full'} />
      </View>
    </View>
  );
}

export { OnboardingStepsIndicator };
