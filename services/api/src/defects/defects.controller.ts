import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { DefectsService, type Defect, type NewDefect } from './defects.service';

@Controller('defects')
export class DefectsController {
  constructor(private readonly defects: DefectsService) {}

  @Post()
  async create(
    @Headers('x-user-id') reporterId: string | undefined,
    @Body() body: Partial<NewDefect> | undefined,
  ): Promise<Defect> {
    if (!reporterId?.trim()) throw new UnauthorizedException('Sign in to report a defect.');
    if (typeof body?.title !== 'string' || !body.title.trim()) {
      throw new BadRequestException({ field: 'title', message: 'Enter a title for the defect.' });
    }
    // Reporter comes only from the trusted header; any reporterId in the body is ignored.
    return this.defects.create(
      {
        title: body.title,
        severity: body.severity as NewDefect['severity'],
        area: typeof body.area === 'string' ? body.area : '',
        steps: typeof body.steps === 'string' ? body.steps : '',
        attachmentId: typeof body.attachmentId === 'string' ? body.attachmentId : undefined,
      },
      reporterId.trim(),
    );
  }
}
