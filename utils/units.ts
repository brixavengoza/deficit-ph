/**
 * Unit conversion helpers.
 *
 * The DB and ALL calorie / BMI / guardrail math are canonical in metric (cm, kg).
 * The UI may collect Imperial (in, lb) depending on the user's `units` preference.
 * Every write path must convert display units → metric BEFORE persisting, and every
 * editable read path must convert metric → display units. Storing raw Imperial numbers
 * as if they were metric silently corrupts BMI and calorie targets (safety-critical,
 * CLAUDE.md rule 6): e.g. a 140 lb user stored as 140 "kg" reads as morbidly obese.
 */

export type MeasurementUnits = 'Metric' | 'Imperial';

// Matches the existing pounds→kg constant used in components/progress/weight-log-modal.tsx.
export const LB_TO_KG = 0.45359237;
export const IN_TO_CM = 2.54;

/** Height typed in the user's units → canonical centimetres. */
export function heightInputToCm(value: number, units: MeasurementUnits): number {
  return units === 'Imperial' ? value * IN_TO_CM : value;
}

/** Weight typed in the user's units → canonical kilograms. */
export function weightInputToKg(value: number, units: MeasurementUnits): number {
  return units === 'Imperial' ? value * LB_TO_KG : value;
}

/** Canonical centimetres → the user's display units. */
export function heightCmToDisplay(cm: number, units: MeasurementUnits): number {
  return units === 'Imperial' ? cm / IN_TO_CM : cm;
}

/** Canonical kilograms → the user's display units. */
export function weightKgToDisplay(kg: number, units: MeasurementUnits): number {
  return units === 'Imperial' ? kg / LB_TO_KG : kg;
}
