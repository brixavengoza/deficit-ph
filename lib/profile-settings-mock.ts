export type Units = 'Metric' | 'Imperial';
export type ThemeMode = 'Auto' | 'Light' | 'Dark';
export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Very Active';

export const PROFILE_IDENTITY_MOCK = {
  fullName: 'Alex Morgan',
  username: 'alexmorgan',
  memberSinceYear: 2023,
} as const;

export const PROFILE_PERSONAL_INFO_MOCK = {
  fullName: 'Alex Morgan',
  username: 'alexmorgan',
  email: 'alex@example.com',
} as const;

export const PROFILE_BODY_MEASUREMENTS_MOCK = {
  height: '170',
  weight: '74.2',
  goalWeight: '68',
} as const;

export const PROFILE_APP_PREFERENCES_MOCK = {
  notifications: true,
  units: 'Metric' as Units,
  theme: 'Auto' as ThemeMode,
  activityLevel: 'Moderate' as ActivityLevel,
} as const;

export const PROFILE_STATS_MOCK = {
  weight: '74.2',
  calorieGoal: '1,650',
  streakDays: '18',
} as const;

export const UNITS_OPTIONS = ['Metric', 'Imperial'] as const;
export const THEME_OPTIONS = ['Auto', 'Light', 'Dark'] as const;
export const ACTIVITY_LEVEL_OPTIONS = ['Sedentary', 'Light', 'Moderate', 'Very Active'] as const;
