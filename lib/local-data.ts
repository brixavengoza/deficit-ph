import * as SQLite from 'expo-sqlite';

import { SEED_FOODS } from '@/lib/local-seed-foods';
import { formatTimeLabelFromDate, parseTimeLabelToDate } from '@/utils/add-food-utils';

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
  unit: 'grams' | 'oz' | 'servings';
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
  goal_weight_kg: number | null;
  daily_calorie_goal: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
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
  `);

  await db.runAsync('INSERT OR IGNORE INTO profile (id) VALUES (1)');
  await db.runAsync('INSERT OR IGNORE INTO user_preferences (id) VALUES (1)');
  await db.runAsync('INSERT OR IGNORE INTO user_goals (id) VALUES (1)');
  await ensureProfileColumns(db);
  await ensureNutritionColumns(db);
  await seedLocalFoods(db);

  return db;
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
  await ensureColumn(db, 'food_logs', 'fiber_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sugar_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sodium_mg_per_100g_snapshot', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'fiber_g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sugar_g', 'REAL NOT NULL DEFAULT 0');
  await ensureColumn(db, 'food_logs', 'sodium_mg', 'REAL NOT NULL DEFAULT 0');
}

async function ensureProfileColumns(db: SQLite.SQLiteDatabase) {
  await ensureColumn(db, 'profile', 'profile_photo_uri', 'TEXT');
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

export async function completeOnboarding(input: OnboardingSubmitInput) {
  const db = await getDb();
  const now = new Date().toISOString();
  const weightKg = toNumber(input.weightKg);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE profile
       SET age = ?,
           height_cm = ?,
           start_weight_kg = ?,
           onboarding_completed_at = ?,
           updated_at = ?
       WHERE id = 1`,
      [toNumber(input.age), toNumber(input.heightCm), weightKg, now, now]
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
        weightKg,
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
    units: UNITS_FROM_DB[preferences?.units ?? 'metric'],
    theme: THEME_FROM_DB[preferences?.theme ?? 'auto'],
    notifications: preferences?.notifications_enabled !== 0,
    calorieGoal: goals?.daily_calorie_goal != null ? String(goals.daily_calorie_goal) : '2000',
    streakDays: String(streak),
  };
}

export async function updatePersonalInfo(values: {
  fullName: string;
  username: string;
  email: string;
}) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE profile
     SET full_name = ?,
         username = ?,
         email = ?,
         updated_at = ?
     WHERE id = 1`,
    [
      values.fullName.trim(),
      values.username.trim(),
      values.email.trim().toLowerCase(),
      new Date().toISOString(),
    ]
  );
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
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const weightKg = toNumber(values.weight);

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'UPDATE profile SET height_cm = ?, start_weight_kg = ?, updated_at = ? WHERE id = 1',
      [toNumber(values.height), weightKg, now]
    );
    await txn.runAsync('UPDATE user_goals SET goal_weight_kg = ?, updated_at = ? WHERE id = 1', [
      toNumber(values.goalWeight),
      now,
    ]);
    if (weightKg > 0) {
      await txn.runAsync(
        'INSERT INTO weight_logs (id, weight_kg, logged_at, created_at) VALUES (?, ?, ?, ?)',
        [createId('weight'), weightKg, now, now]
      );
    }
  });
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

export async function upsertUserFoodByName(input: {
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumMgPer100g?: number;
  servingSizeLabel?: string;
}): Promise<SavedFoodModel> {
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
           serving_size_label = ?,
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
      source,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
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
      now,
      now,
    ]
  );

  const inserted = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  if (!inserted) throw new Error('Failed to create saved food.');
  return mapFoodRow(inserted);
}

function mapFoodLogRow(row: FoodLogRow): LoggedFoodModel {
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
      toConsumedAtIso(input.logTime),
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

export async function addWeightLog(weightKg: number, note?: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO weight_logs (id, weight_kg, logged_at, note, created_at) VALUES (?, ?, ?, ?, ?)',
    [createId('weight'), weightKg, now, note ? note.trim() : null, now]
  );
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
  const row = await db.getFirstAsync<{ total_volume_ml: number }>(
    `SELECT COALESCE(SUM(volume_ml), 0) AS total_volume_ml
     FROM hydration_logs
     WHERE deleted_at IS NULL
       AND substr(logged_at, 1, 10) = ?`,
    [localDay]
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
  const rows = await db.getAllAsync<{ local_day: string; event_count: number }>(
    `SELECT substr(consumed_at, 1, 10) AS local_day, COUNT(*) AS event_count
     FROM food_logs
     WHERE deleted_at IS NULL
       AND substr(consumed_at, 1, 10) >= ?
     GROUP BY local_day`,
    [keys[0]]
  );
  const map = new Map<string, boolean>(keys.map((key) => [key, false]));
  for (const row of rows) map.set(row.local_day, toNumber(row.event_count) > 0);
  return computeCurrentStreak(keys, map);
}

async function getDailyNutrition(startKey: string) {
  const db = await getDb();
  return db.getAllAsync<{
    local_day: string;
    total_kcal: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
  }>(
    `SELECT substr(consumed_at, 1, 10) AS local_day,
            COALESCE(SUM(total_kcal), 0) AS total_kcal,
            COALESCE(SUM(protein_g), 0) AS total_protein_g,
            COALESCE(SUM(carbs_g), 0) AS total_carbs_g,
            COALESCE(SUM(fat_g), 0) AS total_fat_g
     FROM food_logs
     WHERE deleted_at IS NULL
       AND substr(consumed_at, 1, 10) >= ?
     GROUP BY local_day
     ORDER BY local_day ASC`,
    [startKey]
  );
}

async function getDailyHydration(startKey: string) {
  const db = await getDb();
  return db.getAllAsync<HydrationRow>(
    `SELECT substr(logged_at, 1, 10) AS local_day,
            COALESCE(SUM(volume_ml), 0) AS total_volume_ml
     FROM hydration_logs
     WHERE deleted_at IS NULL
       AND substr(logged_at, 1, 10) >= ?
     GROUP BY local_day
     ORDER BY local_day ASC`,
    [startKey]
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

  return {
    userName: profile?.full_name || 'Trackk User',
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
