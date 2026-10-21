import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { AttachmentStore } from './attachment-store';

@Injectable()
export class S3AttachmentStore implements AttachmentStore {
  private readonly client = new S3Client({});

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.ATTACHMENTS_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
}
