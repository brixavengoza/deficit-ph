import z from 'zod';

export const personalInfoSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  username: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dot, underscore, or dash'),
  email: z.string().trim().email('Enter a valid email'),
});

export const bodyMeasurementsSchema = z.object({
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

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type BodyMeasurementsValues = z.infer<typeof bodyMeasurementsSchema>;
