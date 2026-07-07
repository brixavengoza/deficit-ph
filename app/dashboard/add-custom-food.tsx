import FieldError from '@/components/profile/field-error';
import { ChoiceModal } from '@/components/profile/choice-modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useCommonFoodsQuery, useFoodSearchQuery } from '@/hooks/use-trackk-query';
import { useUpsertUserFoodMutation } from '@/hooks/use-trackk-query';
import { SavedFoodModel } from '@/lib/local-data';
import {
  convertRecipeQuantityToGrams,
  roundTo,
  type RecipeIngredientUnitOption,
} from '@/utils/add-food-utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  Info,
  PencilLine,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { formatNumberGrouped } from '@/lib/number-format';

const MAX_CUSTOM_FOOD_NUMERIC_INPUT = 5000;

const addCustomFoodSchema = z.object({
  foodName: z.string().trim().min(2, 'Enter a food name'),
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
});

type AddCustomFoodFormValues = z.infer<typeof addCustomFoodSchema>;

const RECIPE_UNIT_OPTIONS: RecipeIngredientUnitOption[] = ['g', 'ml', 'tsp', 'tbsp', 'cup'];

type RecipeIngredient = {
  amountUnit: RecipeIngredientUnitOption;
  amountValue: string;
  matchedFood: SavedFoodModel | null;
  manualCalories: string;
  matchState: 'idle' | 'searching' | 'matched' | 'unmatched';
  id: string;
  name: string;
};

type NumericFieldName = 'caloriesPer100g';
type IngredientFoodPickerProps = {
  commonFoods: SavedFoodModel[];
  onClose: () => void;
  onPickFood: (food: SavedFoodModel) => void;
  onUseManual: (name: string) => void;
  open: boolean;
  query: string;
  results: SavedFoodModel[];
  setQuery: (value: string) => void;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value?: string | string[]) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function valueParam(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

function createIngredient(): RecipeIngredient {
  return {
    amountUnit: 'g',
    amountValue: '',
    matchedFood: null,
    manualCalories: '',
    matchState: 'idle',
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
  };
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(id);
  }, [delayMs, value]);

  return debouncedValue;
}

function IngredientFoodPicker({
  commonFoods,
  onClose,
  onPickFood,
  onUseManual,
  open,
  query,
  results,
  setQuery,
}: IngredientFoodPickerProps) {
  const inputRef = React.useRef<TextInput>(null);
  const trimmedQuery = query.trim();
  const rows = trimmedQuery.length >= 2 ? results : commonFoods;

  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable className="flex-1 justify-end bg-black/30" onPress={onClose}>
          <Pressable
            className="bg-background rounded-t-2xl px-4 pt-4 pb-6"
            onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 items-center">
              <View className="bg-muted h-1.5 w-12 rounded-full" />
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-bold">Choose Ingredient</Text>
              <Button variant="ghost" size="sm" className="rounded-md px-2" onPress={onClose}>
                <Text>Done</Text>
              </Button>
            </View>

            <View className="bg-input-bg mb-3 flex-row items-center rounded-md">
              <View className="px-4 pr-2">
                <Icon as={Search} className="text-muted-foreground size-4" />
              </View>
              <Input
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search ingredient"
                autoCapitalize="words"
                className="h-12 flex-1 border-0 bg-transparent px-0"
                returnKeyType="search"
              />
            </View>

            <ScrollView
              className="max-h-96"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled">
              <View className="gap-2">
                {rows.map((food) => (
                  <Pressable
                    key={food.id}
                    className="bg-card rounded-md px-4 py-3"
                    onPress={() => onPickFood(food)}>
                    <Text className="text-foreground font-semibold">{food.name}</Text>
                    <Text className="text-muted-foreground mt-1 text-sm">
                      {formatNumberGrouped(food.kcalPer100g)} kcal per 100g
                    </Text>
                  </Pressable>
                ))}

                {!rows.length ? (
                  <View className="bg-card rounded-md px-4 py-4">
                    <Text className="text-foreground font-semibold">No foods found</Text>
                    <Text className="text-muted-foreground mt-1 text-sm">
                      Save this ingredient manually if it is not in your local database yet.
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {trimmedQuery ? (
              <Button
                variant="outline"
                className="border-primary/30 bg-primary/10 mt-4 h-12 rounded-md"
                onPress={() => onUseManual(trimmedQuery)}>
                <Icon as={PencilLine} className="text-primary size-4" />
                <Text className="text-primary">Create "{trimmedQuery}"</Text>
              </Button>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
      <Text className="text-foreground px-1 text-[15px] font-medium">{label}</Text>
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
            className="bg-input-bg h-13 rounded-md px-4 font-medium"
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
  const isDarkMode = useColorScheme() === 'dark';
  const params = useLocalSearchParams<
    Partial<
      Record<
        | 'foodName'
        | 'caloriesPer100g'
        | 'proteinPer100g'
        | 'carbsPer100g'
        | 'fatsPer100g'
        | 'fiberPer100g'
        | 'sugarPer100g'
        | 'sodiumMgPer100g',
        string
      >
    >
  >();
  const [submittingAction, setSubmittingAction] = React.useState<'save' | 'save-log' | null>(null);
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([createIngredient()]);
  const [foodPickerIngredientId, setFoodPickerIngredientId] = React.useState<string | null>(null);
  const [foodPickerQuery, setFoodPickerQuery] = React.useState('');
  const [unitPickerIngredientId, setUnitPickerIngredientId] = React.useState<string | null>(null);
  const debouncedFoodPickerQuery = useDebouncedValue(foodPickerQuery, 250);
  const normalizedFoodPickerQuery = debouncedFoodPickerQuery.trim().toLowerCase();
  const commonFoodsQuery = useCommonFoodsQuery();
  const foodSearchQuery = useFoodSearchQuery(normalizedFoodPickerQuery);
  const upsertFoodMutation = useUpsertUserFoodMutation();
  const isSubmitting = submittingAction != null;
  const incomingNutrition = React.useMemo(
    () => ({
      proteinPer100g: numberParam(params.proteinPer100g),
      carbsPer100g: numberParam(params.carbsPer100g),
      fatsPer100g: numberParam(params.fatsPer100g),
      fiberPer100g: numberParam(params.fiberPer100g),
      sugarPer100g: numberParam(params.sugarPer100g),
      sodiumMgPer100g: numberParam(params.sodiumMgPer100g),
    }),
    [
      params.carbsPer100g,
      params.fatsPer100g,
      params.fiberPer100g,
      params.proteinPer100g,
      params.sodiumMgPer100g,
      params.sugarPer100g,
    ]
  );

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddCustomFoodFormValues>({
    resolver: zodResolver(addCustomFoodSchema),
    defaultValues: {
      foodName: firstParam(params.foodName) ?? '',
      caloriesPer100g: firstParam(params.caloriesPer100g) ?? '',
    },
  });

  const recipeIngredients = React.useMemo(
    () =>
      ingredients.map((ingredient) => {
        const amount = Number(ingredient.amountValue || 0);
        const gramsEquivalent =
          Number.isFinite(amount) && amount > 0
            ? roundTo(convertRecipeQuantityToGrams(amount, ingredient.amountUnit), 1)
            : 0;
        const manualCalories = Number(ingredient.manualCalories || 0);
        const calories =
          ingredient.matchedFood && gramsEquivalent > 0
            ? Math.round((ingredient.matchedFood.kcalPer100g * gramsEquivalent) / 100)
            : gramsEquivalent > 0 && Number.isFinite(manualCalories) && manualCalories > 0
              ? Math.round(manualCalories)
              : 0;

        return {
          ...ingredient,
          calories,
          gramsEquivalent,
        };
      }),
    [ingredients]
  );
  const commonFoods = React.useMemo(
    () => (commonFoodsQuery.data ?? []).slice(0, 24),
    [commonFoodsQuery.data]
  );
  const ingredientSearchResults = React.useMemo(
    () => foodSearchQuery.data ?? [],
    [foodSearchQuery.data]
  );

  const recipeTotals = React.useMemo(() => {
    let totalCalories = 0;
    let totalWeight = 0;

    for (const ingredient of recipeIngredients) {
      totalCalories += ingredient.calories;
      totalWeight += ingredient.gramsEquivalent;
    }

    const caloriesPer100g = totalWeight > 0 ? Math.round((totalCalories / totalWeight) * 100) : 0;

    return { caloriesPer100g, totalCalories, totalWeight };
  }, [recipeIngredients]);

  const addIngredient = React.useCallback(() => {
    setIngredients((current) => [...current, createIngredient()]);
  }, []);

  const removeIngredient = React.useCallback((id: string) => {
    setIngredients((current) => {
      if (current.length === 1) {
        return [createIngredient()];
      }

      return current.filter((ingredient) => ingredient.id !== id);
    });
  }, []);

  const updateIngredientField = React.useCallback(
    (id: string, field: 'amountValue' | 'manualCalories' | 'name', nextValue: string) => {
      setIngredients((current) =>
        current.map((ingredient) =>
          ingredient.id === id ? { ...ingredient, [field]: nextValue } : ingredient
        )
      );
    },
    []
  );

  const updateIngredientUnit = React.useCallback((id: string, unit: RecipeIngredientUnitOption) => {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, amountUnit: unit } : ingredient
      )
    );
  }, []);

  const openFoodPicker = React.useCallback((ingredient: RecipeIngredient) => {
    setFoodPickerIngredientId(ingredient.id);
    setFoodPickerQuery(ingredient.name);
  }, []);

  const selectIngredientFood = React.useCallback((ingredientId: string, food: SavedFoodModel) => {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              name: food.name,
              matchedFood: food,
              manualCalories: '',
              matchState: 'matched',
            }
          : ingredient
      )
    );
    setFoodPickerIngredientId(null);
    setFoodPickerQuery('');
  }, []);

  const useManualIngredientName = React.useCallback((ingredientId: string, name: string) => {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === ingredientId
          ? {
              ...ingredient,
              name,
              matchedFood: null,
              manualCalories: ingredient.manualCalories,
              matchState: 'unmatched',
            }
          : ingredient
      )
    );
    setFoodPickerIngredientId(null);
    setFoodPickerQuery('');
  }, []);

  const applyRecipeCalories = React.useCallback(() => {
    if (recipeTotals.caloriesPer100g <= 0) return;
    setValue('caloriesPer100g', String(recipeTotals.caloriesPer100g), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [recipeTotals.caloriesPer100g, setValue]);

  const handleSaveCustomFood = React.useCallback(
    async (values: AddCustomFoodFormValues, shouldLogToday: boolean) => {
      setSubmittingAction(shouldLogToday ? 'save-log' : 'save');
      try {
        const manualIngredientsToSave = recipeIngredients
          .filter(
            (ingredient) =>
              ingredient.matchState === 'unmatched' &&
              ingredient.name.trim().length >= 2 &&
              ingredient.gramsEquivalent > 0 &&
              ingredient.calories > 0
          )
          .map((ingredient) => ({
            name: ingredient.name.trim(),
            kcalPer100g: roundTo((ingredient.calories / ingredient.gramsEquivalent) * 100, 0),
          }));

        for (const ingredient of manualIngredientsToSave) {
          await upsertFoodMutation.mutateAsync({
            name: ingredient.name,
            kcalPer100g: ingredient.kcalPer100g,
            proteinPer100g: 0,
            carbsPer100g: 0,
            fatsPer100g: 0,
            fiberPer100g: 0,
            sugarPer100g: 0,
            sodiumMgPer100g: 0,
            servingSizeLabel: '100g',
          });
        }

        const savedFood = await upsertFoodMutation.mutateAsync({
          name: values.foodName.trim(),
          kcalPer100g: Number(values.caloriesPer100g),
          proteinPer100g: incomingNutrition.proteinPer100g,
          carbsPer100g: incomingNutrition.carbsPer100g,
          fatsPer100g: incomingNutrition.fatsPer100g,
          fiberPer100g: incomingNutrition.fiberPer100g,
          sugarPer100g: incomingNutrition.sugarPer100g,
          sodiumMgPer100g: incomingNutrition.sodiumMgPer100g,
          servingSizeLabel: '100g',
        });

        if (shouldLogToday) {
          router.replace({
            pathname: '/dashboard/add-food',
            params: {
              foodName: savedFood.name,
              kcalPer100g: valueParam(savedFood.kcalPer100g),
              proteinPer100g: valueParam(savedFood.proteinPer100g),
              carbsPer100g: valueParam(savedFood.carbsPer100g),
              fatsPer100g: valueParam(savedFood.fatsPer100g),
              fiberPer100g: valueParam(savedFood.fiberPer100g),
              sugarPer100g: valueParam(savedFood.sugarPer100g),
              sodiumMgPer100g: valueParam(savedFood.sodiumMgPer100g),
            },
          });
          return;
        }

        router.back();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save custom food';
        setError('root', { message });
        console.error('[AddCustomFoodScreen.handleSaveCustomFood]', error);
      } finally {
        setSubmittingAction(null);
      }
    },
    [incomingNutrition, recipeIngredients, setError, upsertFoodMutation]
  );

  const previewCalories = Number(watch('caloriesPer100g') || 0);
  const summaryPanelClass = isDarkMode ? 'bg-surface-dark' : 'bg-primary/10';
  const summaryValueClass = isDarkMode ? 'text-white' : 'text-foreground';
  const summaryMutedClass = isDarkMode ? 'text-white/55' : 'text-muted-foreground';

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View
        className="bg-background/95 flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}>
        <Button variant="ghost" size="icon" className="h-10 w-10" onPress={() => router.back()}>
          <Icon as={ArrowLeft} className="text-foreground size-5" />
        </Button>
        <Text className="text-foreground flex-1 pr-10 text-center text-lg font-bold">
          Add Custom Food
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-4 py-6 pb-40">
        <View className={`${summaryPanelClass} rounded-lg p-5`}>
          <View className="flex-row items-center gap-3">
            <View className="bg-primary/15 h-12 w-12 items-center justify-center rounded-md">
              <Icon as={Utensils} className="text-primary size-6" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-primary text-xs font-extrabold tracking-wider uppercase">
                Custom Food
              </Text>
              <Text className={`${summaryValueClass} mt-1 text-lg font-black`}>
                Save & Log today
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-end justify-between">
            <View>
              <Text className={`${summaryMutedClass} text-[10px] font-bold uppercase`}>
                Calories per 100g
              </Text>
              <Text className={`${summaryValueClass} mt-1 text-4xl font-black tracking-tight`}>
                {formatNumberGrouped(Number.isFinite(previewCalories) ? previewCalories : 0)}
              </Text>
            </View>
            <Text className="text-primary mb-1 text-lg font-black">kcal</Text>
          </View>

          <Text className={`${summaryMutedClass} mt-4 text-sm leading-5`}>
            Build the recipe from raw ingredients, then use the computed calories per 100g for
            accurate logging.
          </Text>
        </View>

        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-muted-foreground text-center text-sm font-semibold tracking-[1.2px] uppercase">
              Food Details
            </Text>

            <View className="gap-4">
              <View className="gap-1.5">
                <Text className="text-foreground px-1 text-[15px] font-medium">Food Name</Text>
                <Controller
                  control={control}
                  name="foodName"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <Input
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="e.g. Homemade Chicken Adobo"
                      className="bg-input-bg h-13 rounded-md px-4 font-medium"
                      returnKeyType="next"
                    />
                  )}
                />
                <FieldError message={errors.foodName?.message} />
              </View>
            </View>
          </View>
        </View>

        <View className="gap-4 pt-1">
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-muted-foreground text-center text-sm font-semibold tracking-[1.2px] uppercase">
                  Recipe Calculator
                </Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  Add each raw ingredient and amount. Calories auto-fill from your local food
                  database.
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {recipeIngredients.map((ingredient, index) => (
                <View key={ingredient.id} className="bg-card rounded-md p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-foreground text-sm font-bold">
                      Ingredient {index + 1}
                    </Text>
                    <Pressable
                      className="bg-background-subtle h-8 w-8 items-center justify-center rounded-md"
                      onPress={() => removeIngredient(ingredient.id)}>
                      <Icon as={Trash2} className="text-muted-foreground size-4" />
                    </Pressable>
                  </View>

                  <View className="gap-3">
                    <Pressable
                      className="bg-input-bg h-12 flex-row items-center justify-between rounded-md px-4"
                      onPress={() => openFoodPicker(ingredient)}>
                      <Text
                        className={
                          ingredient.name
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground font-medium'
                        }>
                        {ingredient.name || 'Choose ingredient'}
                      </Text>
                      <Icon as={Search} className="text-muted-foreground size-4" />
                    </Pressable>
                    <View className="flex-row gap-3">
                      <Input
                        value={ingredient.amountValue}
                        onChangeText={(value) =>
                          updateIngredientField(ingredient.id, 'amountValue', value)
                        }
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        placeholder="Amount"
                        format="number"
                        maxNumericValue={99999}
                        className="bg-input-bg h-12 flex-1 rounded-md px-4"
                        returnKeyType="done"
                      />
                      <Pressable
                        className="bg-input-bg h-12 min-w-24 flex-row items-center justify-between rounded-md px-4"
                        onPress={() => setUnitPickerIngredientId(ingredient.id)}>
                        <Text className="text-foreground font-medium">{ingredient.amountUnit}</Text>
                        <Icon as={ChevronDown} className="text-muted-foreground size-4" />
                      </Pressable>
                    </View>

                    {ingredient.matchState === 'searching' ? (
                      <Text className="text-muted-foreground text-sm">Looking up calories...</Text>
                    ) : ingredient.matchedFood ? (
                      <View className="bg-primary/10 rounded-md px-3 py-2">
                        <Text className="text-foreground text-sm font-semibold">
                          {ingredient.matchedFood.name}
                        </Text>
                        <Text className="text-muted-foreground mt-1 text-xs">
                          {formatNumberGrouped(ingredient.matchedFood.kcalPer100g)} kcal per 100g
                          {ingredient.gramsEquivalent > 0
                            ? ` • ${formatNumberGrouped(ingredient.gramsEquivalent)} g • ~${formatNumberGrouped(ingredient.calories)} kcal`
                            : ''}
                        </Text>
                      </View>
                    ) : ingredient.matchState === 'unmatched' ? (
                      <View className="gap-3">
                        <Input
                          value={ingredient.manualCalories}
                          onChangeText={(value) =>
                            updateIngredientField(ingredient.id, 'manualCalories', value)
                          }
                          keyboardType="decimal-pad"
                          inputMode="decimal"
                          placeholder="Calories for this amount"
                          format="number"
                          maxNumericValue={99999}
                          className="bg-input-bg h-12 rounded-md px-4"
                          returnKeyType="done"
                        />
                        <Text className="text-muted-foreground text-sm">
                          Manual ingredient will also be saved to your food database when you save
                          this recipe.
                        </Text>
                        {ingredient.gramsEquivalent > 0 && ingredient.calories > 0 ? (
                          <View className="bg-primary/10 rounded-md px-3 py-2">
                            <Text className="text-foreground text-sm font-semibold">
                              {ingredient.name}
                            </Text>
                            <Text className="text-muted-foreground mt-1 text-xs">
                              {formatNumberGrouped(ingredient.gramsEquivalent)} g • ~
                              {formatNumberGrouped(ingredient.calories)} kcal • saves as ~
                              {formatNumberGrouped(
                                roundTo((ingredient.calories / ingredient.gramsEquivalent) * 100, 0)
                              )}{' '}
                              kcal per 100g
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text className="text-muted-foreground text-sm">
                        Choose an ingredient, then enter the amount to auto-fill calories.
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <Button variant="outline" className="h-11 rounded-md" onPress={addIngredient}>
              <Icon as={Plus} className="text-foreground size-4" />
              <Text>Add Ingredient</Text>
            </Button>

            <View className="bg-primary/10 rounded-md p-4">
              <Text className="text-primary text-sm font-bold">Recipe result</Text>
              <View className="mt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted-foreground text-sm">Total Calories</Text>
                  <Text className="text-foreground text-sm font-bold">
                    ~{formatNumberGrouped(recipeTotals.totalCalories)} kcal
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted-foreground text-sm">Total Weight</Text>
                  <Text className="text-foreground text-sm font-bold">
                    {formatNumberGrouped(recipeTotals.totalWeight)} g
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted-foreground text-sm">Calories per 100g</Text>
                  <Text className="text-foreground text-sm font-black">
                    ~{formatNumberGrouped(recipeTotals.caloriesPer100g)} kcal
                  </Text>
                </View>
              </View>
              <Text className="text-muted-foreground mt-3 text-xs leading-5">
                Formula: total calories / total weight x 100
              </Text>
              <Text className="text-muted-foreground mt-1 text-xs leading-5">
                Use grams or ml when you can. Spoon and cup units are estimates.
              </Text>
              <Button
                className="mt-3 h-11 rounded-md"
                disabled={recipeTotals.caloriesPer100g <= 0}
                onPress={applyRecipeCalories}>
                <Text>Use Recipe Calories</Text>
              </Button>
            </View>
          </View>

          <Text className="text-muted-foreground text-center text-sm font-semibold tracking-[1.2px] uppercase">
            Final Calories
          </Text>

          <View className="gap-4">
            <NumericField
              control={control}
              errors={errors}
              name="caloriesPer100g"
              label="Calories per 100g (kcal)"
              maxValue={100000}
            />
          </View>
        </View>

        <View className="bg-primary/10 flex-row items-start gap-3 rounded-md p-4">
          <View className="bg-primary/15 mt-0.5 h-7 w-7 items-center justify-center rounded-md">
            <Icon as={Info} className="text-primary size-4" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-muted-foreground text-sm leading-5">
              Tip: Total raw ingredient calories divided by total weight, then multiplied by 100,
              gives the most consistent calories per 100g for homemade dishes.
            </Text>
          </View>
        </View>

        {errors.root?.message ? (
          <View className="bg-destructive/10 rounded-md px-3 py-2">
            <Text className="text-destructive text-sm">{errors.root.message}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="bg-background/95 absolute inset-x-0 bottom-0 px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="h-13 flex-1 rounded-md"
            disabled={isSubmitting}
            onPress={handleSubmit((values) => {
              void handleSaveCustomFood(values, false);
            })}>
            <Text>{submittingAction === 'save' ? 'Saving...' : 'Save Food'}</Text>
          </Button>
          <Button
            variant="default"
            className="h-13 flex-1 rounded-md"
            disabled={isSubmitting}
            onPress={handleSubmit((values) => {
              void handleSaveCustomFood(values, true);
            })}>
            <Text>{submittingAction === 'save-log' ? 'Saving...' : 'Save & Log'}</Text>
          </Button>
        </View>
      </View>
      <ChoiceModal
        title="Choose Measure"
        open={unitPickerIngredientId != null}
        options={RECIPE_UNIT_OPTIONS}
        selected={ingredients.find((item) => item.id === unitPickerIngredientId)?.amountUnit ?? 'g'}
        optionLayout="pills"
        showFooterClose={false}
        onClose={() => setUnitPickerIngredientId(null)}
        onSelect={(value) => {
          if (!unitPickerIngredientId) return;
          updateIngredientUnit(unitPickerIngredientId, value);
        }}
      />
      <IngredientFoodPicker
        open={foodPickerIngredientId != null}
        query={foodPickerQuery}
        setQuery={setFoodPickerQuery}
        results={ingredientSearchResults}
        commonFoods={commonFoods}
        onClose={() => {
          setFoodPickerIngredientId(null);
          setFoodPickerQuery('');
        }}
        onPickFood={(food) => {
          if (!foodPickerIngredientId) return;
          selectIngredientFood(foodPickerIngredientId, food);
        }}
        onUseManual={(name) => {
          if (!foodPickerIngredientId) return;
          useManualIngredientName(foodPickerIngredientId, name);
        }}
      />
    </KeyboardAvoidingView>
  );
}
