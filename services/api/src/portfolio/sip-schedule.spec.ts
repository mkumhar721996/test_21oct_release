import { describe, expect, it } from 'vitest';
import { Sip } from './seed-data';
import { dueDate, latestScheduledDate } from './sip-schedule';

const sip: Sip = {
  id: 's',
  symbol: 'ITC',
  amount: 300000,
  dayOfMonth: 15,
  frequency: 'monthly',
  active: true,
  lastRunOn: null,
};
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('sip schedule', () => {
  it('is due on the scheduled day (AC1)', () => {
    expect(dueDate(sip, at('2026-10-15'))).toBe('2026-10-15');
    expect(dueDate({ ...sip, lastRunOn: '2026-10-15' }, at('2026-10-14'))).toBeNull();
  });

  it('is not due again once that date has run (AC2)', () => {
    expect(dueDate({ ...sip, lastRunOn: '2026-10-15' }, at('2026-10-15'))).toBeNull();
    expect(dueDate({ ...sip, lastRunOn: '2026-10-15' }, at('2026-10-20'))).toBeNull();
  });

  it('treats 1 and 28 as valid bounds (AC6)', () => {
    expect(dueDate({ ...sip, dayOfMonth: 28 }, at('2026-02-28'))).toBe('2026-02-28');
    expect(dueDate({ ...sip, dayOfMonth: 1 }, at('2026-10-01'))).toBe('2026-10-01');
  });

  it('never runs day 29 or other invalid days (AC7)', () => {
    const s29 = { ...sip, dayOfMonth: 29 };
    expect(dueDate(s29, at('2026-10-29'))).toBeNull();
    expect(dueDate({ ...s29, lastRunOn: '2026-08-01' }, at('2026-10-30'))).toBeNull();
    expect(latestScheduledDate({ ...sip, dayOfMonth: 0 }, at('2026-10-30'))).toBeNull();
    expect(latestScheduledDate({ ...sip, dayOfMonth: 1.5 }, at('2026-10-30'))).toBeNull();
  });

  it('skips non-monthly and inactive SIPs (AC8)', () => {
    expect(dueDate({ ...sip, frequency: 'weekly' }, at('2026-10-15'))).toBeNull();
    expect(dueDate({ ...sip, frequency: 'daily' }, at('2026-10-15'))).toBeNull();
    expect(dueDate({ ...sip, active: false }, at('2026-10-15'))).toBeNull();
  });

  it('catches up with a single date after missed runs (AC9)', () => {
    expect(dueDate({ ...sip, lastRunOn: '2026-07-15' }, at('2026-10-22'))).toBe('2026-10-15');
    expect(dueDate({ ...sip, lastRunOn: '2026-07-15' }, at('2026-10-10'))).toBe('2026-09-15');
  });

  it('treats a null lastRunOn as never run and catches up with one date (AC9)', () => {
    expect(dueDate(sip, at('2026-10-22'))).toBe('2026-10-15');
    expect(dueDate(sip, at('2026-10-10'))).toBe('2026-09-15');
    expect(dueDate(sip, at('2026-10-15'))).toBe('2026-10-15');
  });

  it('rolls back over the year boundary', () => {
    expect(dueDate({ ...sip, dayOfMonth: 20, lastRunOn: '2025-11-20' }, at('2026-01-10'))).toBe(
      '2025-12-20',
    );
  });
});
