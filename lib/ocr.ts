import { NativeModules, Platform } from 'react-native';

/**
 * Unified on-device OCR — the UNIVERSAL scanning tier.
 *
 * iOS: Apple Vision via the existing `FoodLabelScanner` Swift bridge (zero dependencies,
 * every iPhone this app supports). Android: ML Kit Text Recognition (Latin, bundled,
 * offline) via the Infinite Red Expo module — which is excluded from the iOS build in
 * package.json `expo.autolinking.apple.exclude` so the ~38 MB GoogleMLKit pods never
 * ship on iOS.
 *
 * The generative (Apple Intelligence) tier lives in `lib/food-label-scanner.ts`; this
 * module is intentionally OCR-only so the live auto-detect loop stays fast everywhere.
 */

type IosFoodLabelScanner = {
  recognizeText?: (imageUri: string) => Promise<{ rawText: string }>;
  recognizeNutritionLabelImage?: (imageUri: string) => Promise<{ rawText: string }>;
};

type AndroidMlkitTextRecognition = {
  recognizeText: (imagePath: string) => Promise<{ text: string }>;
};

function getIosScanner(): IosFoodLabelScanner | undefined {
  return NativeModules.FoodLabelScanner as IosFoodLabelScanner | undefined;
}

function getAndroidOcrModule(): AndroidMlkitTextRecognition | null {
  if (Platform.OS !== 'android') return null;
  try {
    // Lazy on purpose: the package calls `requireNativeModule` at import time and THROWS
    // in builds without the native module (Expo Go, Jest, iOS via the autolink exclusion).
    const mlkit = require('@infinitered/react-native-mlkit-text-recognition') as Partial<
      AndroidMlkitTextRecognition
    >;
    return typeof mlkit.recognizeText === 'function'
      ? (mlkit as AndroidMlkitTextRecognition)
      : null;
  } catch {
    return null;
  }
}

/** Synchronous: can this build run on-device OCR at all? Safe to call in render. */
export function isOcrLinked(): boolean {
  if (Platform.OS === 'android') return getAndroidOcrModule() != null;
  if (Platform.OS === 'ios') {
    const scanner = getIosScanner();
    return (
      typeof scanner?.recognizeText === 'function' ||
      typeof scanner?.recognizeNutritionLabelImage === 'function'
    );
  }
  return false;
}

/** OCR a still image into raw text. Throws a typed Error when no OCR path is linked. */
export async function recognizeTextFromImage(imageUri: string): Promise<string> {
  if (Platform.OS === 'android') {
    const mlkit = getAndroidOcrModule();
    if (!mlkit) {
      throw new Error('Text recognition needs a custom dev build with the ML Kit module.');
    }
    const result = await mlkit.recognizeText(imageUri);
    return result.text ?? '';
  }

  const scanner = getIosScanner();
  if (typeof scanner?.recognizeText === 'function') {
    const result = await scanner.recognizeText(imageUri);
    return result.rawText ?? '';
  }
  // Older custom builds predate the fast Vision-only method — the combined method also
  // returns the OCR text (and never fails just because the generative tier is missing).
  if (typeof scanner?.recognizeNutritionLabelImage === 'function') {
    const result = await scanner.recognizeNutritionLabelImage(imageUri);
    return result.rawText ?? '';
  }
  throw new Error('Text recognition needs a custom dev build with the scanner module.');
}
