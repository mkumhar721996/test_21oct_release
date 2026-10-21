import {
  BadGatewayException,
  BadRequestException,
  Controller,
  HttpException,
  Inject,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { ATTACHMENT_STORE, type AttachmentStore } from './attachment-store';
import { ServiceAuthGuard } from './service-auth.guard';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// The stored content type comes from the validated extension, never from the client.
const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  log: 'text/plain',
};

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('defects/attachments')
@UseGuards(ServiceAuthGuard)
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name);

  constructor(@Inject(ATTACHMENT_STORE) private readonly store: AttachmentStore) {}

  @Post()
  // Multer's own limit sits just above ours so oversize files reach the 413 check below.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES * 2 } }))
  async upload(
    @UploadedFile() file: UploadedFileLike | undefined,
  ): Promise<{ attachmentId: string; name: string }> {
    if (!file) throw new BadRequestException('Choose a file to attach.');
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new HttpException('That file is too large. Choose one under 10 MB.', 413);
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    const contentType = CONTENT_TYPES[ext];
    const declaredOk = contentType === 'text/plain' ? file.mimetype.startsWith('text/') : file.mimetype === contentType;
    if (!contentType || !declaredOk) {
      throw new HttpException(
        'That file type is not supported. Choose an image, PDF or text file.',
        415,
      );
    }
    const attachmentId = randomUUID();
    try {
      await this.store.put(`attachments/${attachmentId}`, file.buffer, contentType);
    } catch (err) {
      this.logger.error(`Attachment upload to the store failed: ${String(err)}`);
      throw new BadGatewayException(
        'We could not upload that file. Try again or submit without it.',
      );
    }
    return { attachmentId, name: file.originalname };
  }
}
