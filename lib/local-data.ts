import * as SQLite from 'expo-sqlite';

import { SEED_FOODS } from '@/lib/local-seed-foods';
import {
  formatTimeLabelFromDate,
  parseServingGramsFromLabel,
  parseTimeLabelToDate,
} from '@/utils/add-food-utils';
import {
  calculateCalorieTargets,
  deriveMacrosFromCalories,
  resolveTargetRecompute,
  validateCustomMacroGrams,
  validateManualCalorieGoal,
} from '@/utils/calorie-targets';
import { evaluateGoalSafety } from '@/utils/health-guardrails';
import { heightInputToCm, weightInputToKg } from '@/utils/units';

// Bump only for ADDITIVE migrations. RULE (data-loss red-team): never run a destructive
// table rebuild (e.g. widening a CHECK) via the additive helpers below. Any rebuild must
// live in a versioned branch that runs inside a transaction, verifies row-count before
// DROP, and bumps this constant.
const SCHEMA_VERSION = 4;

type AppUnits = 'Metric' | 'Imperial';
type AppTheme = 'Auto' | 'Light' | 'Dark';
type AppActivity = 'Sedentary' | 'Light' | 'Moderate' | 'Very Active';
type AppGoal = 'lose' | 'maintain' | 'gain';
type AppGoalLabel = 'Lose Weight' | 'Maintain Weight' | 'Gain Weight';

const GOAL_TO_DB: Record<AppGoalLabel, AppGoal> = {
  'Lose Weight': 'lose',
  'Maintain Weight': 'maintain',
  'Gain Weight': 'gain',
};
const GOAL_FROM_DB: Record<AppGoal, AppGoalLabel> = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Weight',
};
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

const COMMON_SEED_FOODS_LIMIT = 24;
const FOOD_SEARCH_LIMIT = 50;
const LOCAL_USER_ID = 'local-user';

export type ProfileBundle = {
  fullName: string;
  username: string;
  email: string;
  profilePhotoUri: string;
  age: string;
  height: string;
  weight: string;
  goalWeight: string;
  activityLevel: AppActivity;
  goal: AppGoalLabel;
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
  fiberPer100g: number;
  sugarPer100g: number;
  sodiumMgPer100g: number;
  servingSizeLabel?: string;
  /** Grams in ONE serving (explicit column, else parsed from the label, e.g. "1 can (155g)"). */
  servingGrams?: number;
  source: 'user' | 'seed';
  createdAtIso: string;
  updatedAtIso: string;
};

export type LoggedFoodModel = {
  id: string;
  foodName: string;
  kcalPer100g: number;
  // Per-100g snapshots carried alongside the entry so an edit re-seeds from the REAL
  // logged macros instead of re-fabricating a synthetic split (see add-food.tsx).
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  sodiumMgPer100g: number;
  quantity: number;
  unit: 'grams' | 'ml' | 'oz' | 'servings';
  gramsEquivalent: number;
  meal: AppMeal;
  logTime: string;
  totalKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams: number;
  sugarGrams: number;
  sodiumMg: number;
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
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
  quantity: number;
  unit: 'grams' | 'ml' | 'oz' | 'servings';
  gramsEquivalent: number;
  meal: AppMeal;
  logTime: string;
  totalKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams?: number;
  sugarGrams?: number;
  sodiumMg?: number;
};

type ProfileRow = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  profile_photo_uri: string | null;
  sex: 'male' | 'female' | null;
  age: number | null;
  height_cm: number | null;
  start_weight_kg: number | null;
  onboarding_completed_at: string | null;
};

type PreferencesRow = {
  activity_level: DbActivity | null;
  units: DbUnits | null;
  theme: DbTheme | null;
  notifications_enabled: number | null;
};

type GoalsRow = {
  goal: AppGoal | null;
  goal_weight_kg: number | null;
  daily_calorie_goal: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  macro_target_mode: string | null;
  calorie_goal_mode: string | null;
};

type FoodRow = {
  id: string;
  name: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  serving_size_label: string | null;
  serving_grams: number | null;
  source: 'user' | 'seed';
  created_at: string;
  updated_at: string;
};

type FoodLogRow = {
  id: string;
  food_name_snapshot: string;
  kcal_per_100g_snapshot: number;
  protein_per_100g_snapshot: number;
  carbs_per_100g_snapshot: number;
  fat_per_100g_snapshot: number;
  fiber_per_100g_snapshot: number | null;
  sugar_per_100g_snapshot: number | null;
  sodium_mg_per_100g_snapshot: number | null;
  quantity: number;
  unit: string;
  grams_equivalent: number;
  meal: AppMeal;
  consumed_at: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: string;
};

type WeightRow = {
  logged_at: string;
  weight_kg: number;
};

type HydrationRow = {
  local_day: string;
  total_volume_ml: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedFoodId(name: string) {
  return `seed-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

async function getDb() {
  dbPromise ??= openAndPrepareDb();
  return dbPromise;
}

async function openAndPrepareDb() {
  const db = await SQLite.openDatabaseAsync('deficitph-local.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT,
      username TEXT,
      email TEXT,
      profile_photo_uri TEXT,
      sex TEXT,
      age INTEGER,
      height_cm REAL,
      start_weight_kg REAL,
      onboarding_completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activity_level TEXT NOT NULL DEFAULT 'moderate',
      units TEXT NOT NULL DEFAULT 'metric',
      theme TEXT NOT NULL DEFAULT 'auto',
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_goals (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      goal TEXT NOT NULL DEFAULT 'lose',
      goal_weight_kg REAL,
      daily_calorie_goal INTEGER NOT NULL DEFAULT 2000,
      protein_target_g INTEGER NOT NULL DEFAULT 120,
      carbs_target_g INTEGER NOT NULL DEFAULT 220,
      fat_target_g INTEGER NOT NULL DEFAULT 70,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT,
      name TEXT NOT NULL,
      kcal_per_100g REAL NOT NULL DEFAULT 0,
      protein_per_100g REAL NOT NULL DEFAULT 0,
      carbs_per_100g REAL NOT NULL DEFAULT 0,
      fat_per_100g REAL NOT NULL DEFAULT 0,
      fiber_per_100g REAL NOT NULL DEFAULT 0,
      sugar_per_100g REAL NOT NULL DEFAULT 0,
      sodium_mg_per_100g REAL NOT NULL DEFAULT 0,
      serving_size_label TEXT,
      serving_grams REAL,
      source TEXT NOT NULL CHECK (source IN ('user', 'seed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS foods_name_source_unique
      ON foods(lower(name), source, coalesce(owner_user_id, 'seed'));
    CREATE INDEX IF NOT EXISTS foods_search_idx ON foods(name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      food_id TEXT,
      food_name_snapshot TEXT NOT NULL,
      kcal_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      protein_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      carbs_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      fat_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      fiber_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      sugar_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      sodium_mg_per_100g_snapshot REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'grams',
      grams_equivalent REAL NOT NULL DEFAULT 0,
      meal TEXT NOT NULL,
      consumed_at TEXT NOT NULL,
      total_kcal REAL NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL NOT NULL DEFAULT 0,
      sugar_g REAL NOT NULL DEFAULT 0,
      sodium_mg REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS food_logs_consumed_idx ON food_logs(consumed_at);

    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS weight_logs_logged_idx ON weight_logs(logged_at);

    CREATE TABLE IF NOT EXISTS hydration_logs (
      id TEXT PRIMARY KEY,
      volume_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'quick-add',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS hydration_logs_logged_idx ON hydration_logs(logged_at);

    -- Backend-foundation tables (additive, offline-safe cache; no network code yet).
    -- catalog_foods is a SEPARATE table on purpose: SQLite cannot ALTER the foods.source
    -- CHECK constraint without a full rebuild, so we never add 'catalog' to foods.source.
    -- Future sync must upsert via INSERT ... ON CONFLICT DO UPDATE (server-owned columns
    -- only) — never INSERT OR REPLACE — and this table carries NO cascade FK (mirrors the
    -- FK-less food_logs snapshot pattern) so a catalog refresh can never delete user data.
    CREATE TABLE IF NOT EXISTS catalog_foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kcal_per_100g REAL NOT NULL DEFAULT 0,
      protein_per_100g REAL NOT NULL DEFAULT 0,
      carbs_per_100g REAL NOT NULL DEFAULT 0,
      fat_per_100g REAL NOT NULL DEFAULT 0,
      fiber_per_100g REAL NOT NULL DEFAULT 0,
      sugar_per_100g REAL NOT NULL DEFAULT 0,
      sodium_mg_per_100g REAL NOT NULL DEFAULT 0,
      serving_size_label TEXT,
      serving_grams REAL,
      provenance TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS catalog_foods_search_idx ON catalog_foods(name COLLATE NOCASE);

    -- Recipe drafts: client-generated UUID (stable across publish retries) + status.
    -- A draft is cleared ONLY after a server ack, so a mid-flight failure never loses input.
    CREATE TABLE IF NOT EXISTS recipe_drafts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'published', 'failed')),
      remote_recipe_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync('INSERT OR IGNORE INTO profile (id) VALUES (1)');
  await db.runAsync('INSERT OR IGNORE INTO user_preferences (id) VALUES (1)');
  await db.runAsync('INSERT OR IGNORE INTO user_goals (id) VALUES (1)');
  await ensureProfileColumns(db);
  await ensureNutritionColumns(db);
  await ensureGoalsColumns(db);
  await seedLocalFoods(db);
  await stampSchemaVersion(db);

  return db;
}

async function stampSchemaVersion(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;
  // Every migration to date is additive (CREATE TABLE IF NOT EXISTS / ensureColumn), all
  // individually idempotent, so there is nothing destructive to replay here — we only
  // stamp the version so future migrations have a floor to branch on. SCHEMA_VERSION is a
  // numeric constant, so this interpolation cannot be injected (PRAGMA rejects bind params).
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (columns.some((column) => column.name === columnName)) return;
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureNutritionColumns(db: SQLite.SQLiteDatabase) {
  await ensureColumn(db, 'foods', 'fiber_per_100g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'foods', 'sugar_per_100g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'foods', 'sodium_mg_per_100g', 'REAL NOT NULL DEFAULT 0');
  // SCHEMA_VERSION 4: grams per serving so "2 servings" can scale by the food's REAL
  // serving weight instead of a flat 100g for every food. Nullable — no backfill needed;
  // reads fall back to parsing an explicit weight out of serving_size_label.
  await ensureColumn(db, 'foods', 'serving_grams', 'REAL');
  await ensureColumn(db, 'catalog_foods', 'serving_grams', 'REAL');
  await ensureColumn(db, 'food_logs', 'fiber_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sugar_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sodium_mg_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'fiber_g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sugar_g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sodium_mg', 'REAL NOT NULL DEFAULT 0');
}

async function ensureProfileColumns(db: SQLite.SQLiteDatabase) {
  await ensureColumn(db, 'profile', 'profile_photo_uri', 'TEXT');
  await ensureColumn(db, 'profile', 'sex', 'TEXT');
}

async function ensureGoalsColumns(db: SQLite.SQLiteDatabase) {
  // SCHEMA_VERSION 2: macro-target mode. 'auto' = derived 30/40/30 (existing behaviour,
  // overwritten on recompute); 'custom' = user-owned absolute gram targets preserved
  // across weight/activity/goal recomputes. Additive, defaulted — no data loss.
  await ensureColumn(db, 'user_goals', 'macro_target_mode', "TEXT NOT NULL DEFAULT 'auto'");
  // SCHEMA_VERSION 3: calorie-goal mode. 'auto' = derived + safety-gated (existing behaviour);
  // 'manual' = user-set daily calorie goal preserved across recomputes (still floored on save).
  await ensureColumn(db, 'user_goals', 'calorie_goal_mode', "TEXT NOT NULL DEFAULT 'auto'");
}

async function seedLocalFoods(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM foods WHERE source = 'seed' AND deleted_at IS NULL"
  );
  if ((row?.count ?? 0) >= SEED_FOODS.length) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const food of SEED_FOODS) {
      const now = new Date().toISOString();
      await txn.runAsync(
        `INSERT OR IGNORE INTO foods (
          id,
          owner_user_id,
          name,
          kcal_per_100g,
          protein_per_100g,
          carbs_per_100g,
          fat_per_100g,
          fiber_per_100g,
          sugar_per_100g,
          sodium_mg_per_100g,
          serving_size_label,
          source,
          created_at,
          updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'seed', ?, ?)`,
        [
          seedFoodId(food.name),
          food.name,
          food.kcalPer100g,
          food.proteinPer100g,
          food.carbsPer100g,
          food.fatsPer100g,
          food.servingSizeLabel,
          now,
          now,
        ]
      );
    }
  });
}

export async function getInitialAppRoute(): Promise<'/onboarding/step-1' | '/dashboard'> {
  const db = await getDb();
  const profile = await db.getFirstAsync<Pick<ProfileRow, 'onboarding_completed_at'>>(
    'SELECT onboarding_completed_at FROM profile WHERE id = 1'
  );
  return profile?.onboarding_completed_at ? '/dashboard' : '/onboarding/step-1';
}

async function getLatestWeightKg(db: SQLite.SQLiteDatabase) {
  const latestWeight = await db.getFirstAsync<{ weight_kg: number }>(
    'SELECT weight_kg FROM weight_logs WHERE deleted_at IS NULL ORDER BY logged_at DESC LIMIT 1'
  );
  return latestWeight?.weight_kg ?? null;
}

async function refreshCalorieTargets(
  db: SQLite.SQLiteDatabase,
  overrides: Partial<{
    activityLevel: DbActivity;
    heightCm: number;
    weightKg: number;
  }> = {}
) {
  const [profile, preferences, goals, latestWeight] = await Promise.all([
    db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1'),
    db.getFirstAsync<PreferencesRow>('SELECT * FROM user_preferences WHERE id = 1'),
    db.getFirstAsync<GoalsRow>('SELECT * FROM user_goals WHERE id = 1'),
    getLatestWeightKg(db),
  ]);

  const goal: AppGoal = goals?.goal ?? 'lose';
  const heightCm = overrides.heightCm ?? profile?.height_cm;
  const weightKg = overrides.weightKg ?? latestWeight ?? profile?.start_weight_kg;

  // SAFETY GATE (health-safety red-team, Finding 1): the STORED daily target must be
  // gated by construction, not only on the one-time onboarding screen. If the persisted
  // goal is 'lose' but the guardrail blocks a cut (minor or underweight — e.g. the user
  // later edited their weight down), never persist an ungated deficit. Fall back to the
  // recommended safe goal so every downstream consumer (dashboard, future AI planner)
  // reads a safety-gated target. The goal enum itself is left untouched (re-gated
  // idempotently on the next refresh); flipping it is a UX decision, not a data one.
  const safety = evaluateGoalSafety({
    age: profile?.age,
    heightCm,
    weightKg,
    sex: profile?.sex,
    goal,
  });
  const effectiveGoal: AppGoal =
    goal === 'lose' && !safety.allowLose ? (safety.recommendedGoal ?? 'maintain') : goal;

  const targets = calculateCalorieTargets({
    activityLevel: overrides.activityLevel ?? preferences?.activity_level ?? 'moderate',
    age: profile?.age,
    goal: effectiveGoal,
    heightCm,
    sex: profile?.sex,
    weightKg,
  });

  if (!targets) return;

  // Which of the two user-ownable dimensions (calorie goal, macro targets) to recompute is
  // decided by the pure, unit-tested resolveTargetRecompute. A null field = user-owned = keep.
  const recompute = resolveTargetRecompute({
    calorieMode: goals?.calorie_goal_mode === 'manual' ? 'manual' : 'auto',
    macroMode: goals?.macro_target_mode === 'custom' ? 'custom' : 'auto',
    derivedCalories: targets.dailyCalories,
    storedCalories: toNumber(goals?.daily_calorie_goal),
  });

  const sets: string[] = [];
  const params: (number | string)[] = [];
  if (recompute.dailyCalorieGoal != null) {
    sets.push('daily_calorie_goal = ?');
    params.push(recompute.dailyCalorieGoal);
  }
  if (recompute.protein != null && recompute.carbs != null && recompute.fat != null) {
    sets.push('protein_target_g = ?', 'carbs_target_g = ?', 'fat_target_g = ?');
    params.push(recompute.protein, recompute.carbs, recompute.fat);
  }
  if (sets.length === 0) return; // both dimensions user-owned — nothing to recompute

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  await db.runAsync(`UPDATE user_goals SET ${sets.join(', ')} WHERE id = 1`, params);
}

export type MacroTargetMode = 'auto' | 'custom';
export type CalorieGoalMode = 'auto' | 'manual';

export type MacroTargetsModel = {
  mode: MacroTargetMode;
  calorieGoalMode: CalorieGoalMode;
  dailyCalorieGoal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
};

export async function fetchMacroTargets(): Promise<MacroTargetsModel> {
  const db = await getDb();
  const goals = await db.getFirstAsync<GoalsRow>('SELECT * FROM user_goals WHERE id = 1');
  // Display the STORED goal as-is (fallback only when missing/invalid). Re-clamping to
  // 1200 here turned a maintenance-capped cut (e.g. TDEE 1151) into a hidden surplus
  // and made this screen disagree with the stored value and the TDEE calculator.
  const storedCalorieGoal = toNumber(goals?.daily_calorie_goal);
  return {
    mode: goals?.macro_target_mode === 'custom' ? 'custom' : 'auto',
    calorieGoalMode: goals?.calorie_goal_mode === 'manual' ? 'manual' : 'auto',
    dailyCalorieGoal: storedCalorieGoal > 0 ? storedCalorieGoal : 2000,
    proteinTargetG: Math.max(0, toNumber(goals?.protein_target_g)),
    carbsTargetG: Math.max(0, toNumber(goals?.carbs_target_g)),
    fatTargetG: Math.max(0, toNumber(goals?.fat_target_g)),
  };
}

/**
 * Set a manual daily calorie goal (validated to the safety floor) and switch to 'manual' mode
 * so recomputes won't overwrite it. Auto macros are re-derived from the new goal here directly
 * (no body-stat dependency); custom macros are left untouched.
 */
export async function setManualCalorieGoal(input: number | string): Promise<MacroTargetsModel> {
  const validation = validateManualCalorieGoal(input);
  if (!validation.ok) throw new Error(validation.error);

  const db = await getDb();
  const goals = await db.getFirstAsync<GoalsRow>('SELECT macro_target_mode FROM user_goals WHERE id = 1');
  const now = new Date().toISOString();

  if (goals?.macro_target_mode === 'custom') {
    await db.runAsync(
      `UPDATE user_goals
       SET daily_calorie_goal = ?, calorie_goal_mode = 'manual', updated_at = ?
       WHERE id = 1`,
      [validation.value, now]
    );
  } else {
    const macros = deriveMacrosFromCalories(validation.value);
    await db.runAsync(
      `UPDATE user_goals
       SET daily_calorie_goal = ?, calorie_goal_mode = 'manual',
           protein_target_g = ?, carbs_target_g = ?, fat_target_g = ?, updated_at = ?
       WHERE id = 1`,
      [validation.value, macros.protein, macros.carbs, macros.fat, now]
    );
  }

  return fetchMacroTargets();
}

/** Return the calorie goal to the derived + safety-gated value. */
export async function revertCalorieGoalToAuto(): Promise<MacroTargetsModel> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE user_goals SET calorie_goal_mode = 'auto', updated_at = ? WHERE id = 1",
    [new Date().toISOString()]
  );
  await refreshCalorieTargets(db);
  return fetchMacroTargets();
}

/**
 * Persist user-owned gram macro targets and switch to 'custom' mode. Validates defensively
 * (never trusts the UI). Deliberately does NOT touch daily_calorie_goal — calories stay
 * derived + safety-gated.
 */
export async function setCustomMacroTargets(input: {
  proteinG: number | string;
  carbsG: number | string;
  fatG: number | string;
}): Promise<MacroTargetsModel> {
  const validation = validateCustomMacroGrams(input);
  if (!validation.ok) {
    throw new Error('Enter valid macro targets (whole grams, 0 or higher).');
  }

  const db = await getDb();
  await db.runAsync(
    `UPDATE user_goals
     SET protein_target_g = ?,
         carbs_target_g = ?,
         fat_target_g = ?,
         macro_target_mode = 'custom',
         updated_at = ?
     WHERE id = 1`,
    [
      validation.value.proteinG,
      validation.value.carbsG,
      validation.value.fatG,
      new Date().toISOString(),
    ]
  );

  return fetchMacroTargets();
}

/** Return to the automatic 30/40/30 split, restoring derived macros immediately. */
export async function revertMacroTargetsToAuto(): Promise<MacroTargetsModel> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE user_goals SET macro_target_mode = 'auto', updated_at = ? WHERE id = 1",
    [new Date().toISOString()]
  );
  await refreshCalorieTargets(db);
  return fetchMacroTargets();
}

export async function completeOnboarding(input: OnboardingSubmitInput) {
  const db = await getDb();
  const now = new Date().toISOString();
  const weightKg = toNumber(input.weightKg);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE profile
       SET age = ?,
           sex = ?,
           height_cm = ?,
           start_weight_kg = ?,
           onboarding_completed_at = ?,
           updated_at = ?
       WHERE id = 1`,
      [toNumber(input.age), input.sex, toNumber(input.heightCm), weightKg, now, now]
    );
    await txn.runAsync(
      'UPDATE user_preferences SET activity_level = ?, updated_at = ? WHERE id = 1',
      [input.activityLevel, now]
    );
    await txn.runAsync(
      `UPDATE user_goals
       SET goal = ?,
           goal_weight_kg = ?,
           daily_calorie_goal = ?,
           protein_target_g = ?,
           carbs_target_g = ?,
           fat_target_g = ?,
           updated_at = ?
       WHERE id = 1`,
      [
        input.goal,
        null,
        Math.round(input.dailyCalories),
        input.protein,
        input.carbs,
        input.fat,
        now,
      ]
    );
    if (weightKg > 0) {
      await txn.runAsync(
        'INSERT INTO weight_logs (id, weight_kg, logged_at, created_at) VALUES (?, ?, ?, ?)',
        [createId('weight'), weightKg, now, now]
      );
    }
  });
}

export async function loadProfileBundle(): Promise<ProfileBundle> {
  const db = await getDb();
  const [profile, preferences, goals, latestWeight, streak] = await Promise.all([
    db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1'),
    db.getFirstAsync<PreferencesRow>('SELECT * FROM user_preferences WHERE id = 1'),
    db.getFirstAsync<GoalsRow>('SELECT * FROM user_goals WHERE id = 1'),
    db.getFirstAsync<{ weight_kg: number }>(
      'SELECT weight_kg FROM weight_logs WHERE deleted_at IS NULL ORDER BY logged_at DESC LIMIT 1'
    ),
    getCurrentStreakFromLogs(),
  ]);

  return {
    fullName: profile?.full_name ?? '',
    username: profile?.username ?? '',
    email: profile?.email ?? '',
    profilePhotoUri: profile?.profile_photo_uri ?? '',
    age: profile?.age != null ? String(profile.age) : '',
    height: profile?.height_cm != null ? String(profile.height_cm) : '',
    weight:
      latestWeight?.weight_kg != null
        ? String(latestWeight.weight_kg)
        : profile?.start_weight_kg != null
          ? String(profile.start_weight_kg)
          : '',
    goalWeight: goals?.goal_weight_kg != null ? String(goals.goal_weight_kg) : '',
    activityLevel: ACTIVITY_FROM_DB[preferences?.activity_level ?? 'moderate'],
    goal: GOAL_FROM_DB[goals?.goal ?? 'lose'],
    units: UNITS_FROM_DB[preferences?.units ?? 'metric'],
    theme: THEME_FROM_DB[preferences?.theme ?? 'auto'],
    notifications: preferences?.notifications_enabled !== 0,
    calorieGoal: goals?.daily_calorie_goal != null ? String(goals.daily_calorie_goal) : '2000',
    streakDays: String(streak),
  };
}

export async function updateProfilePhoto(profilePhotoUri: string) {
  const db = await getDb();
  await db.runAsync('UPDATE profile SET profile_photo_uri = ?, updated_at = ? WHERE id = 1', [
    emptyToNull(profilePhotoUri),
    new Date().toISOString(),
  ]);
}

export async function updateBodyMeasurements(values: {
  height: string;
  weight: string;
  goalWeight: string;
  units: AppUnits;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  // Inputs arrive in the user's DISPLAY units. Convert Imperial in/lb to the canonical
  // cm/kg the DB (and all BMI + calorie math) assumes. Storing raw Imperial numbers here
  // corrupted safety-critical math (correctness + health-safety red-team): a 140 lb user
  // was persisted as 140 "kg", inflating BMI so the guardrail wrongly unblocked a cut.
  const heightCm = heightInputToCm(toNumber(values.height), values.units);
  const weightKg = weightInputToKg(toNumber(values.weight), values.units);
  const goalWeightKg = weightInputToKg(toNumber(values.goalWeight), values.units);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'UPDATE profile SET height_cm = ?, start_weight_kg = ?, updated_at = ? WHERE id = 1',
      [heightCm, weightKg, now]
    );
    await txn.runAsync('UPDATE user_goals SET goal_weight_kg = ?, updated_at = ? WHERE id = 1', [
      goalWeightKg,
      now,
    ]);
    if (weightKg > 0) {
      await txn.runAsync(
        'INSERT INTO weight_logs (id, weight_kg, logged_at, created_at) VALUES (?, ?, ?, ?)',
        [createId('weight'), weightKg, now, now]
      );
    }
  });

  await refreshCalorieTargets(db, { heightCm, weightKg });
}

export async function updateUnits(units: AppUnits) {
  const db = await getDb();
  await db.runAsync('UPDATE user_preferences SET units = ?, updated_at = ? WHERE id = 1', [
    UNITS_TO_DB[units],
    new Date().toISOString(),
  ]);
}

export async function updateTheme(theme: AppTheme) {
  const db = await getDb();
  await db.runAsync('UPDATE user_preferences SET theme = ?, updated_at = ? WHERE id = 1', [
    THEME_TO_DB[theme],
    new Date().toISOString(),
  ]);
}

export async function updateNotifications(enabled: boolean) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE user_preferences SET notifications_enabled = ?, updated_at = ? WHERE id = 1',
    [enabled ? 1 : 0, new Date().toISOString()]
  );
}

export async function updateActivityLevel(level: AppActivity) {
  const db = await getDb();
  await db.runAsync('UPDATE user_preferences SET activity_level = ?, updated_at = ? WHERE id = 1', [
    ACTIVITY_TO_DB[level],
    new Date().toISOString(),
  ]);
  await refreshCalorieTargets(db, { activityLevel: ACTIVITY_TO_DB[level] });
}

// Changing the goal re-derives the (safety-gated) calorie target for the new goal. The goal
// enum is stored as chosen; refreshCalorieTargets still floors an unsafe cut per the guardrail.
export async function updateGoal(value: AppGoalLabel) {
  const db = await getDb();
  await db.runAsync('UPDATE user_goals SET goal = ?, updated_at = ? WHERE id = 1', [
    GOAL_TO_DB[value],
    new Date().toISOString(),
  ]);
  await refreshCalorieTargets(db);
}

function mapFoodRow(row: FoodRow): SavedFoodModel {
  return {
    id: row.id,
    name: row.name,
    kcalPer100g: toNumber(row.kcal_per_100g),
    proteinPer100g: toNumber(row.protein_per_100g),
    carbsPer100g: toNumber(row.carbs_per_100g),
    fatsPer100g: toNumber(row.fat_per_100g),
    fiberPer100g: toNumber(row.fiber_per_100g),
    sugarPer100g: toNumber(row.sugar_per_100g),
    sodiumMgPer100g: toNumber(row.sodium_mg_per_100g),
    servingSizeLabel: row.serving_size_label ?? undefined,
    servingGrams:
      row.serving_grams != null && toNumber(row.serving_grams) > 0
        ? toNumber(row.serving_grams)
        : (parseServingGramsFromLabel(row.serving_size_label) ?? undefined),
    source: row.source,
    createdAtIso: row.created_at,
    updatedAtIso: row.updated_at,
  };
}

export async function fetchFoodsForSearch(): Promise<SavedFoodModel[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT *
     FROM foods
     WHERE owner_user_id = ?
       AND source = 'user'
       AND deleted_at IS NULL
     ORDER BY updated_at DESC
     LIMIT 500`,
    [LOCAL_USER_ID]
  );
  return rows.map(mapFoodRow);
}

export async function fetchCommonSeedFoods(): Promise<SavedFoodModel[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT *
     FROM foods
     WHERE owner_user_id IS NULL
       AND source = 'seed'
       AND deleted_at IS NULL
     ORDER BY name COLLATE NOCASE ASC
     LIMIT ?`,
    [COMMON_SEED_FOODS_LIMIT]
  );
  return rows.map(mapFoodRow);
}

export async function searchFoodsByName(query: string): Promise<SavedFoodModel[]> {
  const db = await getDb();
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (normalizedQuery.length < 2) return [];

  const rows = await db.getAllAsync<FoodRow>(
    `SELECT *
     FROM foods
     WHERE deleted_at IS NULL
       AND (owner_user_id = ? OR owner_user_id IS NULL)
       AND lower(name) LIKE lower(?)
     ORDER BY CASE source WHEN 'user' THEN 0 ELSE 1 END,
              name COLLATE NOCASE ASC
     LIMIT ?`,
    [LOCAL_USER_ID, `%${normalizedQuery}%`, FOOD_SEARCH_LIMIT]
  );
  return rows.map(mapFoodRow);
}

type UserFoodWriteInput = {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
  servingSizeLabel?: string;
  servingGrams?: number;
};

function toServingGramsColumn(value?: number): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export async function upsertUserFoodByName(input: UserFoodWriteInput): Promise<SavedFoodModel> {
  const db = await getDb();
  const normalizedName = input.name.trim();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<FoodRow>(
    `SELECT *
     FROM foods
     WHERE owner_user_id = ?
       AND source = 'user'
       AND lower(name) = lower(?)
     LIMIT 1`,
    [LOCAL_USER_ID, normalizedName]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE foods
       SET name = ?,
           kcal_per_100g = ?,
           protein_per_100g = ?,
           carbs_per_100g = ?,
           fat_per_100g = ?,
           fiber_per_100g = ?,
           sugar_per_100g = ?,
           sodium_mg_per_100g = ?,
           serving_size_label = COALESCE(?, serving_size_label),
           serving_grams = COALESCE(?, serving_grams),
           deleted_at = NULL,
           updated_at = ?
       WHERE id = ?`,
      [
        normalizedName,
        input.kcalPer100g,
        input.proteinPer100g,
        input.carbsPer100g,
        input.fatsPer100g,
        input.fiberPer100g ?? 0,
        input.sugarPer100g ?? 0,
        input.sodiumMgPer100g ?? 0,
        emptyToNull(input.servingSizeLabel ?? ''),
        toServingGramsColumn(input.servingGrams),
        now,
        existing.id,
      ]
    );
    const updated = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [
      existing.id,
    ]);
    if (!updated) throw new Error('Failed to load saved food.');
    return mapFoodRow(updated);
  }

  const id = createId('food');
  await db.runAsync(
    `INSERT INTO foods (
      id,
      owner_user_id,
      name,
      kcal_per_100g,
      protein_per_100g,
      carbs_per_100g,
      fat_per_100g,
      fiber_per_100g,
      sugar_per_100g,
      sodium_mg_per_100g,
      serving_size_label,
      serving_grams,
      source,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
    [
      id,
      LOCAL_USER_ID,
      normalizedName,
      input.kcalPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatsPer100g,
      input.fiberPer100g ?? 0,
      input.sugarPer100g ?? 0,
      input.sodiumMgPer100g ?? 0,
      emptyToNull(input.servingSizeLabel ?? ''),
      toServingGramsColumn(input.servingGrams),
      now,
      now,
    ]
  );

  const inserted = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  if (!inserted) throw new Error('Failed to create saved food.');
  return mapFoodRow(inserted);
}

/**
 * Insert a user food ONLY if no live food with that name exists yet; otherwise return the
 * existing row untouched. The recipe-ingredient save path knows only calories (macros are
 * unknown, not zero) — running it through the name-keyed upsert was silently wiping the
 * real macros of any same-named saved food back to 0.
 */
export async function saveUserFoodIfMissing(input: UserFoodWriteInput): Promise<SavedFoodModel> {
  const db = await getDb();
  // Deliberately NOT filtered by deleted_at: this existence check must match the upsert's
  // own lookup exactly, or a soft-deleted row would slip through to the upsert and get
  // revived with its macros overwritten — the exact wipe this function exists to prevent.
  const existing = await db.getFirstAsync<FoodRow>(
    `SELECT *
     FROM foods
     WHERE owner_user_id = ?
       AND source = 'user'
       AND lower(name) = lower(?)
     LIMIT 1`,
    [LOCAL_USER_ID, input.name.trim()]
  );
  if (existing) return mapFoodRow(existing);
  return upsertUserFoodByName(input);
}

function mapFoodLogRow(row: FoodLogRow): LoggedFoodModel {
  const unit =
    row.unit === 'ml' || row.unit === 'oz' || row.unit === 'servings' ? row.unit : 'grams';
  return {
    id: row.id,
    foodName: row.food_name_snapshot,
    kcalPer100g: toNumber(row.kcal_per_100g_snapshot),
    proteinPer100g: toNumber(row.protein_per_100g_snapshot),
    carbsPer100g: toNumber(row.carbs_per_100g_snapshot),
    fatsPer100g: toNumber(row.fat_per_100g_snapshot),
    fiberPer100g: toNumber(row.fiber_per_100g_snapshot),
    sugarPer100g: toNumber(row.sugar_per_100g_snapshot),
    sodiumMgPer100g: toNumber(row.sodium_mg_per_100g_snapshot),
    quantity: toNumber(row.quantity),
    unit,
    gramsEquivalent: toNumber(row.grams_equivalent),
    meal: row.meal,
    logTime: formatTimeLabelFromDate(new Date(row.consumed_at)),
    totalKcal: toNumber(row.total_kcal),
    proteinGrams: toNumber(row.protein_g),
    carbsGrams: toNumber(row.carbs_g),
    fatsGrams: toNumber(row.fat_g),
    fiberGrams: toNumber(row.fiber_g),
    sugarGrams: toNumber(row.sugar_g),
    sodiumMg: toNumber(row.sodium_mg),
    consumedAtIso: row.consumed_at,
    createdAtIso: row.created_at,
  };
}

export async function fetchFoodLogs(): Promise<LoggedFoodModel[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FoodLogRow>(
    `SELECT *
     FROM food_logs
     WHERE deleted_at IS NULL
     ORDER BY consumed_at DESC
     LIMIT 300`
  );
  return rows.map(mapFoodLogRow);
}

export async function fetchFoodLogsForDay(localDay: string): Promise<LoggedFoodModel[]> {
  const db = await getDb();
  const start = new Date(`${localDay}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const rows = await db.getAllAsync<FoodLogRow>(
    `SELECT *
     FROM food_logs
     WHERE deleted_at IS NULL
       AND consumed_at >= ?
       AND consumed_at < ?
     ORDER BY consumed_at DESC`,
    [start.toISOString(), end.toISOString()]
  );
  return rows.map(mapFoodLogRow);
}

function toConsumedAtIso(logTime: string) {
  return parseTimeLabelToDate(logTime, new Date()).toISOString();
}

export async function insertFoodLog(input: FoodLogWriteInput): Promise<LoggedFoodModel> {
  const db = await getDb();
  const id = createId('log');
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO food_logs (
      id,
      food_id,
      food_name_snapshot,
      kcal_per_100g_snapshot,
      protein_per_100g_snapshot,
      carbs_per_100g_snapshot,
      fat_per_100g_snapshot,
      fiber_per_100g_snapshot,
      sugar_per_100g_snapshot,
      sodium_mg_per_100g_snapshot,
      quantity,
      unit,
      grams_equivalent,
      meal,
      consumed_at,
      total_kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.foodId ?? null,
      input.foodName,
      input.kcalPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatsPer100g,
      input.fiberPer100g ?? 0,
      input.sugarPer100g ?? 0,
      input.sodiumMgPer100g ?? 0,
      input.quantity,
      input.unit,
      input.gramsEquivalent,
      input.meal,
      toConsumedAtIso(input.logTime),
      input.totalKcal,
      input.proteinGrams,
      input.carbsGrams,
      input.fatsGrams,
      input.fiberGrams ?? 0,
      input.sugarGrams ?? 0,
      input.sodiumMg ?? 0,
      now,
      now,
    ]
  );

  const inserted = await db.getFirstAsync<FoodLogRow>('SELECT * FROM food_logs WHERE id = ?', [id]);
  if (!inserted) throw new Error('Failed to create food log.');
  return mapFoodLogRow(inserted);
}

export async function updateFoodLog(
  id: string,
  input: FoodLogWriteInput
): Promise<LoggedFoodModel> {
  const db = await getDb();
  // Keep the entry on its ORIGINAL day: only the time-of-day comes from the edit form.
  // Re-deriving consumed_at from "now" silently moved yesterday's meal into today,
  // corrupting both days' totals and the streak.
  const existing = await db.getFirstAsync<Pick<FoodLogRow, 'consumed_at'>>(
    'SELECT consumed_at FROM food_logs WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!existing) throw new Error('Food log not found.');
  const consumedAt = parseTimeLabelToDate(
    input.logTime,
    new Date(existing.consumed_at)
  ).toISOString();
  await db.runAsync(
    `UPDATE food_logs
     SET food_id = ?,
         food_name_snapshot = ?,
         kcal_per_100g_snapshot = ?,
         protein_per_100g_snapshot = ?,
         carbs_per_100g_snapshot = ?,
         fat_per_100g_snapshot = ?,
         fiber_per_100g_snapshot = ?,
         sugar_per_100g_snapshot = ?,
         sodium_mg_per_100g_snapshot = ?,
         quantity = ?,
         unit = ?,
         grams_equivalent = ?,
         meal = ?,
         consumed_at = ?,
         total_kcal = ?,
         protein_g = ?,
         carbs_g = ?,
         fat_g = ?,
         fiber_g = ?,
         sugar_g = ?,
         sodium_mg = ?,
         updated_at = ?
     WHERE id = ?
       AND deleted_at IS NULL`,
    [
      input.foodId ?? null,
      input.foodName,
      input.kcalPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatsPer100g,
      input.fiberPer100g ?? 0,
      input.sugarPer100g ?? 0,
      input.sodiumMgPer100g ?? 0,
      input.quantity,
      input.unit,
      input.gramsEquivalent,
      input.meal,
      consumedAt,
      input.totalKcal,
      input.proteinGrams,
      input.carbsGrams,
      input.fatsGrams,
      input.fiberGrams ?? 0,
      input.sugarGrams ?? 0,
      input.sodiumMg ?? 0,
      new Date().toISOString(),
      id,
    ]
  );

  const updated = await db.getFirstAsync<FoodLogRow>(
    'SELECT * FROM food_logs WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!updated) throw new Error('Food log not found.');
  return mapFoodLogRow(updated);
}

export async function softDeleteFoodLog(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE food_logs SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    id,
  ]);
}

// Same canonical bounds as onboarding (lib/onboarding-form.ts). A weigh-in now rewrites
// the derived calorie/macro targets, so an implausible value (a typo like 1540, or lb
// stored as kg) must be rejected here instead of silently poisoning the stored goal.
export const MIN_WEIGHT_LOG_KG = 30;
export const MAX_WEIGHT_LOG_KG = 300;

export async function addWeightLog(weightKg: number, note?: string) {
  if (
    !Number.isFinite(weightKg) ||
    weightKg < MIN_WEIGHT_LOG_KG ||
    weightKg > MAX_WEIGHT_LOG_KG
  ) {
    throw new Error(
      `Enter a weight between ${MIN_WEIGHT_LOG_KG} and ${MAX_WEIGHT_LOG_KG} kg.`
    );
  }
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO weight_logs (id, weight_kg, logged_at, note, created_at) VALUES (?, ?, ?, ?, ?)',
    [createId('weight'), weightKg, now, note ? note.trim() : null, now]
  );
  // The daily target is body-stat-derived; a new weigh-in IS a body-stat change. Without
  // this, users logging weight in Progress kept a stale target until they happened to edit
  // an unrelated setting. Same safety-gated path as updateBodyMeasurements.
  await refreshCalorieTargets(db, { weightKg });
}

export async function addHydrationLog(volumeMl: number, source = 'quick-add') {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO hydration_logs (id, volume_ml, logged_at, source, created_at) VALUES (?, ?, ?, ?, ?)',
    [createId('hydration'), Math.round(volumeMl), now, source, now]
  );
}

export async function getTodayHydrationMl(): Promise<number> {
  const db = await getDb();
  const localDay = localDateKey(new Date());
  const start = new Date(`${localDay}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const row = await db.getFirstAsync<{ total_volume_ml: number }>(
    `SELECT COALESCE(SUM(volume_ml), 0) AS total_volume_ml
     FROM hydration_logs
     WHERE deleted_at IS NULL
       AND logged_at >= ?
       AND logged_at < ?`,
    [start.toISOString(), end.toISOString()]
  );
  return row?.total_volume_ml ?? 0;
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
  weeklyMacros: {
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
    avgProteinG: number;
    avgCarbsG: number;
    avgFatG: number;
    loggedDayCount: number;
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

async function getCurrentStreakFromLogs() {
  const keys = buildDateKeys(21);
  const db = await getDb();
  const start = new Date(`${keys[0]}T00:00:00`);
  const rows = await db.getAllAsync<{ consumed_at: string }>(
    `SELECT consumed_at
     FROM food_logs
     WHERE deleted_at IS NULL
       AND consumed_at >= ?`,
    [start.toISOString()]
  );
  const map = new Map<string, boolean>(keys.map((key) => [key, false]));
  for (const row of rows) map.set(localDateKey(new Date(row.consumed_at)), true);
  return computeCurrentStreak(keys, map);
}

async function getDailyNutrition(startKey: string) {
  const db = await getDb();
  const start = new Date(`${startKey}T00:00:00`);
  const rows = await db.getAllAsync<{
    consumed_at: string;
    total_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>(
    `SELECT consumed_at,
            total_kcal,
            protein_g,
            carbs_g,
            fat_g
     FROM food_logs
     WHERE deleted_at IS NULL
       AND consumed_at >= ?
     ORDER BY consumed_at ASC`,
    [start.toISOString()]
  );

  const totals = new Map<
    string,
    {
      local_day: string;
      total_kcal: number;
      total_protein_g: number;
      total_carbs_g: number;
      total_fat_g: number;
    }
  >();

  for (const row of rows) {
    const localDay = localDateKey(new Date(row.consumed_at));
    const current = totals.get(localDay) ?? {
      local_day: localDay,
      total_kcal: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
    };

    current.total_kcal += toNumber(row.total_kcal);
    current.total_protein_g += toNumber(row.protein_g);
    current.total_carbs_g += toNumber(row.carbs_g);
    current.total_fat_g += toNumber(row.fat_g);
    totals.set(localDay, current);
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.local_day < b.local_day ? -1 : a.local_day > b.local_day ? 1 : 0
  );
}

async function getDailyHydration(startKey: string) {
  const db = await getDb();
  const start = new Date(`${startKey}T00:00:00`);
  const rows = await db.getAllAsync<{ logged_at: string; volume_ml: number }>(
    `SELECT logged_at,
            volume_ml
     FROM hydration_logs
     WHERE deleted_at IS NULL
       AND logged_at >= ?
     ORDER BY logged_at ASC`,
    [start.toISOString()]
  );

  const totals = new Map<string, HydrationRow>();
  for (const row of rows) {
    const localDay = localDateKey(new Date(row.logged_at));
    const current = totals.get(localDay) ?? { local_day: localDay, total_volume_ml: 0 };
    current.total_volume_ml += toNumber(row.volume_ml);
    totals.set(localDay, current);
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.local_day < b.local_day ? -1 : a.local_day > b.local_day ? 1 : 0
  );
}

async function getWeightRows(startIso?: string) {
  const db = await getDb();
  if (startIso) {
    return db.getAllAsync<WeightRow>(
      `SELECT logged_at, weight_kg
       FROM weight_logs
       WHERE deleted_at IS NULL
         AND logged_at >= ?
       ORDER BY logged_at ASC`,
      [startIso]
    );
  }

  return db.getAllAsync<WeightRow>(
    `SELECT logged_at, weight_kg
     FROM weight_logs
     WHERE deleted_at IS NULL
     ORDER BY logged_at ASC
     LIMIT 300`
  );
}

export async function fetchHomeDashboardSnapshot(dayCount = 7): Promise<HomeDashboardSnapshot> {
  const db = await getDb();
  const dateKeys = buildDateKeys(dayCount);
  const startKey = dateKeys[0]!;

  const [profile, goals, nutrition, hydration, weights] = await Promise.all([
    db.getFirstAsync<Pick<ProfileRow, 'full_name'>>('SELECT full_name FROM profile WHERE id = 1'),
    db.getFirstAsync<GoalsRow>('SELECT * FROM user_goals WHERE id = 1'),
    getDailyNutrition(startKey),
    getDailyHydration(startKey),
    getWeightRows(),
  ]);

  const nutritionMap = new Map<string, (typeof nutrition)[number]>();
  for (const row of nutrition) nutritionMap.set(String(row.local_day), row);

  const hydrationMap = new Map<string, HydrationRow>();
  for (const row of hydration) hydrationMap.set(String(row.local_day), row);

  const weightByDay = new Map<string, number>();
  for (const row of weights) {
    const key = localDateKey(new Date(row.logged_at));
    weightByDay.set(key, toNumber(row.weight_kg));
  }

  let runningWeight: number | null = null;
  const days: DashboardDaySnapshot[] = dateKeys.map((key) => {
    if (weightByDay.has(key)) runningWeight = weightByDay.get(key)!;

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

  const weightSeries = weights.map((row) => toNumber(row.weight_kg)).filter((value) => value > 0);
  const trendSlice = weightSeries.slice(-6);
  const currentWeightKg = trendSlice.length ? trendSlice[trendSlice.length - 1]! : null;
  const previousWeightKg =
    trendSlice.length > 1 ? trendSlice[trendSlice.length - 2]! : currentWeightKg;
  const weightDeltaKg =
    currentWeightKg != null && previousWeightKg != null
      ? Number((currentWeightKg - previousWeightKg).toFixed(1))
      : 0;

  // Same rule as fetchMacroTargets: show the stored, safety-gated goal as-is — a
  // maintenance-capped cut can be < 1200 and must not be inflated into a surplus here.
  const storedGoalKcal = toNumber(goals?.daily_calorie_goal);
  return {
    userName: profile?.full_name || 'Trackk User',
    goalKcal: storedGoalKcal > 0 ? storedGoalKcal : 2000,
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
  const home = await fetchHomeDashboardSnapshot(21);
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [recentLogs, recentWeights] = await Promise.all([
    (await getDb()).getAllAsync<{ id: string; consumed_at: string }>(
      `SELECT id, consumed_at
       FROM food_logs
       WHERE deleted_at IS NULL
         AND consumed_at >= ?`,
      [sevenDaysAgoIso]
    ),
    getWeightRows(sevenDaysAgoIso),
  ]);

  const streakCompletionMap = new Map<string, boolean>();
  for (const day of home.days) streakCompletionMap.set(day.localDay, day.totalKcal > 0);

  const streakKeys = home.days.map((day) => day.localDay);
  const currentStreak = computeCurrentStreak(streakKeys, streakCompletionMap);
  const weeklyDays = home.days.slice(-7);
  const weeklyCalories = weeklyDays.map((day) => day.totalKcal);
  const avgKcal =
    weeklyCalories.length > 0
      ? Math.round(weeklyCalories.reduce((sum, value) => sum + value, 0) / weeklyCalories.length)
      : 0;

  // Average macros over LOGGED days only (not the raw 7) so untracked days don't drag the
  // average down and mislead. Zero logged days => zero averages.
  const loggedMacroDays = weeklyDays.filter((day) => day.totalKcal > 0);
  const macroDenom = Math.max(loggedMacroDays.length, 1);
  const avgProteinG = Math.round(
    loggedMacroDays.reduce((sum, day) => sum + day.proteinG, 0) / macroDenom
  );
  const avgCarbsG = Math.round(
    loggedMacroDays.reduce((sum, day) => sum + day.carbsG, 0) / macroDenom
  );
  const avgFatG = Math.round(loggedMacroDays.reduce((sum, day) => sum + day.fatG, 0) / macroDenom);

  const calorieHits = weeklyDays.filter((day) => {
    if (day.totalKcal <= 0) return false;
    const ratio = day.totalKcal / home.goalKcal;
    return ratio >= 0.9 && ratio <= 1.1;
  }).length;
  const hydrationHits = weeklyDays.filter(
    (day) => day.hydrationMl >= home.hydrationTargetMl
  ).length;
  const weighInDays = new Set(recentWeights.map((row) => localDateKey(new Date(row.logged_at))));
  const weekWeightValues = recentWeights
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
    weeklyMacros: {
      proteinTargetG: home.proteinTargetG,
      carbsTargetG: home.carbsTargetG,
      fatTargetG: home.fatTargetG,
      avgProteinG,
      avgCarbsG,
      avgFatG,
      loggedDayCount: loggedMacroDays.length,
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
      trackedMeals: recentLogs.length,
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
