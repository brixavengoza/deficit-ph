import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'macro-targets-'));
const tscBin = path.join(rootDir, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    path.join(rootDir, 'utils', 'calorie-targets.ts'),
    '--target',
    'ES2020',
    '--module',
    'ES2020',
    '--moduleResolution',
    'Bundler',
    '--outDir',
    outDir,
    '--skipLibCheck',
  ],
  { stdio: 'inherit' }
);

const {
  macroCaloriesFromGrams,
  reconcileMacrosWithCalories,
  validateCustomMacroGrams,
  deriveMacrosFromCalories,
  validateManualCalorieGoal,
  resolveTargetRecompute,
  targetProgressPct,
} = await import(pathToFileURL(path.join(outDir, 'calorie-targets.js')).href);

let passed = 0;
function check(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  passed += 1;
}

// --- macroCaloriesFromGrams: 4/4/9, invalid/negative -> 0 ---
check(macroCaloriesFromGrams(150, 200, 60), 1940, 'macro kcal 150/200/60');
check(macroCaloriesFromGrams(0, 0, 0), 0, 'macro kcal all zero');
check(macroCaloriesFromGrams(-5, 10, 10), 0, 'macro kcal negative -> 0');
check(macroCaloriesFromGrams(Number('x'), 10, 10), 0, 'macro kcal NaN -> 0');

// --- reconcileMacrosWithCalories: soft divergence, safe on non-positive goal ---
check(
  reconcileMacrosWithCalories({ proteinG: 150, carbsG: 200, fatG: 60 }, 1900),
  { macroCalories: 1940, deltaKcal: 40, diverges: false },
  'reconcile within tolerance'
);
check(
  reconcileMacrosWithCalories({ proteinG: 50, carbsG: 50, fatG: 20 }, 1900),
  { macroCalories: 580, deltaKcal: -1320, diverges: true },
  'reconcile far below tolerance'
);
check(
  reconcileMacrosWithCalories({ proteinG: 150, carbsG: 200, fatG: 60 }, 0),
  { macroCalories: 1940, deltaKcal: 0, diverges: false },
  'reconcile zero calorie goal is safe'
);
check(
  reconcileMacrosWithCalories({ proteinG: 150, carbsG: 200, fatG: 60 }, -100),
  { macroCalories: 1940, deltaKcal: 0, diverges: false },
  'reconcile negative calorie goal is safe'
);

// --- validateCustomMacroGrams: whole grams, non-negative, bounded ---
check(
  validateCustomMacroGrams({ proteinG: 150, carbsG: 200, fatG: 60 }),
  { ok: true, value: { proteinG: 150, carbsG: 200, fatG: 60 } },
  'validate happy path'
);
check(
  validateCustomMacroGrams({ proteinG: 150.6, carbsG: 200, fatG: 60 }),
  { ok: true, value: { proteinG: 151, carbsG: 200, fatG: 60 } },
  'validate rounds to whole grams'
);
check(
  validateCustomMacroGrams({ proteinG: -5, carbsG: 200, fatG: 60 }),
  { ok: false, errors: { proteinG: 'Must be 0 or higher' } },
  'validate rejects negative'
);
check(
  validateCustomMacroGrams({ proteinG: 2000, carbsG: 200, fatG: 60 }),
  { ok: false, errors: { proteinG: 'Must be 1000 or lower' } },
  'validate rejects over max'
);
check(
  validateCustomMacroGrams({ proteinG: 'abc', carbsG: 200, fatG: 60 }),
  { ok: false, errors: { proteinG: 'Enter a number' } },
  'validate rejects non-number'
);

// --- deriveMacrosFromCalories: 30/40/30, safe on invalid ---
check(deriveMacrosFromCalories(2000), { protein: 150, carbs: 200, fat: 67 }, 'derive macros 2000');
check(deriveMacrosFromCalories(0), { protein: 0, carbs: 0, fat: 0 }, 'derive macros zero');
check(deriveMacrosFromCalories(-100), { protein: 0, carbs: 0, fat: 0 }, 'derive macros negative -> 0');

// --- validateManualCalorieGoal: safety floor + bounds + rounding ---
check(validateManualCalorieGoal(1800), { ok: true, value: 1800 }, 'manual goal happy path');
check(validateManualCalorieGoal(1800.6), { ok: true, value: 1801 }, 'manual goal rounds');
check(
  validateManualCalorieGoal(1000),
  { ok: false, error: 'Must be at least 1200 kcal for safety' },
  'manual goal below safety floor'
);
check(
  validateManualCalorieGoal(20000),
  { ok: false, error: 'Must be 10000 or lower' },
  'manual goal over max'
);
check(validateManualCalorieGoal('abc'), { ok: false, error: 'Enter a number' }, 'manual goal NaN');

// --- resolveTargetRecompute: the 4 mode combinations (safety-critical branching) ---
check(
  resolveTargetRecompute({ calorieMode: 'auto', macroMode: 'auto', derivedCalories: 2000, storedCalories: 1500 }),
  { dailyCalorieGoal: 2000, protein: 150, carbs: 200, fat: 67 },
  'recompute auto/auto writes all four from derived'
);
check(
  resolveTargetRecompute({ calorieMode: 'auto', macroMode: 'custom', derivedCalories: 2000, storedCalories: 1500 }),
  { dailyCalorieGoal: 2000, protein: null, carbs: null, fat: null },
  'recompute auto/custom keeps macros'
);
check(
  resolveTargetRecompute({ calorieMode: 'manual', macroMode: 'auto', derivedCalories: 2000, storedCalories: 1800 }),
  { dailyCalorieGoal: null, protein: 135, carbs: 180, fat: 60 },
  'recompute manual/auto keeps calories, derives macros from manual goal'
);
check(
  resolveTargetRecompute({ calorieMode: 'manual', macroMode: 'custom', derivedCalories: 2000, storedCalories: 1800 }),
  { dailyCalorieGoal: null, protein: null, carbs: null, fat: null },
  'recompute manual/custom writes nothing (both user-owned)'
);
check(
  resolveTargetRecompute({ calorieMode: 'manual', macroMode: 'auto', derivedCalories: 2000, storedCalories: 0 }),
  { dailyCalorieGoal: null, protein: 150, carbs: 200, fat: 67 },
  'recompute manual/auto falls back to derived when stored calories invalid'
);

// --- targetProgressPct: cap + graceful zero-target ---
check(targetProgressPct(45, 150), 30, 'progress 45/150');
check(targetProgressPct(160, 150), 100, 'progress caps at 100');
check(targetProgressPct(10, 0), 0, 'progress zero target -> 0');
check(targetProgressPct(0, 150), 0, 'progress zero consumed -> 0');
check(targetProgressPct(-5, 150), 0, 'progress negative consumed -> 0');

console.log(`Macro target helpers passed: ${passed}`);
