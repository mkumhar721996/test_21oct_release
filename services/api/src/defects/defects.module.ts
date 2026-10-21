import { Module } from '@nestjs/common';
import { ATTACHMENT_STORE } from './attachment-store';
import { AttachmentsController } from './attachments.controller';
import { DefectsController } from './defects.controller';
import { DEFECTS_REPOSITORY, PgDefectsRepository } from './defects.repository';
import { DefectsService } from './defects.service';
import { S3AttachmentStore } from './s3-attachment-store';

@Module({
  // AttachmentsController first so /defects/attachments is not shadowed by a future /defects/:id.
  controllers: [AttachmentsController, DefectsController],
  providers: [
    DefectsService,
    { provide: DEFECTS_REPOSITORY, useClass: PgDefectsRepository },
    { provide: ATTACHMENT_STORE, useClass: S3AttachmentStore },
  ],
})
export class DefectsModule {}
