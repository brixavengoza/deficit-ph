import z from 'zod';

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

export type BodyMeasurementsValues = z.infer<typeof bodyMeasurementsSchema>;
