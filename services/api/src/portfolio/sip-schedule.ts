import { Sip } from './seed-data';

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Latest scheduled date (YYYY-MM-DD, UTC) on or before `today`, or null if the SIP never runs. */
export function latestScheduledDate(sip: Sip, today: Date): string | null {
  const { dayOfMonth } = sip;
  if (!sip.active || sip.frequency !== 'monthly') return null;
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) return null;
  const month = today.getUTCDate() >= dayOfMonth ? today.getUTCMonth() : today.getUTCMonth() - 1;
  return isoDate(new Date(Date.UTC(today.getUTCFullYear(), month, dayOfMonth)));
}

/** The scheduled date this SIP should execute for now, or null. */
export function dueDate(sip: Sip, today: Date): string | null {
  const scheduled = latestScheduledDate(sip, today);
  if (scheduled === null) return null;
  const due = sip.lastRunOn === null ? scheduled === isoDate(today) : sip.lastRunOn < scheduled;
  return due ? scheduled : null;
}
