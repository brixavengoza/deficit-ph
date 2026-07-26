import { NativeModules, Platform } from 'react-native';

/**
 * AI capability layer — a single, typed contract for every on-device AI surface.
 *
 * WHY: the previous pattern (scan-label.tsx) reacted to a THROWN native error and then
 * string-matched the message to decide "not available". That is fragile and reactive.
 * This module lets screens decide capability PROACTIVELY and synchronously-where-possible,
 * so we never mount a camera / show a paid feature that then errors out.
 *
 * The scanner consumes this today; the future Smart/AI planner features consume the same
 * contract (see `AiFeature`) with no rework.
 *
 * HONESTY BOUNDARY (store-rejection red-team C2): the on-device generative model
 * (Apple FoundationModels) additionally requires iOS 26+ AND Apple-Intelligence-eligible
 * hardware. That deeper probe needs a native `checkAvailability()` method that is
 * intentionally DEFERRED to a later pass (adding native Swift is out of scope here).
 * Until it lands:
 *   - Module linkage is a sufficient gate for the FREE scanner (a failed attempt falls
 *     back gracefully to manual entry — no paywall, no reviewer-rejection risk).
 *   - Any IAP-GATED generative feature MUST NOT claim `generativeAvailable` from linkage
 *     alone; it must await the native probe and hard-hide the UI when ineligible.
 */

export type AiFeature = 'nutrition-scan' | 'meal-planner' | 'workout-planner';

export type AiCapabilityTier = 'generative' | 'ocr' | 'template' | 'unavailable';

export type AiUnavailableReason =
  | 'available'
  | 'unsupported-platform' // not iOS
  | 'module-not-linked' // native module not compiled into this build
  | 'requires-newer-os' // reserved for the deferred native probe (iOS < 26)
  | 'hardware-ineligible' // reserved for the deferred native probe (no Apple Intelligence)
  | 'model-unavailable' // reserved: model downloading / disabled
  | 'unknown';

export type AiCapability = {
  feature: AiFeature;
  tier: AiCapabilityTier;
  /** True only when an on-device generative attempt is permitted for this feature. */
  generativeAvailable: boolean;
  reason: AiUnavailableReason;
};

type NativeFoodLabelScanner = {
  scanNutritionLabel?: unknown;
  recognizeNutritionLabelImage?: unknown;
};

const nativeScanner = NativeModules.FoodLabelScanner as NativeFoodLabelScanner | undefined;

/**
 * Cheap, synchronous: is the native scanner module even compiled into this build?
 * Screens should call this BEFORE rendering any camera UI.
 */
export function isNutritionScannerLinked(): boolean {
  // Cross-platform: true wherever a native `FoodLabelScanner` module is linked (iOS today,
  // Android once its ML Kit module registers). Either capability — live scan or still-image
  // read — counts as "the scanner is available on this build".
  return (
    typeof nativeScanner?.scanNutritionLabel === 'function' ||
    typeof nativeScanner?.recognizeNutritionLabelImage === 'function'
  );
}

/**
 * Synchronous capability for the nutrition scanner. Safe to call in render.
 *
 * The scanner is a FREE feature, so native-module linkage (iOS or Android) is a sufficient gate
 * today: an ineligible device still fails safe at call time with a typed error and the screen
 * shows the manual-entry fallback.
 */
export function getNutritionScanCapability(): AiCapability {
  if (!isNutritionScannerLinked()) {
    // Mobile builds without the native module report `module-not-linked` (a custom dev build
    // adds it); web and any other platform can never link it, so they are `unsupported-platform`.
    const reason: AiUnavailableReason =
      Platform.OS === 'ios' || Platform.OS === 'android'
        ? 'module-not-linked'
        : 'unsupported-platform';
    return {
      feature: 'nutrition-scan',
      tier: 'unavailable',
      generativeAvailable: false,
      reason,
    };
  }

  // iOS parses the OCR'd label text with Apple FoundationModels (generative); Android reads the
  // label with ML Kit OCR + the shared TS parser (classic on-device ML). Both surface the same
  // scanner UI and the same editable draft, so callers only need to branch on `unavailable`.
  const isGenerative = Platform.OS === 'ios';
  return {
    feature: 'nutrition-scan',
    tier: isGenerative ? 'generative' : 'ocr',
    generativeAvailable: isGenerative,
    reason: 'available',
  };
}

/**
 * Synchronous capability for the planner features (meal / workout).
 *
 * Deliberately conservative until the native `checkAvailability()` probe lands: the
 * true generative tier is NOT claimed from linkage alone (see C2 note above), so callers
 * fall back to the free, rule-based "Smart" template tier — which works on every device
 * (the overwhelmingly Android PH audience included). When the native probe ships, this
 * upgrades to `generative` only on a positive eligibility signal.
 */
export function getPlannerCapability(feature: 'meal-planner' | 'workout-planner'): AiCapability {
  return {
    feature,
    tier: 'template',
    generativeAvailable: false,
    reason: isNutritionScannerLinked() ? 'model-unavailable' : 'module-not-linked',
  };
}
