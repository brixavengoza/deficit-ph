import { NativeModules, Platform } from 'react-native';

import type { NutritionLabelDraft } from '@/lib/nutrition-label-parser';

type NativeFoodLabelScanner = {
  scanNutritionLabel: () => Promise<{ rawText: string; draft?: Partial<NutritionLabelDraft> }>;
  recognizeNutritionLabelImage: (
    imageUri: string
  ) => Promise<{ rawText: string; draft?: Partial<NutritionLabelDraft> }>;
};

const nativeScanner = NativeModules.FoodLabelScanner as NativeFoodLabelScanner | undefined;

export async function scanNutritionLabel(): Promise<NutritionLabelDraft> {
  if (Platform.OS !== 'ios' || !nativeScanner?.scanNutritionLabel) {
    throw new Error('Nutrition label scanning is available on iOS with a custom dev build.');
  }

  const result = await nativeScanner.scanNutritionLabel();
  return parseScannerResult(result);
}

export async function uploadNutritionLabelImage(imageUri: string): Promise<NutritionLabelDraft> {
  if (Platform.OS !== 'ios' || !nativeScanner?.recognizeNutritionLabelImage) {
    throw new Error('Nutrition label upload is available on iOS with a custom dev build.');
  }

  const result = await nativeScanner.recognizeNutritionLabelImage(imageUri);
  return parseScannerResult(result);
}

function parseScannerResult(result: {
  rawText: string;
  draft?: Partial<NutritionLabelDraft>;
}): NutritionLabelDraft {
  if (!result.draft) {
    throw new Error('Apple Intelligence did not return a nutrition draft.');
  }

  return {
    foodName: result.draft.foodName ?? 'Scanned Food',
    servingSizeLabel: result.draft.servingSizeLabel ?? '1 serving',
    caloriesPer100g: numberOrZero(result.draft.caloriesPer100g),
    proteinPer100g: numberOrZero(result.draft.proteinPer100g),
    carbsPer100g: numberOrZero(result.draft.carbsPer100g),
    fatsPer100g: numberOrZero(result.draft.fatsPer100g),
    fiberPer100g: numberOrZero(result.draft.fiberPer100g),
    sugarPer100g: numberOrZero(result.draft.sugarPer100g),
    sodiumMgPer100g: numberOrZero(result.draft.sodiumMgPer100g),
    confidence: numberOrZero(result.draft.confidence),
    rawText: result.rawText,
  };
}

function numberOrZero(value: number | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}
