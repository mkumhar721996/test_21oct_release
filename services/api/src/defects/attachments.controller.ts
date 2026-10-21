import {
  BadGatewayException,
  BadRequestException,
  Controller,
  HttpException,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { ATTACHMENT_STORE, type AttachmentStore } from './attachment-store';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = /^(image\/(png|jpeg|gif|webp)|application\/pdf|text\/plain)$/;
const ALLOWED_EXTENSIONS = /\.(png|jpe?g|gif|webp|pdf|txt|log)$/i;

interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('defects/attachments')
export class AttachmentsController {
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
    const typeOk = ALLOWED_TYPES.test(file.mimetype) || file.mimetype.startsWith('text/');
    if (!typeOk || !ALLOWED_EXTENSIONS.test(file.originalname)) {
      throw new HttpException(
        'That file type is not supported. Choose an image, PDF or text file.',
        415,
      );
    }
    const attachmentId = randomUUID();
    try {
      await this.store.put(`attachments/${attachmentId}`, file.buffer, file.mimetype);
    } catch {
      throw new BadGatewayException(
        'We could not upload that file. Try again or submit without it.',
      );
    }
    return { attachmentId, name: file.originalname };
  }
}
