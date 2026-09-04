import { NativeModules, Platform } from 'react-native';

import {
  resolveScanDraft,
  type NutritionLabelDraft,
} from '@/lib/nutrition-label-parser';
import { recognizeTextFromImage } from '@/lib/ocr';

/**
 * Tiered nutrition-label reading.
 *
 * - `readNutritionLabelQuick` — OCR + the deterministic parser. Works on EVERY device
 *   with an OCR path (all supported iPhones via Apple Vision; Android via ML Kit). Fast
 *   enough for the live auto-detect loop.
 * - `readNutritionLabelImage` — the full read: on iOS it additionally asks the native
 *   bridge for an Apple-Intelligence draft (iOS 26 + eligible hardware) and merges it
 *   over the parser result; everywhere else (and whenever the generative tier fails)
 *   it degrades to the quick path. The scan NEVER fails just because the generative
 *   tier is unavailable — that bug hid the scanner's output from most devices.
 */

type ScanResultPayload = {
  rawText: string;
  draft?: Partial<NutritionLabelDraft>;
  /** Set by the native side when the generative parse failed but OCR succeeded. */
  generativeError?: string;
};

type NativeFoodLabelScanner = {
  recognizeNutritionLabelImage?: (imageUri: string) => Promise<ScanResultPayload>;
};

const nativeScanner = NativeModules.FoodLabelScanner as NativeFoodLabelScanner | undefined;

export async function readNutritionLabelQuick(imageUri: string): Promise<NutritionLabelDraft> {
  const rawText = await recognizeTextFromImage(imageUri);
  return resolveScanDraft(rawText);
}

export async function readNutritionLabelImage(imageUri: string): Promise<NutritionLabelDraft> {
  if (
    Platform.OS === 'ios' &&
    typeof nativeScanner?.recognizeNutritionLabelImage === 'function'
  ) {
    const result = await nativeScanner.recognizeNutritionLabelImage(imageUri);
    return resolveScanDraft(result.rawText, result.draft ?? null);
  }
  return readNutritionLabelQuick(imageUri);
}
