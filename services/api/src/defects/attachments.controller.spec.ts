import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentsController } from './attachments.controller';

const file = (name: string, mimetype: string, size = 10) => ({
  originalname: name,
  mimetype,
  size,
  buffer: Buffer.from('x'),
});

describe('AttachmentsController', () => {
  it('stores a valid file and returns its id and name', async () => {
    const store = { put: vi.fn().mockResolvedValue(undefined) };
    const res = await new AttachmentsController(store).upload(file('ok.png', 'image/png'));
    expect(res.name).toBe('ok.png');
    expect(store.put).toHaveBeenCalledWith(`attachments/${res.attachmentId}`, expect.any(Buffer), 'image/png');
  });

  it('stores text files as text/plain whatever the client declared', async () => {
    const store = { put: vi.fn().mockResolvedValue(undefined) };
    await new AttachmentsController(store).upload(file('notes.txt', 'text/html'));
    expect(store.put).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), 'text/plain');
  });

  it('rejects an image whose declared type does not match its extension', async () => {
    await expect(
      new AttachmentsController({ put: vi.fn() }).upload(file('a.png', 'text/html')),
    ).rejects.toMatchObject({ status: 415 });
  });

  it('rejects an unsupported type with 415', async () => {
    const store = { put: vi.fn() };
    await expect(
      new AttachmentsController(store).upload(file('virus.exe', 'application/octet-stream')),
    ).rejects.toMatchObject({ status: 415 });
    expect(store.put).not.toHaveBeenCalled();
  });

  it('rejects an oversize file with 413 and a plain message', async () => {
    await expect(
      new AttachmentsController({ put: vi.fn() }).upload(file('big.png', 'image/png', 11 * 1024 * 1024)),
    ).rejects.toMatchObject({
      status: 413,
      message: 'That file is too large. Choose one under 10 MB.',
    });
  });

  it('answers 502 when the store fails', async () => {
    const store = { put: vi.fn().mockRejectedValue(new Error('s3 down')) };
    await expect(new AttachmentsController(store).upload(file('ok.png', 'image/png'))).rejects.toMatchObject({
      status: 502,
      message: 'We could not upload that file. Try again or submit without it.',
    });
  });

  it('rejects a missing file with 400', async () => {
    await expect(new AttachmentsController({ put: vi.fn() }).upload(undefined)).rejects.toMatchObject({
      status: 400,
    });
  });
});
