import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, X } from 'lucide-react-native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { z } from 'zod';

import FieldError from '@/components/profile/field-error';
import StaticRow from '@/components/profile/static-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatNumberGrouped } from '@/lib/number-format';
import { useProfileBundleStore } from '@/stores/use-profile-bundle-store';
import { calculateCalorieTargets, calculateTdee } from '@/utils/calorie-targets';
import { isMinor } from '@/utils/health-guardrails';
import {
  heightCmToDisplay,
  heightInputToCm,
  weightInputToKg,
  weightKgToDisplay,
  type MeasurementUnits,
} from '@/utils/units';

type Sex = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very';

const ACTIVITY_OPTIONS: Array<{
  key: ActivityLevel;
  title: string;
  subtitle: string;
}> = [
  { key: 'sedentary', title: 'Sedentary', subtitle: 'Little to no exercise' },
  { key: 'light', title: 'Light', subtitle: 'Exercise 1-3 days/week' },
  { key: 'moderate', title: 'Moderate', subtitle: 'Exercise 3-5 days/week' },
  { key: 'very', title: 'Very Active', subtitle: 'Hard exercise 6-7 days/week' },
];

const APP_ACTIVITY_TO_LEVEL: Record<string, ActivityLevel> = {
  Sedentary: 'sedentary',
  Light: 'light',
  Moderate: 'moderate',
  'Very Active': 'very',
};

// Same canonical bounds as onboarding (lib/onboarding-form.ts), checked AFTER converting
// the typed value to metric — so an Imperial user typing 150 (lb) is validated as ~68 kg,
// never mistaken for 150 kg. The unit-blind version of this modal computed on raw Imperial
// numbers, inflating results by ~10%+ for those users.
const AGE_MIN = 13;
const AGE_MAX = 100;
const HEIGHT_CM_MIN = 100;
const HEIGHT_CM_MAX = 250;
const WEIGHT_KG_MIN = 30;
const WEIGHT_KG_MAX = 300;

function buildTdeeSchema(units: MeasurementUnits) {
  const heightUnit = units === 'Imperial' ? 'in' : 'cm';
  const weightUnit = units === 'Imperial' ? 'lb' : 'kg';
  const heightMin = Math.round(heightCmToDisplay(HEIGHT_CM_MIN, units));
  const heightMax = Math.round(heightCmToDisplay(HEIGHT_CM_MAX, units));
  const weightMin = Math.round(weightKgToDisplay(WEIGHT_KG_MIN, units));
  const weightMax = Math.round(weightKgToDisplay(WEIGHT_KG_MAX, units));

  return z.object({
    sex: z.enum(['male', 'female']),
    age: z
      .string()
      .min(1, 'Enter age.')
      .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= AGE_MIN && parsed <= AGE_MAX;
      }, `Enter an age between ${AGE_MIN} and ${AGE_MAX}.`),
    height: z
      .string()
      .min(1, 'Enter height.')
      .refine((value) => {
        const cm = heightInputToCm(Number(value), units);
        return Number.isFinite(cm) && cm >= HEIGHT_CM_MIN && cm <= HEIGHT_CM_MAX;
      }, `Enter a height between ${heightMin} and ${heightMax} ${heightUnit}.`),
    weight: z
      .string()
      .min(1, 'Enter weight.')
      .refine((value) => {
        const kg = weightInputToKg(Number(value), units);
        return Number.isFinite(kg) && kg >= WEIGHT_KG_MIN && kg <= WEIGHT_KG_MAX;
      }, `Enter a weight between ${weightMin} and ${weightMax} ${weightUnit}.`),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very']),
  });
}

type TdeeFormValues = z.infer<ReturnType<typeof buildTdeeSchema>>;

type TdeeResult = {
  /** Raw Mifflin-St Jeor TDEE — the honest answer to "what is my TDEE?". */
  tdee: number;
  /** Safety-gated daily targets, exactly what the app would store for this body. */
  maintenance: number;
  /** null when the minor gate applies — a cut is never surfaced for under-18s. */
  deficit: number | null;
  leanGain: number;
  minor: boolean;
};

function calculateTdeeResult(values: TdeeFormValues, units: MeasurementUnits): TdeeResult | null {
  const age = Number(values.age);
  const heightCm = heightInputToCm(Number(values.height), units);
  const weightKg = weightInputToKg(Number(values.weight), units);

  // Route ALL BMR/TDEE math through the safety-critical source of truth (CLAUDE.md rule 6).
  const base = {
    activityLevel: values.activityLevel,
    age,
    heightCm,
    sex: values.sex,
    weightKg,
  } as const;
  const tdee = calculateTdee(base);
  const maintenance = calculateCalorieTargets({ ...base, goal: 'maintain' });
  const deficit = calculateCalorieTargets({ ...base, goal: 'lose' });
  const gain = calculateCalorieTargets({ ...base, goal: 'gain' });
  if (tdee == null || !maintenance || !gain) return null;

  const minor = isMinor(age);
  return {
    tdee,
    maintenance: maintenance.dailyCalories,
    deficit: minor ? null : (deficit?.dailyCalories ?? null),
    leanGain: gain.dailyCalories,
    minor,
  };
}

export default function TdeeCalculatorRow() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <StaticRow
        icon={Calculator}
        iconWrapClass="bg-primary/10"
        iconClassName="text-primary"
        label="TDEE Calculator"
        value="Estimate"
        onPress={() => setOpen(true)}
      />

      <TdeeCalculatorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function TdeeCalculatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ensureLoaded = useProfileBundleStore((state) => state.ensureLoaded);
  const bundle = useProfileBundleStore((state) => state.bundle);
  const units: MeasurementUnits = bundle.units;
  const heightSuffix = units === 'Imperial' ? 'in' : 'cm';
  const weightSuffix = units === 'Imperial' ? 'lb' : 'kg';

  React.useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  const schema = React.useMemo(() => buildTdeeSchema(units), [units]);
  // Prefill from the saved profile (stored metric -> the user's display units) so the
  // calculator answers with THEIR numbers by default instead of a blank form.
  const prefill = React.useMemo<TdeeFormValues>(() => {
    const heightCm = Number(bundle.height);
    const weightKg = Number(bundle.weight);
    return {
      sex: 'male',
      age: bundle.age || '',
      height:
        Number.isFinite(heightCm) && heightCm > 0
          ? String(Math.round(heightCmToDisplay(heightCm, units) * 10) / 10)
          : '',
      weight:
        Number.isFinite(weightKg) && weightKg > 0
          ? String(Math.round(weightKgToDisplay(weightKg, units) * 10) / 10)
          : '',
      activityLevel: APP_ACTIVITY_TO_LEVEL[bundle.activityLevel] ?? 'moderate',
    };
  }, [bundle.activityLevel, bundle.age, bundle.height, bundle.weight, units]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TdeeFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: prefill,
  });
  const [result, setResult] = React.useState<TdeeResult | null>(null);
  const sex = watch('sex');
  const activityLevel = watch('activityLevel');

  React.useEffect(() => {
    if (!open) return;
    reset(prefill);
    setResult(null);
  }, [open, prefill, reset]);

  const onSubmit = (values: TdeeFormValues) => {
    setResult(calculateTdeeResult(values, units));
  };

  // The lose target is floored for safety (1,200 kcal for women, 1,500 for men, never
  // above maintenance) — when the floor bites, say so instead of showing a "deficit"
  // that silently isn't 500 kcal.
  const deficitNote = React.useMemo(() => {
    if (!result || result.minor || result.deficit == null) return null;
    if (result.deficit >= result.tdee) {
      return 'Your TDEE is already low, so cutting further is not safe. The app keeps you at maintenance instead. Focus on protein and movement.';
    }
    if (result.tdee - result.deficit < 500) {
      return `For safety, your cut will not go below ${formatNumberGrouped(result.deficit)} kcal, so the deficit is smaller than the usual 500 kcal.`;
    }
    return null;
  }, [result]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-5"
          onPress={onClose}>
          <Pressable
            className="bg-card max-h-[88%] w-full max-w-md rounded-lg p-5"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-foreground text-lg font-bold">TDEE Calculator</Text>
                <Text className="text-muted-foreground mt-1 text-xs">
                  Estimate your daily calories ({heightSuffix} / {weightSuffix}).
                </Text>
              </View>
              <Pressable
                className="bg-muted h-9 w-9 items-center justify-center rounded-md"
                onPress={onClose}>
                <Icon as={X} className="text-foreground size-4" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 pb-2">
              <View>
                <Text className="text-foreground mb-2 text-sm font-semibold">Gender</Text>
                <View className="bg-background-subtle flex-row rounded-md p-1">
                  {(['male', 'female'] as Sex[]).map((nextSex) => (
                    <Button
                      key={nextSex}
                      variant={sex === nextSex ? 'default' : 'ghost'}
                      className="h-10 flex-1 rounded-md"
                      onPress={() =>
                        setValue('sex', nextSex, {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }>
                      <Text
                        className={
                          sex === nextSex
                            ? 'text-primary-foreground font-semibold capitalize'
                            : 'text-muted-foreground font-semibold capitalize'
                        }>
                        {nextSex}
                      </Text>
                    </Button>
                  ))}
                </View>
              </View>

              <CalculatorInput
                control={control}
                name="age"
                label="Age"
                placeholder="25"
                suffix="years"
                error={errors.age?.message}
              />
              <CalculatorInput
                control={control}
                name="height"
                label="Height"
                placeholder={units === 'Imperial' ? '67' : '170'}
                suffix={heightSuffix}
                error={errors.height?.message}
              />
              <CalculatorInput
                control={control}
                name="weight"
                label="Weight"
                placeholder={units === 'Imperial' ? '154' : '70'}
                suffix={weightSuffix}
                error={errors.weight?.message}
              />

              <View>
                <Text className="text-foreground mb-2 text-sm font-semibold">Activity</Text>
                <View className="gap-2">
                  {ACTIVITY_OPTIONS.map((option) => {
                    const selected = activityLevel === option.key;
                    return (
                      <Button
                        key={option.key}
                        variant="outline"
                        className={
                          selected
                            ? 'bg-primary/10 h-auto rounded-md px-3 py-3'
                            : 'bg-background-subtle h-auto rounded-md px-3 py-3'
                        }
                        onPress={() =>
                          setValue('activityLevel', option.key, {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }>
                        <View className="flex-1">
                          <Text
                            className={
                              selected
                                ? 'text-primary text-left text-sm font-bold'
                                : 'text-foreground text-left text-sm font-bold'
                            }>
                            {option.title}
                          </Text>
                          <Text className="text-muted-foreground text-left text-xs">
                            {option.subtitle}
                          </Text>
                        </View>
                      </Button>
                    );
                  })}
                </View>
              </View>

              {result ? (
                <View className="bg-primary/10 rounded-md p-4">
                  <Text className="text-primary text-sm font-bold">Estimated calories</Text>
                  <View className="mt-3 gap-2">
                    <ResultRow label="Your TDEE (maintenance)" value={result.tdee} emphasized />
                    {result.maintenance !== result.tdee ? (
                      <ResultRow label="Maintain target (app)" value={result.maintenance} />
                    ) : null}
                    {result.deficit != null ? (
                      <ResultRow label="Deficit (cut)" value={result.deficit} />
                    ) : null}
                    <ResultRow label="Lean gain" value={result.leanGain} />
                  </View>
                  {result.maintenance !== result.tdee ? (
                    <Text className="text-muted-foreground mt-3 text-xs leading-4">
                      Your actual TDEE is {formatNumberGrouped(result.tdee)} kcal, but the app
                      will not set a target below 1,200 kcal, for safety.
                    </Text>
                  ) : null}
                  {deficitNote ? (
                    <Text className="text-muted-foreground mt-3 text-xs leading-4">
                      {deficitNote}
                    </Text>
                  ) : null}
                  {result.minor ? (
                    <Text className="text-muted-foreground mt-3 text-xs leading-4">
                      Under 18? Focus on maintaining and building healthy habits rather than
                      cutting. 💚
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Button
                variant="default"
                className="h-12 rounded-md"
                onPress={handleSubmit(onSubmit)}>
                <Text className="text-primary-foreground font-semibold">Calculate</Text>
              </Button>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CalculatorInput({
  control,
  name,
  label,
  placeholder,
  suffix,
  error,
}: {
  control: ReturnType<typeof useForm<TdeeFormValues>>['control'];
  name: 'age' | 'height' | 'weight';
  label: string;
  placeholder: string;
  suffix: string;
  error?: string;
}) {
  return (
    <View>
      <Text className="text-foreground mb-2 text-sm font-semibold">{label}</Text>
      <View className="relative justify-center">
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              placeholder={placeholder}
              className="bg-input-bg h-12 rounded-md pr-16"
            />
          )}
        />
        <Text className="text-muted-foreground absolute right-4 text-sm font-medium">{suffix}</Text>
      </View>
      <FieldError message={error} />
    </View>
  );
}

function ResultRow({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={
          emphasized
            ? 'text-foreground text-sm font-bold'
            : 'text-muted-foreground text-sm font-medium'
        }>
        {label}
      </Text>
      <Text className={emphasized ? 'text-foreground text-sm font-black' : 'text-sm font-bold'}>
        {formatNumberGrouped(value)} kcal
      </Text>
    </View>
  );
}
