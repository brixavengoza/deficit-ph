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

  return {
    dailyCalories,
    protein: Math.round((dailyCalories * 0.3) / 4),
    carbs: Math.round((dailyCalories * 0.4) / 4),
    fat: Math.round((dailyCalories * 0.3) / 9),
  };
}
