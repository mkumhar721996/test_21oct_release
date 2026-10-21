import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { DefectsRepository } from './defects.repository';
import { DefectsService, type Defect } from './defects.service';

function memoryRepo(): DefectsRepository & { rows: Defect[] } {
  const rows: Defect[] = [];
  return {
    rows,
    async insert(d) {
      rows.push(d);
    },
    async findById(id) {
      return rows.find((d) => d.id === id);
    },
  };
}

describe('DefectsService.create', () => {
  it('stores the defect with the given reporter', async () => {
    const repo = memoryRepo();
    const created = await new DefectsService(repo).create(
      { title: ' Crash on login ', severity: 'high', area: 'Login', steps: 'Open page' },
      'user-42',
    );
    expect(created).toMatchObject({ title: 'Crash on login', reporterId: 'user-42', status: 'open' });
    expect(await repo.findById(created.id)).toEqual(created);
  });

  it('omits attachmentId when none is given', async () => {
    const created = await new DefectsService(memoryRepo()).create(
      { title: 'x', severity: 'low', area: '', steps: '' },
      'user-42',
    );
    expect('attachmentId' in created).toBe(false);
  });
});
