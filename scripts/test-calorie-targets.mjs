import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calorie-targets-'));
const tscBin = path.join(rootDir, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    path.join(rootDir, 'utils', 'calorie-targets.ts'),
    path.join(rootDir, 'utils', 'add-food-utils.ts'),
    path.join(rootDir, 'utils', 'units.ts'),
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

const { calculateTdee, calculateCalorieTargets } = await import(
  pathToFileURL(path.join(outDir, 'calorie-targets.js')).href
);
const { convertQuantityToGrams, parseServingGramsFromLabel, OUNCES_TO_GRAMS } = await import(
  pathToFileURL(path.join(outDir, 'add-food-utils.js')).href
);
const { heightInputToCm, weightInputToKg } = await import(
  pathToFileURL(path.join(outDir, 'units.js')).href
);

let passed = 0;
function check(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  passed += 1;
}

// --- calculateTdee: Mifflin-St Jeor, raw (no floors) ---
// male 30y 175cm 70kg moderate: BMR 1648.75, x1.55 = 2555.56 -> 2556
check(
  calculateTdee({ sex: 'male', age: 30, heightCm: 175, weightKg: 70, activityLevel: 'moderate' }),
  2556,
  'tdee male reference'
);
// female 45y 148cm 42kg sedentary: BMR 959, x1.2 = 1150.8 -> 1151 (BELOW the 1200 floor —
// the calculator must still report the true number)
check(
  calculateTdee({ sex: 'female', age: 45, heightCm: 148, weightKg: 42, activityLevel: 'sedentary' }),
  1151,
  'tdee can be below 1200'
);
check(
  calculateTdee({ sex: 'male', age: 30, heightCm: 175, weightKg: 0, activityLevel: 'moderate' }),
  null,
  'tdee invalid weight -> null'
);
check(
  calculateTdee({ sex: null, age: 30, heightCm: 175, weightKg: 70, activityLevel: 'moderate' }),
  null,
  'tdee missing sex -> null'
);

// --- calculateCalorieTargets: goal adjustments on the reference body ---
const ref = { sex: 'male', age: 30, heightCm: 175, weightKg: 70, activityLevel: 'moderate' };
check(calculateCalorieTargets({ ...ref, goal: 'maintain' }).dailyCalories, 2556, 'maintain = tdee');
check(calculateCalorieTargets({ ...ref, goal: 'lose' }).dailyCalories, 2056, 'lose = tdee - 500');
check(calculateCalorieTargets({ ...ref, goal: 'gain' }).dailyCalories, 2856, 'gain = tdee + 300');

// --- Floors: lose is sex-floored but never above maintenance, never below 1200 ---
// male 40y 165cm 55kg sedentary: tdee 1664 -> lose floored up to the male 1500 floor
const smallMale = { sex: 'male', age: 40, heightCm: 165, weightKg: 55, activityLevel: 'sedentary' };
check(calculateCalorieTargets({ ...smallMale, goal: 'lose' }).dailyCalories, 1500, 'male 1500 floor');
// male 60y 150cm 45kg sedentary: tdee 1311 < 1500 floor -> lose collapses to maintenance
const tinyMale = { sex: 'male', age: 60, heightCm: 150, weightKg: 45, activityLevel: 'sedentary' };
check(calculateCalorieTargets({ ...tinyMale, goal: 'lose' }).dailyCalories, 1311, 'lose capped at tdee');
check(
  calculateCalorieTargets({ ...tinyMale, goal: 'lose' }).dailyCalories,
  calculateCalorieTargets({ ...tinyMale, goal: 'maintain' }).dailyCalories,
  'collapsed cut equals maintain'
);
// female 45y 148cm 42kg sedentary: tdee 1151 (< 1200). The lose target must equal
// maintenance TDEE (1151), NOT be inflated to 1200 — a "lose" target above maintenance
// is a hidden surplus. (The maintain/gain absolute floor of 1200 is a separate, kept rule.)
const tinyFemale = {
  sex: 'female',
  age: 45,
  heightCm: 148,
  weightKg: 42,
  activityLevel: 'sedentary',
};
check(
  calculateCalorieTargets({ ...tinyFemale, goal: 'lose' }).dailyCalories,
  1151,
  'lose capped at true maintenance, never inflated'
);
check(
  calculateCalorieTargets({ ...tinyFemale, goal: 'maintain' }).dailyCalories,
  1200,
  'maintain keeps the absolute 1200 floor'
);

// Macros always describe the FINAL calories being shown.
const cappedTargets = calculateCalorieTargets({ ...tinyFemale, goal: 'lose' });
check(cappedTargets.protein, Math.round((1151 * 0.3) / 4), 'macros derive from final calories');

// INVARIANT SWEEP: across a realistic adult grid, a 'lose' target may NEVER exceed the
// true maintenance TDEE. (This is the surplus-labelled-as-cut bug class.)
{
  let combos = 0;
  for (const sex of ['male', 'female']) {
    for (const activityLevel of ['sedentary', 'light', 'moderate', 'very']) {
      for (let age = 18; age <= 80; age += 4) {
        for (let heightCm = 140; heightCm <= 190; heightCm += 5) {
          for (let weightKg = 35; weightKg <= 120; weightKg += 5) {
            const input = { sex, activityLevel, age, heightCm, weightKg };
            const tdee = calculateTdee(input);
            const lose = calculateCalorieTargets({ ...input, goal: 'lose' }).dailyCalories;
            assert.ok(
              lose <= tdee,
              `lose ${lose} exceeds tdee ${tdee} for ${JSON.stringify(input)}`
            );
            combos += 1;
          }
        }
      }
    }
  }
  assert.ok(combos > 10000, 'invariant sweep covered the grid');
  passed += 2;
}

// --- Imperial conversion (the unit-blind calculator bug): 66in/150lb is ~168cm/68kg ---
const cm = heightInputToCm(66, 'Imperial');
const kg = weightInputToKg(150, 'Imperial');
check(Math.round(cm * 100) / 100, 167.64, '66 in -> 167.64 cm');
check(Math.round(kg * 10) / 10, 68, '150 lb -> 68.0 kg');
const imperialTdee = calculateTdee({
  sex: 'male',
  age: 30,
  heightCm: cm,
  weightKg: kg,
  activityLevel: 'moderate',
});
assert.ok(imperialTdee > 2400 && imperialTdee < 2520, 'imperial-converted tdee sane');
passed += 1;
const rawImperialTdee = calculateTdee({
  sex: 'male',
  age: 30,
  heightCm: 66,
  weightKg: 150,
  activityLevel: 'moderate',
});
assert.ok(rawImperialTdee - imperialTdee > 200, 'unconverted imperial inflates tdee');
passed += 1;

// --- parseServingGramsFromLabel: explicit weights only, never density guesses ---
check(parseServingGramsFromLabel('1 can (155g)'), 155, 'parse (155g)');
check(parseServingGramsFromLabel('1 tbsp (15ml)'), 15, 'parse (15ml)');
check(parseServingGramsFromLabel('100g'), 100, 'parse bare 100g');
check(parseServingGramsFromLabel('1 bottle (591ml)'), 591, 'parse bottle ml');
check(parseServingGramsFromLabel('1 cup'), null, 'volume-only cup -> null');
check(parseServingGramsFromLabel('1 tbsp'), null, 'volume-only tbsp -> null');
check(parseServingGramsFromLabel('1 serving'), null, 'label without weight -> null');
check(parseServingGramsFromLabel('5 pieces'), null, 'pieces -> null');
check(parseServingGramsFromLabel(''), null, 'empty -> null');
check(parseServingGramsFromLabel(null), null, 'null -> null');
check(parseServingGramsFromLabel(undefined), null, 'undefined -> null');

// --- convertQuantityToGrams: per-food serving weight with a 100g fallback ---
check(convertQuantityToGrams(2, 'servings', 155), 310, '2 servings x 155g');
check(convertQuantityToGrams(0.5, 'servings', 155), 77.5, 'half serving');
check(convertQuantityToGrams(2, 'servings'), 200, 'servings fallback 100g');
check(convertQuantityToGrams(2, 'servings', null), 200, 'null serving grams fallback');
check(convertQuantityToGrams(2, 'servings', 0), 200, 'zero serving grams fallback');
check(convertQuantityToGrams(2, 'servings', -5), 200, 'negative serving grams fallback');
check(convertQuantityToGrams(50, 'grams', 155), 50, 'grams ignore serving weight');
check(convertQuantityToGrams(50, 'ml', 155), 50, 'ml ignore serving weight');
check(convertQuantityToGrams(1, 'oz', 155), OUNCES_TO_GRAMS, 'oz ignore serving weight');

console.log(`calorie-targets: ${passed} checks passed`);
