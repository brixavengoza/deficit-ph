import type { CalorieTargetGoal, CalorieTargetSex } from '@/utils/calorie-targets';

/**
 * Health-safety guardrails for the calorie-target + goal flow.
 *
 * This module centralises the domain math that decides whether a weight-loss goal
 * is appropriate for a given user. It is intentionally co-located with
 * `utils/calorie-targets.ts` (the nutrition-math source of truth per CLAUDE.md rule 6).
 *
 * IMPORTANT: every threshold here is a HEURISTIC — population-level guidance, NOT
 * individualized clinical advice. The exact numbers below (BMI cutoffs, minor age)
 * require licensed-dietitian / product-legal sign-off before they can be called
 * "clinically correct". The code is structured so those numbers live in one place.
 *
 * SCOPE / KNOWN LIMITATION: this guardrail assumes weight is in kg and height in cm
 * (which is what onboarding collects). Profile Body-Measurements editing has a
 * separate, pre-existing bug where Imperial inputs are stored raw without conversion
 * — until that is fixed, BMI is only trustworthy for metric users.
 */

// HEURISTIC — Asian / Filipino BMI cutoffs (WHO Asia-Pacific). These deliberately
// differ from the Western thresholds (overweight 25, obese 30) because health risk
// rises at a lower BMI for Asian populations. Needs licensed-dietitian confirmation.
export const BMI_CUTOFFS = {
  /** BMI below this is underweight. */
  underweightMax: 18.5,
  /** 18.5 – <23 is normal. */
  normalMax: 23,
  /** 23 – <27.5 is overweight; >=27.5 is obese. */
  overweightMax: 27.5,
} as const;

// HEURISTIC — anyone below this age is treated as a minor and cannot select a
// weight-loss goal. The exact age-13/guardian-gate policy is deferred to product+legal.
const MINOR_AGE = 18;

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese' | 'unknown';

/**
 * Compute BMI from weight (kg) and height (cm).
 *
 * Fail-safe: coerces both inputs with Number() and guards `Number.isFinite && > 0`
 * on BOTH before dividing. Returns null (never NaN/Infinity) when either is missing
 * or invalid, so callers must explicitly handle the "unknown" case.
 */
export function computeBmi(
  weightKg: number | string | null | undefined,
  heightCm: number | string | null | undefined
): number | null {
  const weight = Number(weightKg);
  const height = Number(heightCm);

  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(height) || height <= 0) return null;

  const heightM = height / 100;
  return weight / (heightM * heightM);
}

/**
 * Classify a BMI value into an Asia-Pacific category.
 *
 * Guards null / non-finite FIRST → 'unknown', so an unknown BMI never falls through
 * to a real category (which would produce a false gate or false badge).
 */
export function classifyBmi(bmi: number | null | undefined): BmiCategory {
  if (bmi === null || bmi === undefined || !Number.isFinite(bmi)) return 'unknown';
  if (bmi < BMI_CUTOFFS.underweightMax) return 'underweight';
  if (bmi < BMI_CUTOFFS.normalMax) return 'normal';
  if (bmi < BMI_CUTOFFS.overweightMax) return 'overweight';
  return 'obese';
}

/**
 * Is the user a minor?
 *
 * Fail-safe: a non-finite / unknown age must fail SAFE and be treated as a minor,
 * so we never unlock weight-loss gating for someone whose age we cannot verify.
 */
export function isMinor(age: number | string | null | undefined): boolean {
  const parsed = Number(age);
  if (!Number.isFinite(parsed)) return true;
  return parsed < MINOR_AGE;
}

export type GoalSafety = {
  /** The goal we recommend (drives the "Recommended for you" badge). null = no badge. */
  recommendedGoal: CalorieTargetGoal | null;
  /** Whether a 'lose' goal is permitted at all for this user. */
  allowLose: boolean;
  /** Whether the CURRENTLY selected goal must be blocked from proceeding. */
  block: boolean;
  /** Soft, non-blocking warning copy (Taglish) or null. */
  warning: string | null;
  bmiCategory: BmiCategory;
};

/**
 * Single source of truth that drives BOTH the dynamic "Recommended for you" badge
 * AND the block / warn logic on the goal screen. Because one function produces both,
 * the badge and the gate can never contradict each other.
 *
 * Inputs may be STRINGS (the onboarding form stores age/height/weight as z.string()),
 * so every numeric input is coerced internally — callers never have to pre-parse.
 *
 * Policy:
 *  - insufficient data (unknown age OR unknown BMI) → no gating, no badge. The
 *    calorie-target math itself returns null for missing/invalid inputs, so this is
 *    the safe default: never flash a false block/badge before data is available.
 *  - minor → recommend 'maintain', block 'lose'.
 *  - underweight adult → recommend 'gain', block 'lose'.
 *  - normal adult → recommend 'maintain', 'lose' allowed but with a soft warning.
 *  - overweight / obese adult → recommend 'lose'.
 */
export function evaluateGoalSafety(input: {
  age?: number | string | null;
  heightCm?: number | string | null;
  weightKg?: number | string | null;
  sex?: CalorieTargetSex | null;
  goal?: CalorieTargetGoal | null;
}): GoalSafety {
  const ageNum = Number(input.age);
  const ageKnown = Number.isFinite(ageNum) && ageNum > 0;
  const bmi = computeBmi(input.weightKg, input.heightCm);
  const bmiCategory = classifyBmi(bmi);

  // Insufficient data → no gating, no badge. (The calorie math returns null for the
  // same inputs, so submission is still blocked upstream — this just avoids a false
  // block/badge while onboarding data is loading.)
  if (!ageKnown || bmiCategory === 'unknown') {
    return {
      recommendedGoal: null,
      allowLose: true,
      block: false,
      warning: null,
      bmiCategory,
    };
  }

  // Known age → apply the minor gate. (isMinor itself still fails safe for any
  // direct caller that passes a non-finite age.)
  if (isMinor(ageNum)) {
    return {
      recommendedGoal: 'maintain',
      allowLose: false,
      block: input.goal === 'lose',
      warning: null,
      bmiCategory,
    };
  }

  switch (bmiCategory) {
    case 'underweight':
      return {
        recommendedGoal: 'gain',
        allowLose: false,
        block: input.goal === 'lose',
        warning: null,
        bmiCategory,
      };
    case 'normal':
      return {
        recommendedGoal: 'maintain',
        allowLose: true,
        block: false,
        warning:
          input.goal === 'lose'
            ? 'Nasa healthy weight range ka na, bestie! Okay lang mag-cut, pero gentle lang ha — Maintain is a solid choice din para sustainable. 💚'
            : null,
        bmiCategory,
      };
    case 'overweight':
    case 'obese':
    default:
      return {
        recommendedGoal: 'lose',
        allowLose: true,
        block: false,
        warning: null,
        bmiCategory,
      };
  }
}
