export type PeriodType = 'day' | 'week' | 'month';
export type Frequency = 'day' | 'week' | 'month';

export interface TriggerEventInput {
  subjectKey: string;
  metricKey: string;
  quantity: number;
  occurredAt?: string | Date;
  source?: string;
  metadata?: Record<string, unknown>;
  eventKey?: string;
  signature?: string;
  timestamp?: string;
  processInline?: boolean;
}

export interface TriggerEventResult {
  accepted: true;
  eventKey: string;
  queuedAt: string;
}

export interface CanonicalMeteringEventPayload {
  eventKey: string;
  subjectKey: string;
  metricKey: string;
  quantity: bigint;
  occurredAt: Date;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface GetUserUsageReceiptInput {
  subjectKey: string;
  metricKey: string;
  periodType: PeriodType;
  anchorDate?: string | Date;
}

export interface UsageReceipt {
  subjectKey: string;
  metricKey: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  totalUsage: bigint;
  eventCount: bigint;
  lastAggregatedAt: string | null;
}

export interface GetUsageHistoryInput {
  subjectKey: string;
  metricKey: string;
  rangeStart: string | Date;
  rangeEnd: string | Date;
  frequency: Frequency;
}

export interface UsageHistoryBucket {
  bucketStart: string;
  bucketEnd: string;
  total: bigint;
  eventCount: bigint;
}

export interface UsageHistoryResult {
  subjectKey: string;
  metricKey: string;
  frequency: Frequency;
  rangeStart: string;
  rangeEnd: string;
  buckets: UsageHistoryBucket[];
}

export interface GetLongitudinalUsageInput {
  metricKey: string;
  rangeStart: string | Date;
  rangeEnd: string | Date;
  frequency: Frequency;
  subjectKeys?: string[];
}

export interface LongitudinalUsageBucket {
  bucketStart: string;
  bucketEnd: string;
  total: bigint;
  eventCount: bigint;
}

export interface LongitudinalUsageResult {
  metricKey: string;
  frequency: Frequency;
  rangeStart: string;
  rangeEnd: string;
  subjectScope: 'global' | 'subset';
  buckets: LongitudinalUsageBucket[];
}
