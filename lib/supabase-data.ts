import { formatTimeLabelFromDate, parseTimeLabelToDate } from '@/utils/add-food-utils';
import { supabase } from '@/lib/supabase';

type AppUnits = 'Metric' | 'Imperial';
type AppTheme = 'Auto' | 'Light' | 'Dark';
type AppActivity = 'Sedentary' | 'Light' | 'Moderate' | 'Very Active';
type AppGoal = 'lose' | 'maintain' | 'gain';
type AppMeal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

type DbActivity = 'sedentary' | 'light' | 'moderate' | 'very';
type DbTheme = 'auto' | 'light' | 'dark';
type DbUnits = 'metric' | 'imperial';

const ACTIVITY_TO_DB: Record<AppActivity, DbActivity> = {
  Sedentary: 'sedentary',
  Light: 'light',
  Moderate: 'moderate',
  'Very Active': 'very',
};

const ACTIVITY_FROM_DB: Record<DbActivity, AppActivity> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  very: 'Very Active',
};

const THEME_TO_DB: Record<AppTheme, DbTheme> = {
  Auto: 'auto',
  Light: 'light',
  Dark: 'dark',
};

const THEME_FROM_DB: Record<DbTheme, AppTheme> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

const UNITS_TO_DB: Record<AppUnits, DbUnits> = {
  Metric: 'metric',
  Imperial: 'imperial',
};

const UNITS_FROM_DB: Record<DbUnits, AppUnits> = {
  metric: 'Metric',
  imperial: 'Imperial',
};

const USER_FOODS_LIMIT = 500;
const COMMON_SEED_FOODS_LIMIT = 24;
const FOOD_SEARCH_LIMIT = 50;
export const FREE_CUSTOM_FOODS_LIMIT = 10;

export type ProfileBundle = {
  fullName: string;
  username: string;
  email: string;
  age: string;
  height: string;
  weight: string;
  goalWeight: string;
  activityLevel: AppActivity;
  units: AppUnits;
  theme: AppTheme;
  notifications: boolean;
  calorieGoal: string;
  streakDays: string;
};

export type SavedFoodModel = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  servingSizeLabel?: string;
  source: 'user' | 'seed';
  createdAtIso: string;
  updatedAtIso: string;
};

export type LoggedFoodModel = {
  id: string;
  foodName: string;
  kcalPer100g: number;
  quantity: number;
  unit: 'grams' | 'oz' | 'servings';
  gramsEquivalent: number;
  meal: AppMeal;
  logTime: string;
  totalKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  consumedAtIso: string;
  createdAtIso: string;
};

export type OnboardingSubmitInput = {
  sex: 'male' | 'female';
  age: string;
  heightCm: string;
  weightKg: string;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very';
  goal: 'lose' | 'maintain' | 'gain';
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodLogWriteInput = {
  id?: string;
  foodId?: string | null;
  foodName: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  quantity: number;
  unit: 'grams' | 'oz' | 'servings';
  gramsEquivalent: number;
  meal: AppMeal;
  logTime: string;
  totalKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
};

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('No authenticated user.');
  return data.user;
}

export async function getPostAuthRoute(): Promise<'/onboarding/step-1' | '/dashboard'> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.onboarding_completed_at ? '/dashboard' : '/onboarding/step-1';
}

export async function completeOnboarding(input: OnboardingSubmitInput) {
  const user = await getCurrentUser();
  const fullNameFromAuth =
    typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  const usernameFromEmail = user.email ? user.email.split('@')[0] : null;

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      full_name: fullNameFromAuth,
      email: user.email ?? null,
      username: usernameFromEmail,
      age: toNumber(input.age),
      height_cm: toNumber(input.heightCm),
      start_weight_kg: toNumber(input.weightKg),
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (profileError) throw profileError;

  const { error: preferencesError } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      activity_level: input.activityLevel,
    },
    { onConflict: 'user_id' }
  );
  if (preferencesError) throw preferencesError;

  const { error: goalsError } = await supabase.from('user_goals').upsert(
    {
      user_id: user.id,
      goal: input.goal,
      goal_weight_kg: toNumber(input.weightKg),
      daily_calorie_goal: Math.round(input.dailyCalories),
      protein_target_g: input.protein,
      carbs_target_g: input.carbs,
      fat_target_g: input.fat,
    },
    { onConflict: 'user_id' }
  );
  if (goalsError) throw goalsError;
}

export async function loadProfileBundle(): Promise<ProfileBundle> {
  const user = await getCurrentUser();

  const [
    { data: profile, error: profileError },
    { data: preferences, error: preferencesError },
    { data: goals, error: goalsError },
    { data: latestWeight },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('user_goals').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('v_latest_weight').select('weight_kg').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profileError) throw profileError;
  if (preferencesError) throw preferencesError;
  if (goalsError) throw goalsError;

  return {
    fullName:
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ??
      '',
    username: profile?.username ?? user.email?.split('@')[0] ?? '',
    email: profile?.email ?? user.email ?? '',
    age: profile?.age != null ? String(profile.age) : '',
    height: profile?.height_cm != null ? String(profile.height_cm) : '',
    weight:
      latestWeight?.weight_kg != null
        ? String(latestWeight.weight_kg)
        : profile?.start_weight_kg != null
          ? String(profile.start_weight_kg)
          : '',
    goalWeight: goals?.goal_weight_kg != null ? String(goals.goal_weight_kg) : '',
    activityLevel:
      ACTIVITY_FROM_DB[(preferences?.activity_level as DbActivity | undefined) ?? 'moderate'],
    units: UNITS_FROM_DB[(preferences?.units as DbUnits | undefined) ?? 'metric'],
    theme: THEME_FROM_DB[(preferences?.theme as DbTheme | undefined) ?? 'auto'],
    notifications: preferences?.notifications_enabled ?? true,
    calorieGoal: goals?.daily_calorie_goal != null ? String(goals.daily_calorie_goal) : '0',
    streakDays: '0',
  };
}

export async function updatePersonalInfo(values: {
  fullName: string;
  username: string;
  email: string;
}) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      full_name: values.fullName.trim(),
      username: values.username.trim(),
      email: values.email.trim().toLowerCase(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

export async function updateBodyMeasurements(values: {
  height: string;
  weight: string;
  goalWeight: string;
}) {
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      height_cm: toNumber(values.height),
      start_weight_kg: toNumber(values.weight),
    },
    { onConflict: 'user_id' }
  );

  if (profileError) throw profileError;

  const { error: goalsError } = await supabase.from('user_goals').upsert(
    {
      user_id: user.id,
      goal_weight_kg: toNumber(values.goalWeight),
    },
    { onConflict: 'user_id' }
  );

  if (goalsError) throw goalsError;

  const { error: weightError } = await supabase.from('weight_logs').insert({
    user_id: user.id,
    weight_kg: toNumber(values.weight),
    logged_at: now,
  });

  if (weightError) throw weightError;
}

export async function updateUnits(units: AppUnits) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      units: UNITS_TO_DB[units],
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function updateTheme(theme: AppTheme) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      theme: THEME_TO_DB[theme],
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function updateNotifications(enabled: boolean) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      notifications_enabled: enabled,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function updateActivityLevel(level: AppActivity) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: user.id,
      activity_level: ACTIVITY_TO_DB[level],
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

function mapFoodRow(row: any): SavedFoodModel {
  return {
    id: row.id,
    name: row.name,
    kcalPer100g: toNumber(row.kcal_per_100g),
    proteinPer100g: toNumber(row.protein_per_100g),
    carbsPer100g: toNumber(row.carbs_per_100g),
    fatsPer100g: toNumber(row.fat_per_100g),
    servingSizeLabel: row.serving_size_label ?? undefined,
    source: row.source,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
  };
}

export async function fetchFoodsForSearch(): Promise<SavedFoodModel[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('owner_user_id', user.id)
    .eq('source', 'user')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(USER_FOODS_LIMIT);

  if (error) throw error;
  return (data ?? []).map(mapFoodRow);
}

export async function fetchCommonSeedFoods(): Promise<SavedFoodModel[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .is('owner_user_id', null)
    .eq('source', 'seed')
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(COMMON_SEED_FOODS_LIMIT);

  if (error) throw error;
  return (data ?? []).map(mapFoodRow);
}

export async function searchFoodsByName(query: string): Promise<SavedFoodModel[]> {
  const user = await getCurrentUser();
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (normalizedQuery.length < 2) return [];

  const escapedQuery = normalizedQuery.replace(/[%_\\]/g, '\\$&');
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .or(`owner_user_id.eq.${user.id},owner_user_id.is.null`)
    .is('deleted_at', null)
    .ilike('name', `%${escapedQuery}%`)
    .order('source', { ascending: false })
    .order('name', { ascending: true })
    .limit(FOOD_SEARCH_LIMIT);

  if (error) throw error;
  return (data ?? []).map(mapFoodRow);
}

export async function upsertUserFoodByName(input: {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  servingSizeLabel?: string;
  isPremiumUser?: boolean;
}): Promise<SavedFoodModel> {
  const user = await getCurrentUser();
  const normalizedName = input.name.trim();

  const { data: existing, error: findError } = await supabase
    .from('foods')
    .select('*')
    .eq('owner_user_id', user.id)
    .ilike('name', normalizedName)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('foods')
      .update({
        name: normalizedName,
        kcal_per_100g: input.kcalPer100g,
        protein_per_100g: input.proteinPer100g,
        carbs_per_100g: input.carbsPer100g,
        fat_per_100g: input.fatsPer100g,
        serving_size_label: emptyToNull(input.servingSizeLabel ?? ''),
        source: 'user',
        deleted_at: null,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) throw updateError;
    return mapFoodRow(updated);
  }

  if (!input.isPremiumUser) {
    const { count: customFoodCount, error: countError } = await supabase
      .from('foods')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', user.id)
      .eq('source', 'user')
      .is('deleted_at', null);

    if (countError) throw countError;
    if ((customFoodCount ?? 0) >= FREE_CUSTOM_FOODS_LIMIT) {
      throw new Error(
        `Free plan limit reached (${FREE_CUSTOM_FOODS_LIMIT} custom foods). Upgrade to Pro for unlimited custom foods.`
      );
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('foods')
    .insert({
      owner_user_id: user.id,
      name: normalizedName,
      kcal_per_100g: input.kcalPer100g,
      protein_per_100g: input.proteinPer100g,
      carbs_per_100g: input.carbsPer100g,
      fat_per_100g: input.fatsPer100g,
      serving_size_label: emptyToNull(input.servingSizeLabel ?? ''),
      source: 'user',
    })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return mapFoodRow(inserted);
}

function mapFoodLogRow(row: any): LoggedFoodModel {
  const unit = row.unit === 'oz' || row.unit === 'servings' ? row.unit : 'grams';
  return {
    id: row.id,
    foodName: row.food_name_snapshot,
    kcalPer100g: toNumber(row.kcal_per_100g_snapshot),
    quantity: toNumber(row.quantity),
    unit,
    gramsEquivalent: toNumber(row.grams_equivalent),
    meal: row.meal,
    logTime: formatTimeLabelFromDate(new Date(row.consumed_at)),
    totalKcal: toNumber(row.total_kcal),
    proteinGrams: toNumber(row.protein_g),
    carbsGrams: toNumber(row.carbs_g),
    fatsGrams: toNumber(row.fat_g),
    consumedAtIso: row.consumed_at,
    createdAtIso: row.created_at,
  };
}

export async function fetchFoodLogs(): Promise<LoggedFoodModel[]> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('consumed_at', { ascending: false })
    .limit(300);

  if (error) throw error;
  return (data ?? []).map(mapFoodLogRow);
}

function toConsumedAtIso(logTime: string) {
  return parseTimeLabelToDate(logTime, new Date()).toISOString();
}

export async function insertFoodLog(input: FoodLogWriteInput): Promise<LoggedFoodModel> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      food_id: input.foodId ?? null,
      food_name_snapshot: input.foodName,
      kcal_per_100g_snapshot: input.kcalPer100g,
      protein_per_100g_snapshot: input.proteinPer100g,
      carbs_per_100g_snapshot: input.carbsPer100g,
      fat_per_100g_snapshot: input.fatsPer100g,
      quantity: input.quantity,
      unit: input.unit,
      grams_equivalent: input.gramsEquivalent,
      meal: input.meal,
      consumed_at: toConsumedAtIso(input.logTime),
      total_kcal: input.totalKcal,
      protein_g: input.proteinGrams,
      carbs_g: input.carbsGrams,
      fat_g: input.fatsGrams,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapFoodLogRow(data);
}

export async function updateFoodLog(
  id: string,
  input: FoodLogWriteInput
): Promise<LoggedFoodModel> {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('food_logs')
    .update({
      food_id: input.foodId ?? null,
      food_name_snapshot: input.foodName,
      kcal_per_100g_snapshot: input.kcalPer100g,
      protein_per_100g_snapshot: input.proteinPer100g,
      carbs_per_100g_snapshot: input.carbsPer100g,
      fat_per_100g_snapshot: input.fatsPer100g,
      quantity: input.quantity,
      unit: input.unit,
      grams_equivalent: input.gramsEquivalent,
      meal: input.meal,
      consumed_at: toConsumedAtIso(input.logTime),
      total_kcal: input.totalKcal,
      protein_g: input.proteinGrams,
      carbs_g: input.carbsGrams,
      fat_g: input.fatsGrams,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw error;
  return mapFoodLogRow(data);
}

export async function softDeleteFoodLog(id: string) {
  const user = await getCurrentUser();
  const { error } = await supabase
    .from('food_logs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) throw error;
}

export async function addWeightLog(weightKg: number, note?: string) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('weight_logs').insert({
    user_id: user.id,
    weight_kg: weightKg,
    logged_at: new Date().toISOString(),
    note: note ? note.trim() : null,
  });

  if (error) throw error;
}

export async function addHydrationLog(volumeMl: number, source = 'quick-add') {
  const user = await getCurrentUser();
  const { error } = await supabase.from('hydration_logs').insert({
    user_id: user.id,
    volume_ml: Math.round(volumeMl),
    logged_at: new Date().toISOString(),
    source,
  });

  if (error) throw error;
}

export async function getTodayHydrationMl(): Promise<number> {
  const user = await getCurrentUser();
  const localDay = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('v_daily_hydration_summary')
    .select('total_volume_ml')
    .eq('user_id', user.id)
    .eq('local_day', localDay)
    .maybeSingle();

  if (error) throw error;
  return data?.total_volume_ml ?? 0;
}

export type DashboardDaySnapshot = {
  localDay: string;
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  hydrationMl: number;
  weightKg: number | null;
  hasEntries: boolean;
};

export type HomeDashboardSnapshot = {
  userName: string;
  goalKcal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  hydrationTargetMl: number;
  days: DashboardDaySnapshot[];
  currentWeightKg: number | null;
  weightDeltaKg: number;
  weightTrend: number[];
};

export type ProgressSnapshot = {
  currentStreak: number;
  streakDays: Array<{ localDay: string; completed: boolean }>;
  weeklyIntake: {
    goalKcal: number;
    avgKcal: number;
    days: Array<{ localDay: string; label: string; kcal: number }>;
  };
  adherence: {
    calorieHitRate: number;
    hydrationHitRate: number;
    weighInConsistency: number;
  };
  weeklySummary: {
    averageDeficitKcal: number;
    avgWaterLiters: number;
    trackedMeals: number;
    lowestWeightKg: number | null;
  };
  weight: {
    series: number[];
    startKg: number | null;
    currentKg: number | null;
    lostKg: number;
  };
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDateKeys(count: number): string[] {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(today);
    const daysBack = count - 1 - index;
    next.setDate(today.getDate() - daysBack);
    return localDateKey(next);
  });
}

function weekdayShortFromKey(key: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${key}T00:00:00`));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeCurrentStreak(keys: string[], completionMap: Map<string, boolean>) {
  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    if (!completionMap.get(keys[i]!)) break;
    streak += 1;
  }
  return streak;
}

export async function fetchHomeDashboardSnapshot(dayCount = 7): Promise<HomeDashboardSnapshot> {
  const user = await getCurrentUser();
  const dateKeys = buildDateKeys(dayCount);
  const startKey = dateKeys[0]!;

  const [
    { data: profile, error: profileError },
    { data: goals, error: goalsError },
    { data: nutrition, error: nutritionError },
    { data: hydration, error: hydrationError },
    { data: weights, error: weightsError },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('user_goals')
      .select('daily_calorie_goal, protein_target_g, carbs_target_g, fat_target_g')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('v_daily_nutrition_summary')
      .select('local_day, total_kcal, total_protein_g, total_carbs_g, total_fat_g')
      .eq('user_id', user.id)
      .gte('local_day', startKey)
      .order('local_day', { ascending: true }),
    supabase
      .from('v_daily_hydration_summary')
      .select('local_day, total_volume_ml')
      .eq('user_id', user.id)
      .gte('local_day', startKey)
      .order('local_day', { ascending: true }),
    supabase
      .from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('logged_at', { ascending: true })
      .limit(300),
  ]);

  if (profileError) throw profileError;
  if (goalsError) throw goalsError;
  if (nutritionError) throw nutritionError;
  if (hydrationError) throw hydrationError;
  if (weightsError) throw weightsError;

  const nutritionMap = new Map<string, any>();
  for (const row of nutrition ?? []) nutritionMap.set(String(row.local_day), row);

  const hydrationMap = new Map<string, any>();
  for (const row of hydration ?? []) hydrationMap.set(String(row.local_day), row);

  const weightByDay = new Map<string, number>();
  for (const row of weights ?? []) {
    const key = localDateKey(new Date(row.logged_at));
    weightByDay.set(key, toNumber(row.weight_kg));
  }

  let runningWeight: number | null = null;
  const days: DashboardDaySnapshot[] = dateKeys.map((key) => {
    if (weightByDay.has(key)) {
      runningWeight = weightByDay.get(key)!;
    }

    const nutritionRow = nutritionMap.get(key);
    const hydrationRow = hydrationMap.get(key);
    const totalKcal = toNumber(nutritionRow?.total_kcal);
    const proteinG = toNumber(nutritionRow?.total_protein_g);
    const carbsG = toNumber(nutritionRow?.total_carbs_g);
    const fatG = toNumber(nutritionRow?.total_fat_g);
    const hydrationMl = toNumber(hydrationRow?.total_volume_ml);

    return {
      localDay: key,
      totalKcal,
      proteinG,
      carbsG,
      fatG,
      hydrationMl,
      weightKg: runningWeight,
      hasEntries: totalKcal > 0 || hydrationMl > 0 || runningWeight != null,
    };
  });

  const weightSeries = (weights ?? [])
    .map((row) => toNumber(row.weight_kg))
    .filter((value) => value > 0);
  const trendSlice = weightSeries.slice(-6);
  const currentWeightKg = trendSlice.length ? trendSlice[trendSlice.length - 1]! : null;
  const previousWeightKg =
    trendSlice.length > 1 ? trendSlice[trendSlice.length - 2]! : currentWeightKg;
  const weightDeltaKg =
    currentWeightKg != null && previousWeightKg != null
      ? Number((currentWeightKg - previousWeightKg).toFixed(1))
      : 0;

  return {
    userName:
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : 'Trackk User'),
    goalKcal: Math.max(1200, toNumber(goals?.daily_calorie_goal) || 2000),
    proteinTargetG: Math.max(1, toNumber(goals?.protein_target_g) || 120),
    carbsTargetG: Math.max(1, toNumber(goals?.carbs_target_g) || 220),
    fatTargetG: Math.max(1, toNumber(goals?.fat_target_g) || 70),
    hydrationTargetMl: 2500,
    days,
    currentWeightKg,
    weightDeltaKg,
    weightTrend: trendSlice.length ? trendSlice : [0],
  };
}

export async function fetchProgressSnapshot(): Promise<ProgressSnapshot> {
  const user = await getCurrentUser();
  const [home, logs, weights, streakRows] = await Promise.all([
    fetchHomeDashboardSnapshot(21),
    supabase
      .from('food_logs')
      .select('id, consumed_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('consumed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: true }),
    supabase
      .from('v_streak_tracking_days')
      .select('local_day, event_count')
      .eq('user_id', user.id)
      .gte('local_day', buildDateKeys(21)[0]!),
  ]);

  if (logs.error) throw logs.error;
  if (weights.error) throw weights.error;
  if (streakRows.error) throw streakRows.error;

  const streakCompletionMap = new Map<string, boolean>();
  for (const key of home.days.map((day) => day.localDay)) {
    streakCompletionMap.set(key, false);
  }
  for (const row of streakRows.data ?? []) {
    streakCompletionMap.set(String(row.local_day), toNumber(row.event_count) > 0);
  }

  const streakKeys = home.days.map((day) => day.localDay);
  const currentStreak = computeCurrentStreak(streakKeys, streakCompletionMap);

  const weeklyDays = home.days.slice(-7);
  const weeklyCalories = weeklyDays.map((day) => day.totalKcal);
  const avgKcal =
    weeklyCalories.length > 0
      ? Math.round(weeklyCalories.reduce((sum, value) => sum + value, 0) / weeklyCalories.length)
      : 0;

  const calorieHits = weeklyDays.filter((day) => {
    if (day.totalKcal <= 0) return false;
    const ratio = day.totalKcal / home.goalKcal;
    return ratio >= 0.9 && ratio <= 1.1;
  }).length;

  const hydrationHits = weeklyDays.filter(
    (day) => day.hydrationMl >= home.hydrationTargetMl
  ).length;
  const weighInDays = new Set(
    (weights.data ?? []).map((row) => localDateKey(new Date(row.logged_at)))
  );

  const weekWeightValues = (weights.data ?? [])
    .map((row) => toNumber(row.weight_kg))
    .filter((value) => value > 0);
  const lowestWeightKg = weekWeightValues.length ? Math.min(...weekWeightValues) : null;

  const weightSeries = home.weightTrend.filter((value) => value > 0);
  const startKg = weightSeries.length ? weightSeries[0]! : null;
  const currentKg = weightSeries.length ? weightSeries[weightSeries.length - 1]! : null;

  return {
    currentStreak,
    streakDays: home.days.map((day) => ({
      localDay: day.localDay,
      completed: streakCompletionMap.get(day.localDay) ?? false,
    })),
    weeklyIntake: {
      goalKcal: home.goalKcal,
      avgKcal,
      days: weeklyDays.map((day) => ({
        localDay: day.localDay,
        label: weekdayShortFromKey(day.localDay),
        kcal: Math.round(day.totalKcal),
      })),
    },
    adherence: {
      calorieHitRate: clampPercent((calorieHits / Math.max(weeklyDays.length, 1)) * 100),
      hydrationHitRate: clampPercent((hydrationHits / Math.max(weeklyDays.length, 1)) * 100),
      weighInConsistency: clampPercent((weighInDays.size / 7) * 100),
    },
    weeklySummary: {
      averageDeficitKcal: Math.round(home.goalKcal - avgKcal),
      avgWaterLiters:
        weeklyDays.length > 0
          ? Number(
              (
                weeklyDays.reduce((sum, day) => sum + day.hydrationMl, 0) /
                weeklyDays.length /
                1000
              ).toFixed(1)
            )
          : 0,
      trackedMeals: (logs.data ?? []).length,
      lowestWeightKg,
    },
    weight: {
      series: weightSeries.length ? weightSeries : [0],
      startKg,
      currentKg,
      lostKg: startKg != null && currentKg != null ? Number((startKg - currentKg).toFixed(1)) : 0,
    },
  };
}
