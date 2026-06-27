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

type Sex = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very';

const ACTIVITY_OPTIONS: Array<{
  key: ActivityLevel;
  title: string;
  subtitle: string;
  multiplier: number;
}> = [
  { key: 'sedentary', title: 'Sedentary', subtitle: 'Little to no exercise', multiplier: 1.2 },
  { key: 'light', title: 'Light', subtitle: 'Exercise 1-3 days/week', multiplier: 1.375 },
  { key: 'moderate', title: 'Moderate', subtitle: 'Exercise 3-5 days/week', multiplier: 1.55 },
  { key: 'very', title: 'Very Active', subtitle: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
];

const tdeeSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z
    .string()
    .min(1, 'Enter age.')
    .refine((value) => toPositiveNumber(value) != null, 'Enter a valid age.'),
  heightCm: z
    .string()
    .min(1, 'Enter height.')
    .refine((value) => toPositiveNumber(value) != null, 'Enter a valid height.'),
  weightKg: z
    .string()
    .min(1, 'Enter weight.')
    .refine((value) => toPositiveNumber(value) != null, 'Enter a valid weight.'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very']),
});

type TdeeFormValues = z.infer<typeof tdeeSchema>;

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateTdee(values: TdeeFormValues) {
  const age = toPositiveNumber(values.age);
  const heightCm = toPositiveNumber(values.heightCm);
  const weightKg = toPositiveNumber(values.weightKg);
  if (!age || !heightCm || !weightKg) return null;

  const sexOffset = values.sex === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const activity = ACTIVITY_OPTIONS.find((option) => option.key === values.activityLevel);
  const maintenance = Math.round(bmr * (activity?.multiplier ?? 1.2));

  return {
    bmr: Math.round(bmr),
    maintenance,
    lightCut: Math.max(1200, maintenance - 250),
    deficit: Math.max(1200, maintenance - 500),
    leanGain: maintenance + 250,
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
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TdeeFormValues>({
    resolver: zodResolver(tdeeSchema),
    mode: 'onChange',
    defaultValues: {
      sex: 'male',
      age: '',
      heightCm: '',
      weightKg: '',
      activityLevel: 'moderate',
    },
  });
  const [result, setResult] = React.useState<ReturnType<typeof calculateTdee>>(null);
  const sex = watch('sex');
  const activityLevel = watch('activityLevel');

  const onSubmit = (values: TdeeFormValues) => {
    setResult(calculateTdee(values));
  };

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
                  Estimate daily calories for anyone.
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
                name="heightCm"
                label="Height"
                placeholder="170"
                suffix="cm"
                error={errors.heightCm?.message}
              />
              <CalculatorInput
                control={control}
                name="weightKg"
                label="Weight"
                placeholder="70"
                suffix="kg"
                error={errors.weightKg?.message}
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
                    <ResultRow label="BMR" value={result.bmr} />
                    <ResultRow label="Maintenance" value={result.maintenance} emphasized />
                    <ResultRow label="Light deficit" value={result.lightCut} />
                    <ResultRow label="Deficit" value={result.deficit} />
                    <ResultRow label="Lean gain" value={result.leanGain} />
                  </View>
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
  name: 'age' | 'heightCm' | 'weightKg';
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
