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
  DEFAULT_SERVING_GRAMS,
  formatTimeLabelFromDate,
  formatFoodTitle,
  normalizeTimeInput,
  OUNCES_TO_GRAMS,
  parseKcalPer100g,
  parseServingGramsFromLabel,
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
import {
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const UNIT_OPTIONS = ['grams', 'ml', 'oz', 'servings'] as const;
const MAX_FOOD_QUANTITY_INPUT = 5000;
// Hard sanity ceiling on one entry's total weight (10 kg) — the quantity bound alone
// can't catch "5000 servings x 500 g".
const MAX_GRAMS_EQUIVALENT = 10000;
const SERVING_QUICK_QUANTITIES = ['0.5', '1', '2', '3'] as const;

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

function getDefaultMeal(date = new Date()): MealOption {
  const hour = date.getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  if (hour < 21) return 'Dinner';
  return 'Snack';
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
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
    servingSizeLabel?: string;
    servingGrams?: string;
    origin?: string;
  }>();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = React.useState(false);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = React.useState(false);
  const defaultCurrentTime = React.useMemo(() => formatTimeLabelFromDate(new Date()), []);
  const defaultMeal = React.useMemo(() => getDefaultMeal(), []);
  const [timePickerDate, setTimePickerDate] = React.useState(() =>
    parseTimeLabelToDate(defaultCurrentTime)
  );
  const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;
  const loggedFoods = logsQuery.data ?? [];
  const editingEntry = React.useMemo(
    () => (entryId ? (loggedFoods.find((item) => item.id === entryId) ?? null) : null),
    [entryId, loggedFoods]
  );
  // Editing before the logs query resolves would fall into the INSERT branch and create a
  // bogus "Selected Food" duplicate — hold the submit button until the entry is loaded.
  // Once the query settles without the entry (deleted, or query error), stay disabled but
  // say so instead of showing "Loading..." forever.
  const editLookupSettled = logsQuery.isSuccess || logsQuery.isError;
  const isEditEntryPending = Boolean(entryId) && !editingEntry && !editLookupSettled;
  const isEditEntryMissing = Boolean(entryId) && !editingEntry && editLookupSettled;

  const foodName = React.useMemo(
    () => editingEntry?.foodName ?? formatFoodTitle(params.foodName),
    [editingEntry?.foodName, params.foodName]
  );
  const kcalPer100g = React.useMemo(
    () => editingEntry?.kcalPer100g ?? parseKcalPer100g(params.kcalPer100g),
    [editingEntry?.kcalPer100g, params.kcalPer100g]
  );
  const macroProfile = React.useMemo(() => {
    // When editing an existing log, seed macros from the entry's OWN per-100g snapshot.
    // Re-deriving via resolveMacroProfile here silently replaced the real logged macros
    // with a fabricated 35/40/25 split on any edit (even just changing the time).
    if (editingEntry) {
      return {
        proteinPer100g: editingEntry.proteinPer100g,
        carbsPer100g: editingEntry.carbsPer100g,
        fatsPer100g: editingEntry.fatsPer100g,
        fiberPer100g: editingEntry.fiberPer100g,
        sugarPer100g: editingEntry.sugarPer100g,
        sodiumMgPer100g: editingEntry.sodiumMgPer100g,
      };
    }
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
    editingEntry,
    foodName,
    kcalPer100g,
    params.carbsPer100g,
    params.fatsPer100g,
    params.fiberPer100g,
    params.proteinPer100g,
    params.sodiumMgPer100g,
    params.sugarPer100g,
  ]);
  // Grams in one serving of THIS food. Editing an entry logged in servings recovers it
  // from the entry's own snapshot (gramsEquivalent / quantity); a new log takes it from
  // the food's serving_grams column (or its label) forwarded as a param. null = unknown,
  // in which case the servings unit falls back to the legacy flat 100g.
  const servingGrams = React.useMemo<number | null>(() => {
    if (editingEntry) {
      if (editingEntry.unit === 'servings' && editingEntry.quantity > 0) {
        const perServing = editingEntry.gramsEquivalent / editingEntry.quantity;
        return Number.isFinite(perServing) && perServing > 0 ? roundTo(perServing, 1) : null;
      }
      return null;
    }
    const fromParam = Number(Array.isArray(params.servingGrams) ? params.servingGrams[0] : params.servingGrams);
    if (Number.isFinite(fromParam) && fromParam > 0) return fromParam;
    return parseServingGramsFromLabel(
      Array.isArray(params.servingSizeLabel) ? params.servingSizeLabel[0] : params.servingSizeLabel
    );
  }, [editingEntry, params.servingGrams, params.servingSizeLabel]);
  const servingSizeLabel = React.useMemo(() => {
    if (editingEntry) return null;
    const raw = Array.isArray(params.servingSizeLabel)
      ? params.servingSizeLabel[0]
      : params.servingSizeLabel;
    return raw?.trim() ? raw.trim() : null;
  }, [editingEntry, params.servingSizeLabel]);

  // When the food has a real serving weight, "1 serving" is the friendlier default;
  // otherwise keep the original 100 g default.
  const defaultQuantity = servingGrams != null ? '1' : '100';
  const defaultUnit: UnitOption = servingGrams != null ? 'servings' : UNIT_OPTIONS[0];

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
      quantity: editingEntry ? String(editingEntry.quantity) : defaultQuantity,
      unit: editingEntry ? editingEntry.unit : defaultUnit,
      meal: editingEntry ? editingEntry.meal : defaultMeal,
      logTime: editingEntry ? editingEntry.logTime : defaultCurrentTime,
    },
  });

  React.useEffect(() => {
    reset({
      quantity: editingEntry ? String(editingEntry.quantity) : defaultQuantity,
      unit: editingEntry ? editingEntry.unit : defaultUnit,
      meal: editingEntry ? editingEntry.meal : defaultMeal,
      logTime: editingEntry ? editingEntry.logTime : defaultCurrentTime,
    });
  }, [defaultCurrentTime, defaultMeal, defaultQuantity, defaultUnit, editingEntry, reset]);

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

    const gramsEquivalent = convertQuantityToGrams(quantity, unit, servingGrams);
    const scale = gramsEquivalent / 100;
    const totalKcal = roundTo(kcalPer100g * scale, 0);
    // One decimal, matching fiber/sugar — whole-gram rounding stored 0 g for small
    // portions (30 g of a 1.1 g-protein/100g food) while calories stayed non-zero.
    const proteinGrams = roundTo(macroProfile.proteinPer100g * scale, 1);
    const carbsGrams = roundTo(macroProfile.carbsPer100g * scale, 1);
    const fatsGrams = roundTo(macroProfile.fatsPer100g * scale, 1);
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
  }, [kcalPer100g, macroProfile, quantityRaw, servingGrams, unit]);

  const summaryPanelClass = isDarkMode ? 'bg-surface-dark' : 'bg-primary/10';
  const summaryValueClass = isDarkMode ? 'text-white' : 'text-foreground';
  const summaryMutedClass = isDarkMode ? 'text-white/60' : 'text-muted-foreground';
  const summaryChipClass = isDarkMode ? 'bg-white/10' : 'bg-card/70';
  const summaryTrackClass = isDarkMode ? 'bg-white/10' : 'bg-primary/15';

  const handleLogFood = React.useCallback(
    async (values: AddFoodFormValues) => {
      setIsSubmitting(true);
      try {
        const quantity = Number(values.quantity);
        const gramsEquivalent = roundTo(
          convertQuantityToGrams(quantity, values.unit, servingGrams),
          1
        );
        if (gramsEquivalent > MAX_GRAMS_EQUIVALENT) {
          setError('quantity', {
            message: `That is too large (${formatNumberGrouped(gramsEquivalent)} g). Check the quantity and unit.`,
          });
          setIsSubmitting(false);
          return;
        }

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
        if (editingEntry) {
          router.back();
        } else if (
          (Array.isArray(params.origin) ? params.origin[0] : params.origin) === 'saved' &&
          router.canGoBack()
        ) {
          // Came from the Saved Foods list — return there so the user can keep adding
          // saved items; Done lives on the search screen one level below.
          router.back();
        } else {
          // Land back on the search screen (not the dashboard) so logging a whole meal is
          // one flow: log, add the next food, then tap Done there when tapos na.
          router.dismissTo('/dashboard/log-food-search');
        }
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
      params.origin,
      servingGrams,
      setError,
      updateFoodLogMutation,
    ]
  );

  // Switching the unit converts the CURRENT amount into the new unit instead of keeping
  // the raw number ("1 serving" -> grams must become 155, not 1 gram; "100 grams" ->
  // servings must become ~0.65, not 100 servings).
  const handleUnitChange = React.useCallback(
    (nextUnit: UnitOption) => {
      const currentQuantity = Number(quantityRaw);
      if (nextUnit !== unit && Number.isFinite(currentQuantity) && currentQuantity > 0) {
        const grams = convertQuantityToGrams(currentQuantity, unit, servingGrams);
        const perServing =
          servingGrams != null && servingGrams > 0 ? servingGrams : DEFAULT_SERVING_GRAMS;
        const nextQuantity =
          nextUnit === 'oz'
            ? roundTo(grams / OUNCES_TO_GRAMS, 2)
            : nextUnit === 'servings'
              ? roundTo(grams / perServing, 2)
              : roundTo(grams, 1);
        if (
          Number.isFinite(nextQuantity) &&
          nextQuantity > 0 &&
          nextQuantity <= MAX_FOOD_QUANTITY_INPUT
        ) {
          setValue('quantity', String(nextQuantity), {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
      setValue('unit', nextUnit, { shouldValidate: true, shouldDirty: true });
    },
    [quantityRaw, servingGrams, setValue, unit]
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
    <View className="bg-background flex-1">
      <View className="bg-background flex-1">
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
            <View className="bg-primary/10 mt-2 flex-row items-center gap-2 rounded-md px-4 py-2">
              <Text className="text-xl">{getFoodEmoji(foodName)}</Text>
              <Text className="text-primary text-sm font-semibold">
                {formatNumberGrouped(kcalPer100g)} kcal per {formatMeasure(100, 'g')}
              </Text>
            </View>
            {servingGrams != null ? (
              <Text className="text-muted-foreground mt-2 text-xs font-medium">
                {servingSizeLabel ? `${servingSizeLabel} = ` : '1 serving = '}
                {formatMeasure(servingGrams, 'g')}
              </Text>
            ) : servingSizeLabel ? (
              <Text className="text-muted-foreground mt-2 text-xs font-medium">
                Serving size: {servingSizeLabel}
              </Text>
            ) : null}
          </View>

          <View className="px-4 pb-5">
            <View className={`${summaryPanelClass} rounded-lg p-5`}>
              <View className="mb-2 items-center">
                <Text className="text-primary mb-2 text-xs font-extrabold tracking-[1.6px] uppercase">
                  Total Calories
                </Text>
                <View className="mt-1 flex-row items-end gap-1">
                  <Text
                    className={`${summaryValueClass} text-5xl leading-none font-black tracking-tight`}>
                    {formatCompactNumber(nutrition.totalKcal)}
                  </Text>
                  <Text className="text-primary mb-1 text-lg font-black">kcal</Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-2">
                <View className={`${summaryChipClass} flex-1 rounded-md px-3 py-3`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold uppercase`}>
                    Protein
                  </Text>
                  <Text className={`${summaryValueClass} mt-1 text-base font-black`}>
                    {formatNumberGrouped(nutrition.proteinGrams, { maximumFractionDigits: 1 })}g
                  </Text>
                  <View className={`${summaryTrackClass} mt-2 h-1.5 overflow-hidden rounded-full`}>
                    <View
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${nutrition.proteinPct}%` }}
                    />
                  </View>
                </View>

                <View className={`${summaryChipClass} flex-1 rounded-md px-3 py-3`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold uppercase`}>
                    Carbs
                  </Text>
                  <Text className={`${summaryValueClass} mt-1 text-base font-black`}>
                    {formatNumberGrouped(nutrition.carbsGrams, { maximumFractionDigits: 1 })}g
                  </Text>
                  <View className={`${summaryTrackClass} mt-2 h-1.5 overflow-hidden rounded-full`}>
                    <View
                      className="bg-info h-full rounded-full"
                      style={{ width: `${nutrition.carbsPct}%` }}
                    />
                  </View>
                </View>

                <View className={`${summaryChipClass} flex-1 rounded-md px-3 py-3`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold uppercase`}>
                    Fat
                  </Text>
                  <Text className={`${summaryValueClass} mt-1 text-base font-black`}>
                    {formatNumberGrouped(nutrition.fatsGrams, { maximumFractionDigits: 1 })}g
                  </Text>
                  <View className={`${summaryTrackClass} mt-2 h-1.5 overflow-hidden rounded-full`}>
                    <View
                      className="bg-warning h-full rounded-full"
                      style={{ width: `${nutrition.fatsPct}%` }}
                    />
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <View className={`${summaryChipClass} flex-1 items-center rounded-md py-2`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold`}>Fiber</Text>
                  <Text className={`${summaryValueClass} text-sm font-black`}>
                    {formatMeasure(nutrition.fiberGrams, 'g')}
                  </Text>
                </View>
                <View className={`${summaryChipClass} flex-1 items-center rounded-md py-2`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold`}>Sugar</Text>
                  <Text className={`${summaryValueClass} text-sm font-black`}>
                    {formatMeasure(nutrition.sugarGrams, 'g')}
                  </Text>
                </View>
                <View className={`${summaryChipClass} flex-1 items-center rounded-md py-2`}>
                  <Text className={`${summaryMutedClass} text-[10px] font-bold`}>Sodium</Text>
                  <Text className={`${summaryValueClass} text-sm font-black`}>
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
                  className="bg-primary/10 h-16 w-32 items-center justify-center rounded-md px-3">
                  <Text className="text-foreground text-center text-lg font-semibold">{unit}</Text>
                  <Text className="text-primary text-[10px] font-bold">Change</Text>
                </Pressable>
              </View>
              {unit === 'servings' ? (
                <View className="mt-3">
                  <View className="flex-row gap-2">
                    {SERVING_QUICK_QUANTITIES.map((option) => {
                      const active = quantityRaw === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() =>
                            setValue('quantity', option, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          className={`flex-1 items-center rounded-md border px-2 py-2 ${
                            active
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background-subtle'
                          }`}>
                          <Text
                            className={
                              active
                                ? 'text-primary text-sm font-bold'
                                : 'text-foreground text-sm font-medium'
                            }>
                            {option}x
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {servingGrams == null ? (
                    <Text className="text-muted-foreground mt-2 pl-1 text-xs">
                      This food has no exact serving weight, so 1 serving is treated as{' '}
                      {formatMeasure(DEFAULT_SERVING_GRAMS, 'g')}. Using grams is more accurate.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View>
              <Text className="text-foreground mb-2 pl-1 text-base font-semibold">Meal</Text>
              <Controller
                control={control}
                name="meal"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row gap-2">
                    {MEAL_OPTIONS.map((option) => {
                      const active = value === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => onChange(option)}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                          className={`flex-1 items-center rounded-md border px-1 py-3 ${
                            active ? 'border-primary bg-primary' : 'border-border bg-background-subtle'
                          }`}>
                          <Text
                            numberOfLines={1}
                            className={
                              active
                                ? 'text-center text-[13px] font-bold text-white'
                                : 'text-foreground text-center text-[13px] font-medium'
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
                    className="bg-background-subtle h-16 flex-row items-center justify-between rounded-md px-4">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-background h-9 w-9 items-center justify-center rounded-md">
                        <Icon as={Clock3} className="text-primary size-4" />
                      </View>
                      <Text className="text-foreground text-base font-medium">{value}</Text>
                    </View>
                    <Text className="bg-primary/10 text-primary rounded-md px-3 py-1 text-xs font-semibold">
                      Edit
                    </Text>
                  </Pressable>
                )}
              />
              <FieldError message={errors.logTime?.message} />
            </View>

            {errors.root?.message ? (
              <View className="bg-destructive/10 rounded-md px-3 py-2">
                <Text className="text-destructive text-sm">{errors.root.message}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 bottom-0 px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="bg-background/90 rounded-md">
            <Button
              onPress={handleSubmit(handleLogFood)}
              disabled={isSubmitting || isEditEntryPending || isEditEntryMissing}
              className="h-14 rounded-md">
              <Icon as={Check} className="size-5 text-white" />
              <Text>
                {isEditEntryPending
                  ? 'Loading...'
                  : isEditEntryMissing
                    ? 'Entry not found'
                    : isSubmitting
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
        onSelect={handleUnitChange}
      />

      <AddFoodTimePickerModal
        open={isTimeDialogOpen}
        date={timePickerDate}
        onClose={handleCloseTimeDialog}
        onConfirm={handleConfirmTimeDialog}
      />
    </View>
  );
}
