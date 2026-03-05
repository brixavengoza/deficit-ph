import { z } from 'zod';

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, underscore, or dash'),
  email: z.string().trim().email('Enter a valid email'),
  height: z
    .string()
    .trim()
    .min(1, 'Height is required')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a valid height'),
  weight: z
    .string()
    .trim()
    .min(1, 'Weight is required')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a valid weight'),
  goalWeight: z
    .string()
    .trim()
    .min(1, 'Goal weight is required')
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a valid goal weight'),
});

export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

export const PROFILE_DEFAULT_VALUES: ProfileSettingsFormValues = {
  fullName: 'Alex Morgan',
  username: 'alexmorgan',
  email: 'alex@example.com',
  height: '170',
  weight: '74.2',
  goalWeight: '68',
};
