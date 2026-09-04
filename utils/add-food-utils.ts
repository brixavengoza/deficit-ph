export const TIME_INPUT_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
export const OUNCES_TO_GRAMS = 28.3495;
export const DEFAULT_SERVING_GRAMS = 100;

type PercentString = `${number}%`;

export type AddFoodUnitOption = 'grams' | 'ml' | 'oz' | 'servings';
export type RecipeIngredientUnitOption = 'g' | 'ml' | 'tsp' | 'tbsp' | 'cup';

export type FoodMacroProfile = {
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
};

const FOOD_MACRO_PROFILES: Record<string, FoodMacroProfile> = {
  'chicken breast (grilled)': { proteinPer100g: 31, carbsPer100g: 0, fatsPer100g: 3.6 },
  'grilled chicken breast': { proteinPer100g: 31, carbsPer100g: 0, fatsPer100g: 3.6 },
  'white rice (cooked)': { proteinPer100g: 2.7, carbsPer100g: 28, fatsPer100g: 0.3 },
  'egg (large, boiled)': { proteinPer100g: 13, carbsPer100g: 1.1, fatsPer100g: 11 },
  'salmon fillet': { proteinPer100g: 22, carbsPer100g: 0, fatsPer100g: 13 },
  'tuna sandwich': { proteinPer100g: 12, carbsPer100g: 21, fatsPer100g: 10 },
  'caesar salad': { proteinPer100g: 7, carbsPer100g: 8, fatsPer100g: 14 },
  'pasta (spaghetti)': { proteinPer100g: 5.8, carbsPer100g: 31, fatsPer100g: 0.9 },
  'beef stir fry': { proteinPer100g: 18, carbsPer100g: 7, fatsPer100g: 8 },
  avocado: { proteinPer100g: 2, carbsPer100g: 9, fatsPer100g: 15 },
  oatmeal: { proteinPer100g: 2.4, carbsPer100g: 12, fatsPer100g: 1.4 },
  banana: { proteinPer100g: 1.1, carbsPer100g: 23, fatsPer100g: 0.3 },
  'greek yogurt (plain)': { proteinPer100g: 10, carbsPer100g: 3.6, fatsPer100g: 0.4 },
  'rolled oats': { proteinPer100g: 16.9, carbsPer100g: 66.3, fatsPer100g: 6.9 },
  'protein shake': { proteinPer100g: 20, carbsPer100g: 5, fatsPer100g: 2 },
};

export function roundTo(value: number, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatFoodTitle(foodNameParam?: string | string[]) {
  if (!foodNameParam) return 'Selected Food';
  return Array.isArray(foodNameParam) ? foodNameParam[0] : foodNameParam;
}

export function parseKcalPer100g(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function resolveMacroProfile(foodName: string, kcalPer100g: number): FoodMacroProfile {
  const normalizedName = foodName.trim().toLowerCase();
  const direct = FOOD_MACRO_PROFILES[normalizedName];
  if (direct) return direct;

  if (normalizedName.includes('chicken')) return FOOD_MACRO_PROFILES['grilled chicken breast'];
  if (normalizedName.includes('rice')) return FOOD_MACRO_PROFILES['white rice (cooked)'];
  if (normalizedName.includes('egg')) return FOOD_MACRO_PROFILES['egg (large, boiled)'];

  const proteinCalories = kcalPer100g * 0.35;
  const carbCalories = kcalPer100g * 0.4;
  const fatCalories = kcalPer100g * 0.25;

  return {
    proteinPer100g: roundTo(proteinCalories / 4, 1),
    carbsPer100g: roundTo(carbCalories / 4, 1),
    fatsPer100g: roundTo(fatCalories / 9, 1),
    fiberPer100g: 0,
    sugarPer100g: 0,
    sodiumMgPer100g: 0,
  };
}

/**
 * Extract an explicit gram (or ml, treated 1:1 like the rest of the app) weight from a
 * serving-size label, e.g. "1 can (155g)" -> 155, "1 tbsp (15ml)" -> 15, "100g" -> 100.
 * Volume-only labels ("1 cup", "1 tbsp") deliberately return null — density varies per
 * food, so guessing grams there would corrupt logged nutrition (CLAUDE.md rule 6).
 */
export function parseServingGramsFromLabel(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
  if (!match) return null;
  const grams = Number(match[1]);
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

export function convertQuantityToGrams(
  quantity: number,
  unit: AddFoodUnitOption,
  servingGrams?: number | null
) {
  if (unit === 'grams') return quantity;
  if (unit === 'ml') return quantity;
  if (unit === 'oz') return quantity * OUNCES_TO_GRAMS;
  const perServing =
    servingGrams != null && Number.isFinite(servingGrams) && servingGrams > 0
      ? servingGrams
      : DEFAULT_SERVING_GRAMS;
  return quantity * perServing;
}

export function convertRecipeQuantityToGrams(quantity: number, unit: RecipeIngredientUnitOption) {
  if (unit === 'g') return quantity;
  if (unit === 'ml') return quantity;
  if (unit === 'tsp') return quantity * 5;
  if (unit === 'tbsp') return quantity * 15;
  return quantity * 240;
}

export function normalizeTimeInput(value: string) {
  const trimmed = value.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = trimmed.match(TIME_INPUT_REGEX);
  if (!match) return trimmed;
  const [, hh, mm, meridiem] = match;
  return `${hh}:${mm} ${meridiem}`;
}

export function getMacroBarWidth(percent: number): PercentString {
  const safe = Math.max(6, Math.min(100, percent));
  return `${safe}%` as PercentString;
}

export function formatTimeLabelFromDate(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = String(hours);
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${meridiem}`;
}

export function parseTimeLabelToDate(value: string, baseDate = new Date()) {
  const normalized = normalizeTimeInput(value);
  const match = normalized.match(TIME_INPUT_REGEX);
  if (!match) return baseDate;

  const [, hhRaw, mmRaw, meridiem] = match;
  let hours = Number(hhRaw) % 12;
  if (meridiem.toUpperCase() === 'PM') hours += 12;

  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, Number(mmRaw), 0, 0);
  return nextDate;
}
