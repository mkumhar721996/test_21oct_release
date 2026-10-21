import { describe, expect, it } from 'vitest';
import { processJobs } from './worker.js';

describe('processJobs', () => {
  it('runs every job and returns the count', async () => {
    let calls = 0;
    const jobs = [1, 2, 3].map((n) => ({ id: String(n), run: async () => { calls += 1; } }));
    expect(await processJobs(jobs)).toBe(3);
    expect(calls).toBe(3);
  });
});
