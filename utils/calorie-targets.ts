export type CalorieTargetActivity = 'sedentary' | 'light' | 'moderate' | 'very';
export type CalorieTargetGoal = 'lose' | 'maintain' | 'gain';
export type CalorieTargetSex = 'male' | 'female';

const ACTIVITY_FACTOR: Record<CalorieTargetActivity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

const GOAL_ADJUSTMENT: Record<CalorieTargetGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

// HEURISTIC — population guidance, NOT individualized clinical advice; requires
// licensed-dietitian sign-off. Sex-aware minimum only applies to a 'lose' goal so a
// cut is never dropped to an unsafely low intake. maintain/gain keep the absolute
// floor below (small users must not be inflated up to these numbers).
const MIN_DAILY_CALORIES: Record<CalorieTargetSex, number> = {
  female: 1200,
  male: 1500,
};

// Absolute lower bound for any goal (existing behaviour, kept for maintain/gain).
const ABSOLUTE_MIN_DAILY_CALORIES = 1200;

// NOTE: goal-appropriateness gating (minor / BMI-based block + warn) lives in the
// co-located `utils/health-guardrails.ts`. This file owns the raw calorie math;
// that file owns whether a given goal is safe to offer at all.

export type CalorieTargets = {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function calculateCalorieTargets(input: {
  activityLevel?: CalorieTargetActivity | null;
  age?: number | string | null;
  goal?: CalorieTargetGoal | null;
  heightCm?: number | string | null;
  sex?: CalorieTargetSex | null;
  weightKg?: number | string | null;
}): CalorieTargets | null {
  if (!input.goal || !input.sex || !input.activityLevel) return null;

  const age = Number(input.age);
  const heightCm = Number(input.heightCm);
  const weightKg = Number(input.weightKg);

  if (![age, heightCm, weightKg].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }

  const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = input.sex === 'male' ? bmrBase + 5 : bmrBase - 161;
  const tdee = bmr * ACTIVITY_FACTOR[input.activityLevel];

  const maintenanceCalories = Math.round(tdee);
  const rawTarget = Math.round(tdee + GOAL_ADJUSTMENT[input.goal]);

  let dailyCalories: number;
  if (input.goal === 'lose') {
    // Apply the sex-aware minimum, but a cut must NEVER exceed maintenance TDEE —
    // otherwise the raised floor would turn a deficit into a surplus for small/older
    // normal-BMI users (e.g. male 45kg/150cm/60y: maintenance 1311, floor 1500).
    const flooredLose = Math.max(rawTarget, MIN_DAILY_CALORIES[input.sex]);
    dailyCalories = Math.min(flooredLose, maintenanceCalories);
  } else {
    // maintain / gain: do not raise the floor for small users; keep the absolute min.
    dailyCalories = Math.max(ABSOLUTE_MIN_DAILY_CALORIES, rawTarget);
  }

  return { dailyCalories, ...deriveMacrosFromCalories(dailyCalories) };
}

/** The default 30/40/30 split for a given calorie total. Single source for auto macros. */
export function deriveMacrosFromCalories(dailyCalories: number): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const calories = Number(dailyCalories);
  if (!Number.isFinite(calories) || calories <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.4) / 4),
    fat: Math.round((calories * 0.3) / 9),
  };
}

// A manually-set daily calorie goal keeps the same hard safety floor the derived path enforces,
// so the app can never be configured into an unsafely low intake (CLAUDE.md rule 6).
export const MIN_MANUAL_CALORIE_GOAL = 1200;
export const MAX_MANUAL_CALORIE_GOAL = 10000;

export type ManualCalorieValidation =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function validateManualCalorieGoal(input: number | string): ManualCalorieValidation {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return { ok: false, error: 'Enter a number' };
  if (parsed < MIN_MANUAL_CALORIE_GOAL) {
    return { ok: false, error: `Must be at least ${MIN_MANUAL_CALORIE_GOAL} kcal for safety` };
  }
  if (parsed > MAX_MANUAL_CALORIE_GOAL) {
    return { ok: false, error: `Must be ${MAX_MANUAL_CALORIE_GOAL} or lower` };
  }
  return { ok: true, value: Math.round(parsed) };
}

// ---------------------------------------------------------------------------
// Target recompute + progress — pure, platform-agnostic helpers extracted so the
// safety-critical branching and the dashboard/progress rendering math can be unit-tested
// without a device or SQLite (iOS and Android share exactly this logic).
// ---------------------------------------------------------------------------

export type CalorieGoalModeInput = 'auto' | 'manual';
export type MacroTargetModeInput = 'auto' | 'custom';

/**
 * A `null` field means "user-owned — do not overwrite on recompute"; a number means
 * "write this value". This is the single decision point behind refreshCalorieTargets,
 * covering all four mode combinations (calorie auto/manual × macro auto/custom).
 */
export type TargetRecompute = {
  dailyCalorieGoal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export function resolveTargetRecompute(input: {
  calorieMode: CalorieGoalModeInput;
  macroMode: MacroTargetModeInput;
  /** Body-stat-derived, safety-gated daily calories. */
  derivedCalories: number;
  /** Currently persisted daily calorie goal (used when the calorie goal is manual). */
  storedCalories: number;
}): TargetRecompute {
  const calorieManual = input.calorieMode === 'manual';
  const macroCustom = input.macroMode === 'custom';

  // Auto macros track the EFFECTIVE goal: the user's manual value when manual, else derived.
  const validStored = Number.isFinite(input.storedCalories) && input.storedCalories > 0;
  const effectiveCalories =
    calorieManual && validStored ? input.storedCalories : input.derivedCalories;
  const macros = macroCustom ? null : deriveMacrosFromCalories(effectiveCalories);

  return {
    dailyCalorieGoal: calorieManual ? null : input.derivedCalories,
    protein: macros ? macros.protein : null,
    carbs: macros ? macros.carbs : null,
    fat: macros ? macros.fat : null,
  };
}

/** Progress percentage of a consumed value toward a target, capped 0–100. */
export function targetProgressPct(value: number, target: number): number {
  const consumed = Number(value);
  const goal = Number(target);
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(consumed) || consumed < 0) return 0;
  return Math.min(100, (consumed / goal) * 100);
}

// ---------------------------------------------------------------------------
// Custom macro targets (absolute grams) — safety-critical helpers.
//
// Per the macro-support PRD: custom gram macros are USER-OWNED and INDEPENDENT of the
// safety-gated daily calorie goal (they can never move it). These helpers own the only
// macro math for that feature: gram→calorie reconciliation (for a soft, non-blocking
// warning) and gram-target validation. No calorie floor is applied here — calories stay
// derived by `calculateCalorieTargets` above.
// ---------------------------------------------------------------------------

/** Upper bound for a single macro gram target — generous but blocks nonsensical input. */
export const MAX_MACRO_TARGET_G = 1000;

/** Default divergence tolerance for the soft reconciliation warning (fraction of calorie goal). */
export const MACRO_CALORIE_DIVERGENCE_TOLERANCE = 0.15;

export type CustomMacroGrams = { proteinG: number; carbsG: number; fatG: number };

/** Calories implied by gram macros (4/4/9). Returns 0 for any invalid/negative input. */
export function macroCaloriesFromGrams(proteinG: number, carbsG: number, fatG: number): number {
  const values = [Number(proteinG), Number(carbsG), Number(fatG)];
  if (!values.every((value) => Number.isFinite(value) && value >= 0)) return 0;
  const [protein, carbs, fat] = values;
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

export type MacroCalorieReconciliation = {
  /** Calories implied by the gram macros. */
  macroCalories: number;
  /** macroCalories - calorieGoal (positive = macros exceed the calorie goal). */
  deltaKcal: number;
  /** True when |deltaKcal| exceeds tolerance × calorieGoal (soft, non-blocking). */
  diverges: boolean;
};

/**
 * Compare gram macros against the (independent) daily calorie goal for a soft heads-up.
 * Never blocks; a non-positive/invalid calorie goal reports `diverges: false`.
 */
export function reconcileMacrosWithCalories(
  grams: CustomMacroGrams,
  calorieGoal: number,
  tolerance: number = MACRO_CALORIE_DIVERGENCE_TOLERANCE
): MacroCalorieReconciliation {
  const macroCalories = macroCaloriesFromGrams(grams.proteinG, grams.carbsG, grams.fatG);
  const goal = Number(calorieGoal);
  if (!Number.isFinite(goal) || goal <= 0) {
    return { macroCalories, deltaKcal: 0, diverges: false };
  }
  const deltaKcal = macroCalories - goal;
  return { macroCalories, deltaKcal, diverges: Math.abs(deltaKcal) > tolerance * goal };
}

export type CustomMacroValidation =
  | { ok: true; value: CustomMacroGrams }
  | { ok: false; errors: Partial<Record<keyof CustomMacroGrams, string>> };

/**
 * Validate user-entered gram targets: finite, non-negative, whole grams, within bounds.
 * The data layer calls this defensively so the UI can never persist nonsensical goals.
 */
export function validateCustomMacroGrams(input: {
  proteinG: number | string;
  carbsG: number | string;
  fatG: number | string;
}): CustomMacroValidation {
  const fields: (keyof CustomMacroGrams)[] = ['proteinG', 'carbsG', 'fatG'];
  const errors: Partial<Record<keyof CustomMacroGrams, string>> = {};
  const value: CustomMacroGrams = { proteinG: 0, carbsG: 0, fatG: 0 };

  for (const field of fields) {
    const parsed = Number(input[field]);
    if (!Number.isFinite(parsed)) {
      errors[field] = 'Enter a number';
    } else if (parsed < 0) {
      errors[field] = 'Must be 0 or higher';
    } else if (parsed > MAX_MACRO_TARGET_G) {
      errors[field] = `Must be ${MAX_MACRO_TARGET_G} or lower`;
    } else {
      value[field] = Math.round(parsed);
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}
