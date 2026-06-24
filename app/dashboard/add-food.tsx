import { AddFoodMeasureModal } from '@/components/log/AddFoodMeasureModal';
import { AddFoodTimePickerModal } from '@/components/log/AddFoodTimePickerModal';
import FieldError from '@/components/profile/field-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  useFoodLogsQuery,
  useInsertFoodLogMutation,
  useUpdateFoodLogMutation,
} from '@/hooks/use-trackk-query';
import {
  convertQuantityToGrams,
  formatTimeLabelFromDate,
  formatFoodTitle,
  getMacroBarWidth,
  normalizeTimeInput,
  parseKcalPer100g,
  parseTimeLabelToDate,
  resolveMacroProfile,
  roundTo,
  TIME_INPUT_REGEX,
} from '@/utils/add-food-utils';
import { getFoodEmoji } from '@/lib/food-emoji';
import { formatCompactNumber, formatMeasure, formatNumberGrouped } from '@/lib/number-format';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Clock3 } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const UNIT_OPTIONS = ['grams', 'oz', 'servings'] as const;
const MAX_FOOD_QUANTITY_INPUT = 5000;

type MealOption = (typeof MEAL_OPTIONS)[number];
type UnitOption = (typeof UNIT_OPTIONS)[number];

const addFoodSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Enter a quantity')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number')
    .refine((value) => Number(value) > 0, 'Quantity must be greater than 0')
    .refine((value) => Number(value) <= MAX_FOOD_QUANTITY_INPUT, 'Quantity is too large'),
  unit: z.enum(UNIT_OPTIONS),
  meal: z.enum(MEAL_OPTIONS),
  logTime: z
    .string()
    .trim()
    .min(1, 'Enter a time')
    .regex(TIME_INPUT_REGEX, 'Use format like 12:30 PM'),
});

type AddFoodFormValues = z.infer<typeof addFoodSchema>;

// use date-fns to get the current time
const defaultCurrentTime = formatTimeLabelFromDate(new Date());

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const logsQuery = useFoodLogsQuery();
  const insertFoodLogMutation = useInsertFoodLogMutation();
  const updateFoodLogMutation = useUpdateFoodLogMutation();
  const params = useLocalSearchParams<{
    entryId?: string;
    foodName?: string;
    kcalPer100g?: string;
    proteinPer100g?: string;
    carbsPer100g?: string;
    fatsPer100g?: string;
    fiberPer100g?: string;
    sugarPer100g?: string;
    sodiumMgPer100g?: string;
  }>();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = React.useState(false);
  const [timePickerDate, setTimePickerDate] = React.useState(() =>
    parseTimeLabelToDate(defaultCurrentTime)
  );
  const defaultMeal: MealOption = 'Lunch';
  const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;
  const loggedFoods = logsQuery.data ?? [];
  const editingEntry = React.useMemo(
    () => (entryId ? (loggedFoods.find((item) => item.id === entryId) ?? null) : null),
    [entryId, loggedFoods]
  );

  const foodName = React.useMemo(
    () => editingEntry?.foodName ?? formatFoodTitle(params.foodName),
    [editingEntry?.foodName, params.foodName]
  );
  const kcalPer100g = React.useMemo(
    () => editingEntry?.kcalPer100g ?? parseKcalPer100g(params.kcalPer100g),
    [editingEntry?.kcalPer100g, params.kcalPer100g]
  );
  const macroProfile = React.useMemo(() => {
    const resolved = resolveMacroProfile(foodName, kcalPer100g);
    const scannedProtein = Number(params.proteinPer100g);
    const scannedCarbs = Number(params.carbsPer100g);
    const scannedFats = Number(params.fatsPer100g);
    const scannedFiber = Number(params.fiberPer100g);
    const scannedSugar = Number(params.sugarPer100g);
    const scannedSodium = Number(params.sodiumMgPer100g);

    return {
      proteinPer100g:
        Number.isFinite(scannedProtein) && scannedProtein >= 0
          ? scannedProtein
          : resolved.proteinPer100g,
      carbsPer100g:
        Number.isFinite(scannedCarbs) && scannedCarbs >= 0 ? scannedCarbs : resolved.carbsPer100g,
      fatsPer100g:
        Number.isFinite(scannedFats) && scannedFats >= 0 ? scannedFats : resolved.fatsPer100g,
      fiberPer100g:
        Number.isFinite(scannedFiber) && scannedFiber >= 0 ? scannedFiber : resolved.fiberPer100g,
      sugarPer100g:
        Number.isFinite(scannedSugar) && scannedSugar >= 0 ? scannedSugar : resolved.sugarPer100g,
      sodiumMgPer100g:
        Number.isFinite(scannedSodium) && scannedSodium >= 0
          ? scannedSodium
          : resolved.sodiumMgPer100g,
    };
  }, [
    foodName,
    kcalPer100g,
    params.carbsPer100g,
    params.fatsPer100g,
    params.fiberPer100g,
    params.proteinPer100g,
    params.sodiumMgPer100g,
    params.sugarPer100g,
  ]);
  const defaultQuantityFromSelectedFood = React.useMemo(
    () => String(Math.max(1, Math.round(kcalPer100g))),
    [kcalPer100g]
  );

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddFoodFormValues>({
    resolver: zodResolver(addFoodSchema),
    defaultValues: {
      quantity: editingEntry ? String(editingEntry.quantity) : defaultQuantityFromSelectedFood,
      unit: editingEntry ? editingEntry.unit : UNIT_OPTIONS[0],
      meal: editingEntry ? editingEntry.meal : defaultMeal,
      logTime: editingEntry ? editingEntry.logTime : defaultCurrentTime,
    },
  });

  React.useEffect(() => {
    reset({
      quantity: editingEntry ? String(editingEntry.quantity) : defaultQuantityFromSelectedFood,
      unit: editingEntry ? editingEntry.unit : UNIT_OPTIONS[0],
      meal: editingEntry ? editingEntry.meal : defaultMeal,
      logTime: editingEntry ? editingEntry.logTime : defaultCurrentTime,
    });
  }, [defaultCurrentTime, defaultMeal, defaultQuantityFromSelectedFood, editingEntry, reset]);

  const quantityRaw = watch('quantity');
  const unit = watch('unit');
  const logTime = watch('logTime');

  const nutrition = React.useMemo(() => {
    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        totalKcal: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatsGrams: 0,
        fiberGrams: 0,
        sugarGrams: 0,
        sodiumMg: 0,
        proteinPct: 0,
        carbsPct: 0,
        fatsPct: 0,
      };
    }

    const gramsEquivalent = convertQuantityToGrams(quantity, unit);
    const scale = gramsEquivalent / 100;
    const totalKcal = roundTo(kcalPer100g * scale, 0);
    const proteinGrams = roundTo(macroProfile.proteinPer100g * scale, 0);
    const carbsGrams = roundTo(macroProfile.carbsPer100g * scale, 0);
    const fatsGrams = roundTo(macroProfile.fatsPer100g * scale, 0);
    const fiberGrams = roundTo((macroProfile.fiberPer100g ?? 0) * scale, 1);
    const sugarGrams = roundTo((macroProfile.sugarPer100g ?? 0) * scale, 1);
    const sodiumMg = roundTo((macroProfile.sodiumMgPer100g ?? 0) * scale, 0);

    const totalMacroGrams = proteinGrams + carbsGrams + fatsGrams || 1;

    return {
      totalKcal,
      proteinGrams,
      carbsGrams,
      fatsGrams,
      fiberGrams,
      sugarGrams,
      sodiumMg,
      proteinPct: (proteinGrams / totalMacroGrams) * 100,
      carbsPct: (carbsGrams / totalMacroGrams) * 100,
      fatsPct: (fatsGrams / totalMacroGrams) * 100,
    };
  }, [kcalPer100g, macroProfile, quantityRaw, unit]);

  const handleSelectMeal = React.useCallback(
    (nextMeal: MealOption) => {
      setValue('meal', nextMeal, { shouldValidate: true });
    },
    [setValue]
  );

  const handleLogFood = React.useCallback(
    async (values: AddFoodFormValues) => {
      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 220));
        const quantity = Number(values.quantity);
        const gramsEquivalent = roundTo(convertQuantityToGrams(quantity, values.unit), 1);

        const nextPayload = {
          quantity: roundTo(quantity, 2),
          unit: values.unit,
          gramsEquivalent,
          meal: values.meal,
          logTime: normalizeTimeInput(values.logTime),
          totalKcal: nutrition.totalKcal,
          proteinGrams: nutrition.proteinGrams,
          carbsGrams: nutrition.carbsGrams,
          fatsGrams: nutrition.fatsGrams,
          fiberGrams: nutrition.fiberGrams,
          sugarGrams: nutrition.sugarGrams,
          sodiumMg: nutrition.sodiumMg,
        };

        if (editingEntry) {
          await updateFoodLogMutation.mutateAsync({
            id: editingEntry.id,
            payload: {
              id: editingEntry.id,
              foodName,
              kcalPer100g,
              proteinPer100g: macroProfile.proteinPer100g,
              carbsPer100g: macroProfile.carbsPer100g,
              fatsPer100g: macroProfile.fatsPer100g,
              fiberPer100g: macroProfile.fiberPer100g,
              sugarPer100g: macroProfile.sugarPer100g,
              sodiumMgPer100g: macroProfile.sodiumMgPer100g,
              ...nextPayload,
            },
          });
        } else {
          await insertFoodLogMutation.mutateAsync({
            foodName,
            kcalPer100g,
            proteinPer100g: macroProfile.proteinPer100g,
            carbsPer100g: macroProfile.carbsPer100g,
            fatsPer100g: macroProfile.fatsPer100g,
            fiberPer100g: macroProfile.fiberPer100g,
            sugarPer100g: macroProfile.sugarPer100g,
            sodiumMgPer100g: macroProfile.sodiumMgPer100g,
            ...nextPayload,
          });
        }
        router.back();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to log food';
        setError('root', { message });
        console.error('[AddFoodScreen.handleLogFood]', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      editingEntry,
      foodName,
      insertFoodLogMutation,
      kcalPer100g,
      macroProfile,
      nutrition,
      setError,
      updateFoodLogMutation,
    ]
  );

  const handleOpenTimeDialog = React.useCallback(() => {
    setTimePickerDate(parseTimeLabelToDate(logTime || '12:30 PM'));
    setIsTimeDialogOpen(true);
  }, [logTime]);

  const handleConfirmTimeDialog = React.useCallback(
    (selectedDate: Date) => {
      setTimePickerDate(selectedDate);
      setValue('logTime', formatTimeLabelFromDate(selectedDate), {
        shouldValidate: true,
        shouldDirty: true,
      });
      setIsTimeDialogOpen(false);
    },
    [setValue]
  );

  const handleCloseTimeDialog = React.useCallback(() => {
    setIsTimeDialogOpen(false);
  }, []);

  return (
    <KeyboardAvoidingView
      className="bg-color-surface-light flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <View className="bg-color-surface flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 128 }}
          keyboardShouldPersistTaps="handled">
          <View className="items-center px-6 pt-4 pb-5">
            <Button
              variant="ghost"
              size="icon"
              onPress={() => router.back()}
              className="absolute top-3 left-3 h-10 w-10">
              <Icon as={ArrowLeft} className="text-foreground size-5" />
            </Button>
            <Text className="text-foreground text-center text-[28px] font-extrabold tracking-tight">
              {foodName}
            </Text>
            <View className="bg-primary/10 mt-2 flex-row items-center gap-2 rounded-full px-4 py-2">
              <Text className="text-xl">{getFoodEmoji(foodName)}</Text>
              <Text className="text-primary text-sm font-semibold">
                {formatNumberGrouped(kcalPer100g)} kcal per {formatMeasure(100, 'g')}
              </Text>
            </View>
          </View>

          <View className="px-4 pb-5">
            <View className="border-primary/20 bg-primary/10 rounded-xl border p-5">
              <View className="mb-2 items-center">
                <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-[1.6px] uppercase">
                  Total Calories
                </Text>
                <View className="mt-1 flex-row items-end gap-1">
                  <Text className="text-foreground text-5xl leading-none font-extrabold tracking-tight">
                    {formatCompactNumber(nutrition.totalKcal)}
                  </Text>
                  <Text className="text-primary mb-1 text-lg font-bold">kcal</Text>
                </View>
              </View>

              <View className="border-primary/10 divide-primary/10 bg-card/50 flex-row divide-x rounded-2xl py-3">
                <View className="flex-1 items-center px-2">
                  <Text className="text-shadow-muted-foreground text-xs">Protein</Text>
                  <Text className="border-primary/60 bg-card text-foreground mt-1 rounded-full border px-3 text-base font-bold">
                    {formatMeasure(nutrition.proteinGrams, 'g')}
                  </Text>
                </View>

                <View className="flex-1 items-center px-2">
                  <Text className="text-shadow-muted-foreground text-xs">Carbs</Text>
                  <Text className="border-primary/60 bg-card text-foreground mt-1 rounded-full border px-3 text-base font-bold">
                    {formatMeasure(nutrition.carbsGrams, 'g')}
                  </Text>
                </View>

                <View className="flex-1 items-center px-2">
                  <Text className="text-shadow-muted-foreground text-xs">Fats</Text>
                  <Text className="border-primary/60 bg-card text-foreground mt-1 rounded-full border px-3 text-base font-bold">
                    {formatMeasure(nutrition.fatsGrams, 'g')}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <View className="bg-card/50 flex-1 items-center rounded-xl py-2">
                  <Text className="text-muted-foreground text-[10px] font-semibold">Fiber</Text>
                  <Text className="text-foreground text-sm font-bold">
                    {formatMeasure(nutrition.fiberGrams, 'g')}
                  </Text>
                </View>
                <View className="bg-card/50 flex-1 items-center rounded-xl py-2">
                  <Text className="text-muted-foreground text-[10px] font-semibold">Sugar</Text>
                  <Text className="text-foreground text-sm font-bold">
                    {formatMeasure(nutrition.sugarGrams, 'g')}
                  </Text>
                </View>
                <View className="bg-card/50 flex-1 items-center rounded-xl py-2">
                  <Text className="text-muted-foreground text-[10px] font-semibold">Sodium</Text>
                  <Text className="text-foreground text-sm font-bold">
                    {formatNumberGrouped(nutrition.sodiumMg)}mg
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="gap-5 px-4">
            <View>
              <Text className="text-foreground mb-2 pl-1 text-base font-semibold">Quantity</Text>
              <View className="flex-row items-start gap-3">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <Input
                        value={value}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="0"
                        size="xlNumeric"
                        format="number"
                        maxNumericValue={MAX_FOOD_QUANTITY_INPUT}
                        className="bg-input-bg text-2xl"
                        returnKeyType="done"
                      />
                    )}
                  />
                  <FieldError message={errors.quantity?.message} />
                </View>

                <Pressable
                  onPress={() => setIsUnitDialogOpen(true)}
                  className="bg-background-subtle h-16 w-32 items-center justify-center rounded-2xl px-3">
                  <Text className="text-foreground text-center text-lg font-semibold">{unit}</Text>
                  <Text className="text-muted-foreground text-[10px]">Tap to change</Text>
                </Pressable>
              </View>
              <Text className="text-muted-foreground mt-1 pl-1 text-xs">
                Opens a measure picker dialog.
              </Text>
            </View>

            <View>
              <Text className="text-foreground mb-2 pl-1 text-base font-semibold">Meal</Text>
              <Controller
                control={control}
                name="meal"
                render={({ field: { value } }) => (
                  <View className="bg-background-subtle flex-row rounded-full p-1">
                    {MEAL_OPTIONS.map((option) => {
                      const active = value === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => handleSelectMeal(option)}
                          className={`flex-1 rounded-full px-2 py-3 ${
                            active ? 'bg-primary shadow-sm shadow-black/10' : ''
                          }`}>
                          <Text
                            className={
                              active
                                ? 'text-center text-sm font-semibold text-white'
                                : 'text-muted-foreground text-center text-sm font-medium'
                            }>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
              <FieldError message={errors.meal?.message} />
            </View>

            <View>
              <Text className="text-foreground mb-2 pl-1 text-base font-semibold">Log Time</Text>
              <Controller
                control={control}
                name="logTime"
                render={({ field: { value } }) => (
                  <Pressable
                    onPress={handleOpenTimeDialog}
                    className="bg-background-subtle h-16 flex-row items-center justify-between rounded-2xl px-4">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-background h-9 w-9 items-center justify-center rounded-xl">
                        <Icon as={Clock3} className="text-primary size-4" />
                      </View>
                      <Text className="text-foreground text-base font-medium">{value}</Text>
                    </View>
                    <Text className="bg-primary/10 text-primary rounded-lg px-3 py-1 text-xs font-semibold">
                      Edit
                    </Text>
                  </Pressable>
                )}
              />
              <Text className="text-muted-foreground mt-1 pl-1 text-xs">
                Tap to set a specific time (e.g. 12:30 PM)
              </Text>
              <FieldError message={errors.logTime?.message} />
            </View>

            {errors.root?.message ? (
              <View className="bg-destructive/10 rounded-xl px-3 py-2">
                <Text className="text-destructive text-sm">{errors.root.message}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 bottom-0 px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="bg-background/90 rounded-xl">
            <Button
              onPress={handleSubmit(handleLogFood)}
              disabled={isSubmitting}
              className="h-14 rounded-full">
              <Icon as={Check} className="size-5 text-white" />
              <Text>
                {isSubmitting
                  ? editingEntry
                    ? 'Saving...'
                    : 'Logging...'
                  : editingEntry
                    ? 'Save Changes'
                    : 'Log Food'}
              </Text>
            </Button>
          </View>
        </View>
      </View>

      <AddFoodMeasureModal
        open={isUnitDialogOpen}
        selected={unit}
        onClose={() => setIsUnitDialogOpen(false)}
        onSelect={(value) => setValue('unit', value, { shouldValidate: true, shouldDirty: true })}
      />

      <AddFoodTimePickerModal
        open={isTimeDialogOpen}
        date={timePickerDate}
        onClose={handleCloseTimeDialog}
        onConfirm={handleConfirmTimeDialog}
      />
    </KeyboardAvoidingView>
  );
}
