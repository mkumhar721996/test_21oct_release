import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { DefectsController } from './defects.controller';

const service = () => ({ create: vi.fn(async (i, r) => ({ id: 'd1', ...i, reporterId: r })) });

describe('DefectsController', () => {
  it('passes the header reporter, not the body one', async () => {
    const svc = service();
    const ctl = new DefectsController(svc as never);
    await ctl.create('user-42', { title: 'T', reporterId: 'someone-else' } as never);
    expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'T' }), 'user-42');
  });

  it('rejects a missing reporter with 401', async () => {
    const ctl = new DefectsController(service() as never);
    await expect(ctl.create(undefined, { title: 'T' })).rejects.toMatchObject({ status: 401 });
  });

  it('rejects a blank title with 400 naming the field', async () => {
    const ctl = new DefectsController(service() as never);
    await expect(ctl.create('user-42', { title: '  ' })).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ field: 'title' }),
    });
  });
});
