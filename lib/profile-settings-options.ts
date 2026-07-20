export type Units = 'Metric' | 'Imperial';
export type ThemeMode = 'Auto' | 'Light' | 'Dark';
export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Very Active';

export const UNITS_OPTIONS = ['Metric', 'Imperial'] as const;
export const THEME_OPTIONS = ['Auto', 'Light', 'Dark'] as const;
export const ACTIVITY_LEVEL_OPTIONS = ['Sedentary', 'Light', 'Moderate', 'Very Active'] as const;
