import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { stepThreeSchema, type OnboardingFormValues } from '@/lib/onboarding-form';
import { useRouter } from 'expo-router';
import { CircleCheckBig, Dumbbell, Scale, TrendingDown } from 'lucide-react-native';
import { useFormContext } from 'react-hook-form';
import { useMemo, type ComponentType } from 'react';
import { View } from 'react-native';

type Goal = 'lose' | 'maintain' | 'gain';

const GOALS: Array<{
  key: Goal;
  title: string;
  subtitle: string;
  icon: ComponentType<any>;
}> = [
  { key: 'lose', title: 'Lose Weight', subtitle: 'Recommended for you', icon: TrendingDown },
  { key: 'maintain', title: 'Maintain Weight', subtitle: 'Keep current physique', icon: Scale },
  { key: 'gain', title: 'Gain Muscle', subtitle: 'Build strength and mass', icon: Dumbbell },
];

const ACTIVITY_FACTOR: Record<'sedentary' | 'light' | 'moderate' | 'very', number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export default function OnboardingStepThreeScreen() {
  const router = useRouter();
  const { watch, setValue, getValues } = useFormContext<OnboardingFormValues>();
  const goal = watch('goal');
  const sex = watch('sex');
  const age = watch('age');
  const heightCm = watch('heightCm');
  const weightKg = watch('weightKg');
  const activityLevel = watch('activityLevel');
  const canProceed = stepThreeSchema.safeParse({ goal }).success;

  const calorieGoal = useMemo(() => {
    if (!goal || !sex || !activityLevel) return null;

    const ageNum = Number(age);
    const heightNum = Number(heightCm);
    const weightNum = Number(weightKg);

    if (![ageNum, heightNum, weightNum].every((value) => Number.isFinite(value) && value > 0)) {
      return null;
    }

    const bmrBase = 10 * weightNum + 6.25 * heightNum - 5 * ageNum;
    const bmr = sex === 'male' ? bmrBase + 5 : bmrBase - 161;
    const tdee = bmr * ACTIVITY_FACTOR[activityLevel];
    const dailyCalories = Math.max(1200, Math.round(tdee + GOAL_ADJUSTMENT[goal]));
    const protein = Math.round((dailyCalories * 0.3) / 4);
    const carbs = Math.round((dailyCalories * 0.4) / 4);
    const fat = Math.round((dailyCalories * 0.3) / 9);

    return {
      dailyCalories,
      protein,
      carbs,
      fat,
    };
  }, [activityLevel, age, goal, heightCm, sex, weightKg]);

  const onNext = () => {
    if (!canProceed) return;
    console.log('[onboarding step 3]', getValues());
    router.replace('/dashboard');
  };

  return (
    <View className="bg-background-light flex-1">
      <View className="px-6 pt-4 pb-2">
        <Text className="text-foreground mt-2 text-3xl font-bold tracking-tight">
          What is your main goal?
        </Text>
      </View>
      <View className="px-4 pt-2 pb-2">
        <View className="mb-4 gap-3">
          {GOALS.map((item) => {
            const selected = goal === item.key;
            const GoalIcon = item.icon;

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
                  setValue('goal', item.key, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }>
                <View className="bg-background-light mr-4 size-12 items-center justify-center rounded-full">
                  <GoalIcon className="text-primary size-5" />
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

        {goal && calorieGoal ? (
          <View className="bg-primary/10 relative overflow-hidden rounded-[32px] p-6 text-center">
            <Text className="text-foreground/70 mb-2 text-center text-xs font-semibold tracking-wide uppercase">
              Your Daily Calorie Goal
            </Text>
            <View className="mb-6 flex-row items-end justify-center gap-2">
              <Text className="text-primary text-center text-6xl font-extrabold tracking-tight">
                {calorieGoal.dailyCalories.toLocaleString()}
              </Text>
              <Text className="text-primary/80 pb-3 text-xl font-bold">kcal</Text>
            </View>

            <View className="flex-row gap-2">
              <View className="bg-surface flex-1 items-center justify-center rounded-full py-3">
                <Text className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                  Protein
                </Text>
                <Text className="text-foreground text-sm font-bold">{calorieGoal.protein}g</Text>
              </View>
              <View className="bg-surface flex-1 items-center justify-center rounded-full py-3">
                <Text className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                  Carbs
                </Text>
                <Text className="text-foreground text-sm font-bold">{calorieGoal.carbs}g</Text>
              </View>
              <View className="bg-surface flex-1 items-center justify-center rounded-full py-3">
                <Text className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
                  Fat
                </Text>
                <Text className="text-foreground text-sm font-bold">{calorieGoal.fat}g</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View className="from-background-light via-background-light absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-4 pt-12">
        <Button
          variant="default"
          size="lg"
          className="h-14 w-full rounded-full"
          disabled={!canProceed}
          onPress={onNext}>
          <Text className="text-primary-foreground text-lg font-bold">Let's Go!</Text>
        </Button>
      </View>
    </View>
  );
}
