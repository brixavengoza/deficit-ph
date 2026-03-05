import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { stepTwoSchema, type OnboardingFormValues } from '@/lib/onboarding-form';
import { useRouter } from 'expo-router';
import { CircleCheckBig } from 'lucide-react-native';
import { useFormContext } from 'react-hook-form';
import { View } from 'react-native';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very';

const LEVELS: Array<{ key: ActivityLevel; emoji: string; title: string; subtitle: string }> = [
  { key: 'sedentary', emoji: '🛋️', title: 'Sedentary', subtitle: 'Little to no exercise' },
  { key: 'light', emoji: '🚶', title: 'Lightly Active', subtitle: 'Light exercise 1-3 days/week' },
  {
    key: 'moderate',
    emoji: '🏃',
    title: 'Moderately Active',
    subtitle: 'Moderate exercise 3-5 days/week',
  },
  { key: 'very', emoji: '🔥', title: 'Very Active', subtitle: 'Hard exercise 6-7 days/week' },
];

export default function OnboardingStepTwoScreen() {
  const router = useRouter();
  const { watch, setValue } = useFormContext<OnboardingFormValues>();
  const level = watch('activityLevel');
  const canProceed = stepTwoSchema.safeParse({ activityLevel: level }).success;

  const onNext = () => {
    if (!canProceed) return;
    console.log('[onboarding step 2]', { activityLevel: level });
    router.push('/onboarding/step-3');
  };

  return (
    <View className="bg-background-light flex-1 justify-center">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-foreground mt-2 text-3xl font-bold tracking-tight">
          How active are you?
        </Text>
        <Text className="text-muted-foreground mt-2 text-base">
          This helps us calculate your daily calorie burn.
        </Text>
      </View>

      <View className="flex-1 gap-4 px-6 pt-4 pb-24">
        {LEVELS.map((item) => {
          const selected = level === item.key;

          return (
            <Button
              key={item.key}
              variant="outline"
              className={
                selected
                  ? 'border-primary bg-primary/5 h-auto rounded-2xl border px-4 py-4'
                  : 'border-border bg-surface h-auto rounded-2xl border px-4 py-4'
              }
              onPress={() =>
                setValue('activityLevel', item.key, {
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }>
              <View className="bg-background-light mr-4 size-12 items-center justify-center rounded-full">
                <Text className="text-3xl">{item.emoji}</Text>
              </View>

              <View className="flex-1">
                <Text
                  className={
                    selected
                      ? 'text-primary text-left text-lg font-bold'
                      : 'text-foreground text-left text-lg font-bold'
                  }>
                  {item.title}
                </Text>
                <Text className="text-muted-foreground text-left text-sm">{item.subtitle}</Text>
              </View>

              {selected ? <CircleCheckBig color="#21c45d" size={20} /> : null}
            </Button>
          );
        })}
      </View>

      <View className="bg-background-light absolute right-0 bottom-0 left-0 p-6">
        <Button
          variant="default"
          size="lg"
          className="h-14 w-full rounded-full"
          disabled={!canProceed}
          onPress={onNext}>
          <Text className="text-primary-foreground text-base font-semibold">Next</Text>
        </Button>
      </View>
    </View>
  );
}
