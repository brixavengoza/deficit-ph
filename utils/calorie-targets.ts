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
  const dailyCalories = Math.max(1200, Math.round(tdee + GOAL_ADJUSTMENT[input.goal]));

  return {
    dailyCalories,
    protein: Math.round((dailyCalories * 0.3) / 4),
    carbs: Math.round((dailyCalories * 0.4) / 4),
    fat: Math.round((dailyCalories * 0.3) / 9),
  };
}
