import { NativeModules } from 'react-native';

import type { NutritionLabelDraft } from '@/lib/nutrition-label-parser';

type NativeFoodLabelScanner = {
  scanNutritionLabel: () => Promise<{ rawText: string; draft?: Partial<NutritionLabelDraft> }>;
  recognizeNutritionLabelImage: (
    imageUri: string
  ) => Promise<{ rawText: string; draft?: Partial<NutritionLabelDraft> }>;
};

const nativeScanner = NativeModules.FoodLabelScanner as NativeFoodLabelScanner | undefined;

export async function scanNutritionLabel(): Promise<NutritionLabelDraft> {
  // Platform-agnostic: works wherever a native `FoodLabelScanner` module exposing this method is
  // linked (iOS live VisionKit scan today; an Android module can register the same method name).
  if (!nativeScanner || typeof nativeScanner.scanNutritionLabel !== 'function') {
    throw new Error('Live nutrition-label scanning needs a custom dev build with the scanner module.');
  }

  const result = await nativeScanner.scanNutritionLabel();
  return parseScannerResult(result);
}

export async function uploadNutritionLabelImage(imageUri: string): Promise<NutritionLabelDraft> {
  // Reads nutrition text from a still image. iOS uses Vision OCR; an Android module can register
  // the same method backed by ML Kit Text Recognition, feeding the same shared parser.
  if (!nativeScanner || typeof nativeScanner.recognizeNutritionLabelImage !== 'function') {
    throw new Error('Nutrition-label reading needs a custom dev build with the scanner module.');
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
