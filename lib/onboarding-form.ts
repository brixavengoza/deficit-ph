import { z } from 'zod';

export const onboardingSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z
    .string()
    .min(1, 'Age is required.')
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 13 && n <= 100;
    }, 'Enter a valid age.'),
  heightCm: z
    .string()
    .min(1, 'Height is required.')
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 100 && n <= 250;
    }, 'Enter valid height.'),
  weightKg: z
    .string()
    .min(1, 'Weight is required.')
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 30 && n <= 300;
    }, 'Enter valid weight.'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very']),
  goal: z.enum(['lose', 'maintain', 'gain']),
});

export const stepOneSchema = onboardingSchema.pick({
  sex: true,
  age: true,
  heightCm: true,
  weightKg: true,
});

export const stepTwoSchema = onboardingSchema.pick({
  activityLevel: true,
});

export const stepThreeSchema = onboardingSchema.pick({
  goal: true,
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
