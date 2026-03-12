import { z } from 'zod';
import { Frequency, PeriodType } from './types';

export const frequencySchema = z.enum(['day', 'week', 'month']) satisfies z.ZodType<Frequency>;
export const periodTypeSchema = z.enum(['day', 'week', 'month']) satisfies z.ZodType<PeriodType>;

export const triggerEventSchema = z.object({
  subjectKey: z.string().min(1),
  metricKey: z.string().min(1),
  quantity: z.number().int().positive(),
  occurredAt: z.union([z.string(), z.date()]).optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  eventKey: z.string().min(1).optional(),
});

export const getUserUsageReceiptSchema = z.object({
  subjectKey: z.string().min(1),
  metricKey: z.string().min(1),
  periodType: periodTypeSchema,
  anchorDate: z.union([z.string(), z.date()]).optional(),
});

export const historyRangeSchema = z
  .object({
    rangeStart: z.union([z.string(), z.date()]),
    rangeEnd: z.union([z.string(), z.date()]),
    frequency: frequencySchema,
  })
  .superRefine((value, ctx) => {
    const start = parseDateInput(value.rangeStart);
    const end = parseDateInput(value.rangeEnd);
    if (!(start && end) || end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangeEnd'],
        message: 'rangeEnd must be greater than rangeStart',
      });
      return;
    }

    const ms = end.getTime() - start.getTime();
    const days = ms / (1000 * 60 * 60 * 24);

    if (value.frequency === 'day' && days > 366) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangeEnd'],
        message: 'Daily range cannot exceed 366 days',
      });
    } else if (value.frequency === 'week' && days > 365 * 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangeEnd'],
        message: 'Weekly range cannot exceed 3 years',
      });
    } else if (value.frequency === 'month' && days > 365 * 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangeEnd'],
        message: 'Monthly range cannot exceed 10 years',
      });
    }
  });

export function parseDateInput(input: string | Date | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return new Date(input);
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
