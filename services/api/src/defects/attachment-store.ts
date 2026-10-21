export const ATTACHMENT_STORE = Symbol('ATTACHMENT_STORE');

export interface AttachmentStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
}
