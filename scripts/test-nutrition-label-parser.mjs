import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrition-parser-'));
const tscBin = path.join(rootDir, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBin,
  [
    path.join(rootDir, 'lib', 'nutrition-label-parser.ts'),
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

const { parseNutritionLabelText } = await import(
  pathToFileURL(path.join(outDir, 'nutrition-label-parser.js')).href
);

const fixtures = [
  {
    name: 'tuna table rows with per serving and per 100g columns',
    rawText: `
      NUTRITION INFORMATION
      Serving size: 56g (4 tablespoons)
      Servings per package: 3
      PER SERVING PER 100 g
      Energy 40 kcal 70 kcal
      Protein 9 g 16 g
      Total Fat 0 g 0 g
      Saturated Fat 0 g 0 g
      Trans Fat 0 g 0 g
      Cholesterol 15 mg 30 mg
      Carbohydrate <1 g 1 g
      Dietary Fibre 0 g 0 g
      Sodium 150 mg 270 mg
    `,
    expected: {
      servingSizeLabel: '56g (4 tablespoons)',
      caloriesPer100g: 70,
      proteinPer100g: 16,
      carbsPer100g: 1,
      fatsPer100g: 0,
      fiberPer100g: 0,
      sodiumMgPer100g: 270,
    },
  },
  {
    name: 'tuna collapsed OCR text with table values in one line',
    rawText:
      'Serving size: 56g (4 tablespoons) NUTRITION INFORMATION Servings per package: 3 PER SERVING PER 100 g Energy 40 kcal 70 kcal Protein 9 g 16 g Total Fat 0 g 0 g Carbohydrate <1 g 1 g Dietary Fibre 0 g 0 g Sodium 150 mg 270 mg',
    expected: {
      servingSizeLabel: '56g (4 tablespoons)',
      caloriesPer100g: 70,
      proteinPer100g: 16,
      carbsPer100g: 1,
      fatsPer100g: 0,
      fiberPer100g: 0,
      sodiumMgPer100g: 270,
    },
  },
  {
    name: 'cereal single serving column converted to per 100g',
    rawText: `
      Honey Nut Cheerios
      Nutrition Facts
      Per 3/4 cup (29 g)
      Amount Cereal
      Calories 110
      Fat 1.5 g
      Sodium 160 mg
      Carbohydrate 23 g
      Fibre 2 g
      Sugars 9 g
      Protein 3 g
    `,
    expected: {
      servingSizeLabel: '29 g',
      caloriesPer100g: 379.3,
      proteinPer100g: 10.3,
      carbsPer100g: 79.3,
      fatsPer100g: 5.2,
      fiberPer100g: 6.9,
      sugarPer100g: 31,
      sodiumMgPer100g: 551.7,
    },
  },
  {
    name: 'cereal two nutrition columns should prefer cereal-only first column',
    rawText: `
      Honey Nut Cheerios
      Nutrition Facts
      Per 3/4 cup (29 g)
      Cereal Only Cereal + 125 mL Milk
      Calories 110 170
      Fat 1.5 g 2 %
      Sodium 160 mg 7 %
      Carbohydrate 23 g 8 %
      Fibre 2 g 8 %
      Sugars 9 g
      Protein 3 g
    `,
    expected: {
      servingSizeLabel: '29 g',
      caloriesPer100g: 379.3,
      proteinPer100g: 10.3,
      carbsPer100g: 79.3,
      fatsPer100g: 5.2,
      fiberPer100g: 6.9,
      sugarPer100g: 31,
      sodiumMgPer100g: 551.7,
    },
  },
  {
    name: 'android ml kit single-column blocks with no-space units',
    rawText: `
      Piattos
      Nutrition Facts
      Serving Size 30 g
      Servings Per Container 8
      Calories 150
      Total Fat 8g
      Sodium 210mg
      Total Carbohydrate 18g
      Dietary Fiber 1g
      Sugars 6g
      Protein 5g
    `,
    expected: {
      servingSizeLabel: '30 g',
      caloriesPer100g: 500,
      proteinPer100g: 16.7,
      carbsPer100g: 60,
      fatsPer100g: 26.7,
      fiberPer100g: 3.3,
      sugarPer100g: 20,
      sodiumMgPer100g: 700,
    },
  },
  {
    name: 'android ml kit two-column table with per 100 g',
    rawText: `
      Chippy
      NUTRITION FACTS
      Serving Size 28 g
      Per Serving Per 100 g
      Energy 140 kcal 490 kcal
      Protein 2 g 7 g
      Total Fat 7 g 25 g
      Total Carbohydrate 17 g 60 g
      Dietary Fiber 1 g 3.5 g
      Sugars 2 g 7 g
      Sodium 180 mg 630 mg
    `,
    expected: {
      servingSizeLabel: '28 g',
      caloriesPer100g: 490,
      proteinPer100g: 7,
      carbsPer100g: 60,
      fatsPer100g: 25,
      fiberPer100g: 3.5,
      sugarPer100g: 7,
      sodiumMgPer100g: 630,
    },
  },
];

function assertClose(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= 0.11,
    `${label}: expected ${expected}, received ${actual}`
  );
}

for (const fixture of fixtures) {
  const parsed = parseNutritionLabelText(fixture.rawText);
  assert.equal(parsed.servingSizeLabel, fixture.expected.servingSizeLabel, fixture.name);

  for (const [key, expected] of Object.entries(fixture.expected)) {
    if (key === 'servingSizeLabel') continue;
    assertClose(parsed[key], expected, `${fixture.name} ${key}`);
  }
}

console.log(`Nutrition parser fixtures passed: ${fixtures.length}`);
