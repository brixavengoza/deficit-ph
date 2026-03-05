import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatTimeLabelFromDate } from '@/utils/add-food-utils';
import { useFoodLogStore } from '@/stores/use-food-log-store';
import { useSavedFoodStore } from '@/stores/use-saved-food-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const MAX_CUSTOM_FOOD_NUMERIC_INPUT = 5000;

const addCustomFoodSchema = z.object({
  foodName: z.string().trim().min(2, 'Enter a food name'),
  servingSizeLabel: z.string().trim().min(2, 'Enter a serving size label'),
  caloriesPer100g: z
    .string()
    .trim()
    .min(1, 'Enter calories')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number')
    .refine((value) => Number(value) >= 0, 'Must be 0 or higher')
    .refine(
      (value) => Number(value) <= MAX_CUSTOM_FOOD_NUMERIC_INPUT,
      `Must be ${MAX_CUSTOM_FOOD_NUMERIC_INPUT} or lower`
    ),
  proteinPer100g: z
    .string()
    .trim()
    .min(1, 'Enter protein')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number')
    .refine((value) => Number(value) >= 0, 'Must be 0 or higher')
    .refine(
      (value) => Number(value) <= MAX_CUSTOM_FOOD_NUMERIC_INPUT,
      `Must be ${MAX_CUSTOM_FOOD_NUMERIC_INPUT}g or lower`
    ),
  carbsPer100g: z
    .string()
    .trim()
    .min(1, 'Enter carbs')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number')
    .refine((value) => Number(value) >= 0, 'Must be 0 or higher')
    .refine(
      (value) => Number(value) <= MAX_CUSTOM_FOOD_NUMERIC_INPUT,
      `Must be ${MAX_CUSTOM_FOOD_NUMERIC_INPUT}g or lower`
    ),
  fatsPer100g: z
    .string()
    .trim()
    .min(1, 'Enter fat')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number')
    .refine((value) => Number(value) >= 0, 'Must be 0 or higher')
    .refine(
      (value) => Number(value) <= MAX_CUSTOM_FOOD_NUMERIC_INPUT,
      `Must be ${MAX_CUSTOM_FOOD_NUMERIC_INPUT}g or lower`
    ),
});

type AddCustomFoodFormValues = z.infer<typeof addCustomFoodSchema>;

type NumericFieldName = 'caloriesPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatsPer100g';

function NumericField({
  control,
  errors,
  name,
  label,
  maxValue,
}: {
  control: ReturnType<typeof useForm<AddCustomFoodFormValues>>['control'];
  errors: ReturnType<typeof useForm<AddCustomFoodFormValues>>['formState']['errors'];
  name: NumericFieldName;
  label: string;
  maxValue: number;
}) {
  return (
    <View className="gap-1.5">
      <Text className="px-1 text-[15px] font-medium text-slate-900 dark:text-slate-100">
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <Input
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            format="number"
            maxNumericValue={maxValue}
            className="bg-background-subtle h-13 rounded-xl border-0 px-4 font-medium"
            returnKeyType="done"
          />
        )}
      />
      <FieldError message={errors[name]?.message} />
    </View>
  );
}

export default function AddCustomFoodScreen() {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const addLoggedFood = useFoodLogStore((state) => state.addLoggedFood);
  const upsertSavedFoodByName = useSavedFoodStore((state) => state.upsertSavedFoodByName);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddCustomFoodFormValues>({
    resolver: zodResolver(addCustomFoodSchema),
    defaultValues: {
      foodName: '',
      servingSizeLabel: '',
      caloriesPer100g: '',
      proteinPer100g: '',
      carbsPer100g: '',
      fatsPer100g: '',
    },
  });

  const handleSaveCustomFood = React.useCallback(
    async (values: AddCustomFoodFormValues) => {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        upsertSavedFoodByName({
          name: values.foodName.trim(),
          kcalPer100g: Number(values.caloriesPer100g),
          proteinPer100g: Number(values.proteinPer100g),
          carbsPer100g: Number(values.carbsPer100g),
          fatsPer100g: Number(values.fatsPer100g),
          servingSizeLabel: values.servingSizeLabel.trim(),
          source: 'user',
        });
        addLoggedFood({
          foodName: values.foodName.trim(),
          kcalPer100g: Number(values.caloriesPer100g),
          quantity: 100,
          unit: 'grams',
          gramsEquivalent: 100,
          meal: 'Lunch',
          logTime: formatTimeLabelFromDate(new Date()),
          totalKcal: Number(values.caloriesPer100g),
          proteinGrams: Number(values.proteinPer100g),
          carbsGrams: Number(values.carbsPer100g),
          fatsGrams: Number(values.fatsPer100g),
        });
        router.back();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom food';
        setError('root', { message });
        console.error('[AddCustomFoodScreen.handleSaveCustomFood]', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [addLoggedFood, setError, upsertSavedFoodByName]
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-color-surface flex-1">
        <View className="border-border/70 bg-background/90 flex-row items-center justify-between border-b px-4 py-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="text-foreground size-5" />
          </Button>
          <Text className="text-foreground flex-1 pr-10 text-center text-lg font-bold">
            Add Custom Food
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-6 px-4 py-6 pb-32">
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-muted-foreground text-center text-sm font-semibold tracking-[1.2px] uppercase">
                Food Details
              </Text>

              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="px-1 text-[15px] font-medium text-slate-900 dark:text-slate-100">
                    Food Name
                  </Text>
                  <Controller
                    control={control}
                    name="foodName"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <Input
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="e.g. Homemade Chicken Adobo"
                        className="bg-background-subtle h-13 rounded-xl border-0 px-4 font-medium"
                        returnKeyType="next"
                      />
                    )}
                  />
                  <FieldError message={errors.foodName?.message} />
                </View>

                <View className="gap-1.5">
                  <Text className="px-1 text-[15px] font-medium text-slate-900 dark:text-slate-100">
                    Serving Size Label
                  </Text>
                  <Controller
                    control={control}
                    name="servingSizeLabel"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <Input
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        placeholder="e.g. 1 slice or 1 bowl"
                        className="bg-background-subtle h-13 rounded-xl border-0 px-4 font-medium"
                        returnKeyType="done"
                      />
                    )}
                  />
                  <FieldError message={errors.servingSizeLabel?.message} />
                </View>
              </View>
            </View>
          </View>

          <View className="gap-4 pt-1">
            <Text className="text-muted-foreground text-center text-sm font-semibold tracking-[1.2px] uppercase">
              Nutrition per 100g
            </Text>

            <View className="gap-4">
              <NumericField
                control={control}
                errors={errors}
                name="caloriesPer100g"
                label="Calories (kcal)"
                maxValue={MAX_CUSTOM_FOOD_NUMERIC_INPUT}
              />
              <NumericField
                control={control}
                errors={errors}
                name="proteinPer100g"
                label="Protein (g)"
                maxValue={MAX_CUSTOM_FOOD_NUMERIC_INPUT}
              />
              <NumericField
                control={control}
                errors={errors}
                name="carbsPer100g"
                label="Carbohydrates (g)"
                maxValue={MAX_CUSTOM_FOOD_NUMERIC_INPUT}
              />
              <NumericField
                control={control}
                errors={errors}
                name="fatsPer100g"
                label="Fat (g)"
                maxValue={MAX_CUSTOM_FOOD_NUMERIC_INPUT}
              />
            </View>
          </View>

          <View className="bg-primary/10 flex-row items-start gap-3 rounded-md p-4">
            <View className="bg-primary/15 mt-0.5 h-7 w-7 items-center justify-center rounded-full">
              <Icon as={Info} className="text-primary size-4" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-sm leading-5 text-slate-700 dark:text-slate-300">
                Tip: Most store-bought foods provide nutrition per 100g on the package label.
                Accurate values help keep your logs consistent.
              </Text>
            </View>
          </View>

          {errors.root?.message ? (
            <View className="bg-destructive/10 rounded-xl px-3 py-2">
              <Text className="text-destructive text-sm">{errors.root.message}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          className="border-border/70 bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Button
            variant="default"
            className="h-13 rounded-xl"
            disabled={isSubmitting}
            onPress={handleSubmit(handleSaveCustomFood)}>
            <Text>{isSubmitting ? 'Saving...' : 'Save Food'}</Text>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
