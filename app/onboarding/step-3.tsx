import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { stepThreeSchema, type OnboardingFormValues } from '@/lib/onboarding-form';
import { completeOnboarding } from '@/lib/local-data';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { calculateCalorieTargets } from '@/utils/calorie-targets';
import { evaluateGoalSafety } from '@/utils/health-guardrails';
import { useRouter } from 'expo-router';
import {
  CircleAlert,
  CircleCheckBig,
  Dumbbell,
  Scale,
  ShieldAlert,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react-native';
import { useFormContext } from 'react-hook-form';
import React, { useMemo } from 'react';
import { View } from 'react-native';

type Goal = 'lose' | 'maintain' | 'gain';

const GOALS: Array<{
  key: Goal;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}> = [
  { key: 'lose', title: 'Lose Weight', subtitle: 'Trim down at a steady pace', icon: TrendingDown },
  { key: 'maintain', title: 'Maintain Weight', subtitle: 'Keep current physique', icon: Scale },
  { key: 'gain', title: 'Gain Muscle', subtitle: 'Build strength and mass', icon: Dumbbell },
];

export default function OnboardingStepThreeScreen() {
  const router = useRouter();
  const refreshProfile = useProfileBundleStore((state) => state.refresh);
  const { watch, setValue, getValues } = useFormContext<OnboardingFormValues>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const goal = watch('goal');
  const sex = watch('sex');
  const age = watch('age');
  const heightCm = watch('heightCm');
  const weightKg = watch('weightKg');
  const activityLevel = watch('activityLevel');
  const canProceed = stepThreeSchema.safeParse({ goal }).success;

  const calorieGoal = useMemo(() => {
    return calculateCalorieTargets({
      activityLevel,
      age,
      goal,
      heightCm,
      sex,
      weightKg,
    });
  }, [activityLevel, age, goal, heightCm, sex, weightKg]);

  // Single classifier drives BOTH the "Recommended for you" badge and the block/warn
  // logic below, so the badge and the gate can never contradict each other.
  const goalSafety = useMemo(
    () => evaluateGoalSafety({ age, heightCm, weightKg, sex, goal }),
    [age, heightCm, weightKg, sex, goal]
  );

  // Inline copy explaining that it is the GOAL that must change (no silent dead-end).
  const blockMessage = useMemo(() => {
    if (!goalSafety.block) return null;
    if (goalSafety.recommendedGoal === 'maintain') {
      // Minor: fail-safe path.
      return "Since minor ka pa, hindi muna pwede ang weight-loss goal para sa safety mo. Piliin natin ang Maintain — healthy pa rin 'yan, promise. 💚";
    }
    // Underweight adult → recommend gain.
    return 'Nasa healthy-low range ka, so hindi muna weight loss ang move ngayon. Try mo ang Gain para sa strength — pumili lang ng ibang goal para makatuloy. 💪';
  }, [goalSafety.block, goalSafety.recommendedGoal]);

  const onNext = async () => {
    if (!canProceed) return;

    // Defense in depth: never save a blocked goal even if the button somehow fires.
    if (goalSafety.block) {
      return;
    }

    if (!calorieGoal) {
      setSubmitError('Unable to compute your calorie goal. Please check your inputs.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const values = getValues();
      await completeOnboarding({
        ...values,
        dailyCalories: calorieGoal.dailyCalories,
        protein: calorieGoal.protein,
        carbs: calorieGoal.carbs,
        fat: calorieGoal.fat,
      });
      await refreshProfile();
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save onboarding.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="bg-background flex-1">
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
                <View className="bg-background-subtle mr-4 size-12 items-center justify-center rounded-full">
                  <GoalIcon className="text-primary size-5" />
                </View>

                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text
                      className={
                        selected
                          ? 'text-primary text-left text-lg font-bold'
                          : 'text-foreground text-left text-lg font-bold'
                      }>
                      {item.title}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-left text-sm">{item.subtitle}</Text>
                </View>

                {selected ? <CircleCheckBig color="#7ea56b" size={20} /> : null}
              </Button>
            );
          })}
        </View>

        {blockMessage ? (
          <View className="bg-destructive/10 mb-4 rounded-2xl p-4">
            <View className="mb-1 flex-row items-center gap-2">
              <Icon as={ShieldAlert} className="text-destructive size-4" />
              <Text className="text-destructive text-sm font-semibold">Let&apos;s pick a safer goal</Text>
            </View>
            <Text className="text-destructive text-sm leading-5">{blockMessage}</Text>
          </View>
        ) : null}

        {goalSafety.warning ? (
          <View className="bg-warning/10 mb-4 rounded-2xl p-4">
            <View className="mb-1 flex-row items-center gap-2">
              <Icon as={CircleAlert} className="text-warning size-4" />
              <Text className="text-warning text-sm font-semibold">Quick heads up</Text>
            </View>
            <Text className="text-warning text-sm leading-5">{goalSafety.warning}</Text>
          </View>
        ) : null}

        {goal && calorieGoal && !goalSafety.block ? (
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

            <Text className="text-foreground/60 mt-4 text-center text-xs leading-4">
              Estimate lang &apos;to, hindi medical advice — gabay lang para sa journey mo. Listen ka
              pa rin sa katawan mo, ha? 💚
            </Text>
          </View>
        ) : null}

        {submitError ? (
          <View className="bg-destructive/10 mx-2 mt-4 rounded-xl px-3 py-2">
            <Text className="text-destructive text-sm">{submitError}</Text>
          </View>
        ) : null}
      </View>

      <View className="bg-background absolute right-0 bottom-0 left-0 p-4 pt-3">
        <Button
          variant="default"
          size="lg"
          className="h-14 w-full rounded-full"
          disabled={!canProceed || isSubmitting || goalSafety.block}
          onPress={() => {
            void onNext();
          }}>
          <Text className="text-primary-foreground text-lg font-bold">
            {isSubmitting ? 'Saving...' : "Let's Go!"}
          </Text>
        </Button>
      </View>
    </View>
  );
}
