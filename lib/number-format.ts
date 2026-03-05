type CompactStyle = 'short' | 'long';

function addThousandsSeparators(intPart: string): string {
  if (!intPart) return '0';
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function normalizeNumericInputRaw(input: string): string {
  const cleaned = input.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const [firstPart = '', ...restParts] = cleaned.split('.');
  const decimalPart = restParts.join('');

  const normalizedInt =
    firstPart.length === 0 ? '0' : firstPart.replace(/^0+(?=\d)/, '') || '0';

  if (cleaned.startsWith('.') && restParts.length === 0) {
    return '0.';
  }

  if (cleaned.endsWith('.') && restParts.length === 0) {
    return `${normalizedInt}.`;
  }

  if (restParts.length > 0) {
    return `${normalizedInt}.${decimalPart}`;
  }

  return normalizedInt;
}

export function formatNumericInputDisplay(rawValue: string): string {
  if (!rawValue) return '';

  const cleaned = rawValue.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const endsWithDot = cleaned.endsWith('.');
  const [intPart = '', decimalPart] = cleaned.split('.');
  const normalizedInt = intPart.length === 0 ? '0' : intPart.replace(/^0+(?=\d)/, '') || '0';
  const formattedInt = addThousandsSeparators(normalizedInt);

  if (endsWithDot) return `${formattedInt}.`;
  if (decimalPart !== undefined) return `${formattedInt}.${decimalPart}`;
  return formattedInt;
}

export function formatNumberGrouped(
  value: number | string,
  options?: Intl.NumberFormatOptions
): string {
  const numeric =
    typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());

  if (!Number.isFinite(numeric)) return String(value);

  return new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
    ...options,
  }).format(numeric);
}

export function formatCompactNumber(
  value: number,
  options?: { maximumFractionDigits?: number; style?: CompactStyle }
): string {
  if (!Number.isFinite(value)) return '0';

  return new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    compactDisplay: options?.style ?? 'short',
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(value);
}

export function formatMeasure(value: number | string, unit: string): string {
  return `${formatNumberGrouped(value)}${unit}`;
}
