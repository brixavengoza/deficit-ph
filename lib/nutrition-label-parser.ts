export type NutritionLabelDraft = {
  foodName: string;
  servingSizeLabel: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
  sodiumMgPer100g: number;
  confidence: number;
  rawText: string;
};

function normalizeText(text: string) {
  return text.replace(/\r/g, '\n').replace(/[|•]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeLines(text: string) {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[|•]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const parsed = parseNumber(match?.[1]);
    if (parsed != null) return parsed;
  }
  return null;
}

function matchNutrientNumber(text: string, labels: string[], unit: 'g' | 'mg') {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(
      new RegExp(`\\b${escapedLabel}\\b\\s*(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i')
    );
    if (match) return parseNumber(match[1]);
  }

  return null;
}

const NUTRIENT_BOUNDARY_LABELS = [
  'energy',
  'calories',
  'protein',
  'total fat',
  'saturated fat',
  'trans fat',
  'cholesterol',
  'total carbohydrate',
  'carbohydrate',
  'carbohydrates',
  'carbs',
  'dietary fiber',
  'dietary fibre',
  'fiber',
  'fibre',
  'total sugar',
  'total sugars',
  'sugar',
  'sugars',
  'sodium',
  'socium',
  'vitamin',
  'calcium',
  'iron',
];

function labelRegex(label: string) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractUnitValues(text: string, unit: 'g' | 'mg' | 'kcal') {
  const matches = [...text.matchAll(new RegExp(`<?\\s*(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'gi'))];
  return matches.map((match) => parseNumber(match[1])).filter((value) => value != null);
}

function matchRowPer100Value(lines: string[], labels: string[], unit: 'g' | 'mg' | 'kcal') {
  for (const line of lines) {
    const nutrientLabelCount = NUTRIENT_BOUNDARY_LABELS.filter((label) =>
      new RegExp(`\\b${labelRegex(label)}\\b`, 'i').test(line)
    ).length;
    if (nutrientLabelCount > 2) continue;

    const hasLabel = labels.some((label) =>
      new RegExp(`\\b${labelRegex(label)}\\b`, 'i').test(line)
    );
    if (!hasLabel) continue;

    const values = extractUnitValues(line, unit);
    if (values.length >= 2) return values[1];
    if (values.length === 1 && /per\s*100\s*(?:g|ml)/i.test(line)) return values[0];
  }

  return null;
}

function matchSegmentPer100Value(text: string, labels: string[], unit: 'g' | 'mg' | 'kcal') {
  for (const label of labels) {
    const labelMatch = text.match(new RegExp(`\\b${labelRegex(label)}\\b`, 'i'));
    if (!labelMatch || labelMatch.index == null) continue;

    const segmentStart = labelMatch.index;
    const afterLabelStart = segmentStart + labelMatch[0].length;
    let segmentEnd = text.length;

    for (const boundaryLabel of NUTRIENT_BOUNDARY_LABELS) {
      if (boundaryLabel === label) continue;
      const boundaryMatch = text
        .slice(afterLabelStart)
        .match(new RegExp(`\\b${labelRegex(boundaryLabel)}\\b`, 'i'));
      if (boundaryMatch?.index != null) {
        segmentEnd = Math.min(segmentEnd, afterLabelStart + boundaryMatch.index);
      }
    }

    const values = extractUnitValues(text.slice(segmentStart, segmentEnd), unit);
    if (values.length >= 2) return values[1];
  }

  return null;
}

function matchServingSize(text: string) {
  const explicitMatch = text.match(
    /serving size\s*:?\s*(.+?)\s*(?=nutrition\s+information|servings?\s+per|per\s+serving|per\s+100|amount\s+per|calories|energy|$)/i
  );
  const explicitServing = cleanServingLabel(explicitMatch?.[1]);
  if (explicitServing) return explicitServing;

  const leadingServingMatch = text.match(/:?\s*(\d+(?:\.\d+)?\s*(?:g|ml)\s*(?:\([^)]{1,40}\))?)/i);
  return cleanServingLabel(leadingServingMatch?.[1]) || '1 serving';
}

function inferFoodName(text: string) {
  const candidates = text
    .split(/nutrition facts|amount per serving|calories/i)[0]
    ?.replace(/[^a-z0-9\s,&'-]/gi, ' ')
    .trim();

  if (candidates && candidates.length >= 2 && candidates.length <= 48) return candidates;
  return 'Scanned Food';
}

function cleanServingLabel(value: string | undefined) {
  if (!value) return null;
  const cleaned = value
    .replace(/^[:\s]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*nutrition\s+information.*$/i, '')
    .replace(/\s*(?:servings?\s+per|per\s+serving|per\s+100|amount\s+per).*$/i, '')
    .trim();

  if (!/\d/.test(cleaned) || cleaned.length > 64) return null;
  return cleaned;
}

function servingGramsFromLabel(servingSizeLabel: string) {
  const gramMatch = servingSizeLabel.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  const mlMatch = servingSizeLabel.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  return parseNumber(gramMatch?.[1] ?? mlMatch?.[1]) ?? 100;
}

function toPer100(value: number | null, servingGrams: number) {
  if (value == null || servingGrams <= 0) return 0;
  return Math.round((value / servingGrams) * 1000) / 10;
}

export function parseNutritionLabelText(rawText: string): NutritionLabelDraft {
  const lines = normalizeLines(rawText);
  const text = normalizeText(rawText);
  const servingSizeLabel = matchServingSize(text);
  const servingGrams = servingGramsFromLabel(servingSizeLabel);
  const caloriesPer100 =
    matchRowPer100Value(lines, ['energy', 'calories'], 'kcal') ??
    matchSegmentPer100Value(text, ['energy', 'calories'], 'kcal');
  const calories =
    caloriesPer100 ??
    matchNumber(text, [
      /per\s+serving\s+(\d+(?:\.\d+)?)\s*kcal/i,
      /calories\s*(?:per serving)?\s*(\d+(?:\.\d+)?)/i,
      /energy\s*(\d+(?:\.\d+)?)\s*kcal/i,
      /\b(\d+(?:\.\d+)?)\s*kcal\b/i,
    ]);
  const proteinPer100 =
    matchRowPer100Value(lines, ['protein'], 'g') ?? matchSegmentPer100Value(text, ['protein'], 'g');
  const carbsPer100 =
    matchRowPer100Value(
      lines,
      ['total carbohydrate', 'carbohydrate', 'carbohydrates', 'carbs'],
      'g'
    ) ??
    matchSegmentPer100Value(
      text,
      ['total carbohydrate', 'carbohydrate', 'carbohydrates', 'carbs'],
      'g'
    );
  const fatPer100 =
    matchRowPer100Value(lines, ['total fat', 'fat', 'tolen saturated fat'], 'g') ??
    matchSegmentPer100Value(text, ['total fat', 'fat', 'tolen saturated fat'], 'g');
  const fiberPer100 =
    matchRowPer100Value(lines, ['dietary fiber', 'dietary fibre', 'fiber', 'fibre'], 'g') ??
    matchSegmentPer100Value(text, ['dietary fiber', 'dietary fibre', 'fiber', 'fibre'], 'g');
  const sugarPer100 =
    matchRowPer100Value(lines, ['total sugar', 'total sugars', 'sugar', 'sugars'], 'g') ??
    matchSegmentPer100Value(text, ['total sugar', 'total sugars', 'sugar', 'sugars'], 'g');
  const sodiumPer100 =
    matchRowPer100Value(lines, ['sodium', 'socium'], 'mg') ??
    matchSegmentPer100Value(text, ['sodium', 'socium'], 'mg');
  const protein = proteinPer100 ?? matchNutrientNumber(text, ['protein'], 'g');
  const carbs =
    carbsPer100 ??
    matchNutrientNumber(
      text,
      ['total carbohydrate', 'carbohydrate', 'carbohydrates', 'carbs'],
      'g'
    );
  const fat =
    fatPer100 ??
    matchNutrientNumber(text, ['total fat', 'fat', 'tolen saturated fat', 'saturated fat'], 'g');
  const fiber =
    fiberPer100 ??
    matchNutrientNumber(text, ['dietary fiber', 'dietary fibre', 'fiber', 'fibre'], 'g');
  const sugar =
    sugarPer100 ??
    matchNutrientNumber(text, ['total sugar', 'total sugars', 'sugar', 'sugars'], 'g');
  const sodium = sodiumPer100 ?? matchNutrientNumber(text, ['sodium', 'socium'], 'mg');

  const foundFields = [calories, protein, carbs, fat, fiber, sugar, sodium].filter(
    (value) => value != null
  ).length;

  return {
    foodName: inferFoodName(text),
    servingSizeLabel,
    caloriesPer100g: caloriesPer100 ?? toPer100(calories, servingGrams),
    proteinPer100g: proteinPer100 ?? toPer100(protein, servingGrams),
    carbsPer100g: carbsPer100 ?? toPer100(carbs, servingGrams),
    fatsPer100g: fatPer100 ?? toPer100(fat, servingGrams),
    fiberPer100g: fiberPer100 ?? toPer100(fiber, servingGrams),
    sugarPer100g: sugarPer100 ?? toPer100(sugar, servingGrams),
    sodiumMgPer100g: sodiumPer100 ?? toPer100(sodium, servingGrams),
    confidence: Math.min(0.95, Math.max(0.25, foundFields / 7)),
    rawText,
  };
}
