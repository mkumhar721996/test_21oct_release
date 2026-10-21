import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DEFECTS_REPOSITORY, type DefectsRepository } from './defects.repository';

export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface NewDefect {
  title: string;
  severity: DefectSeverity;
  area: string;
  steps: string;
  attachmentId?: string;
}

export interface Defect extends NewDefect {
  id: string;
  status: 'open';
  reporterId: string;
  reportedAt: string;
}

const SEVERITIES: DefectSeverity[] = ['low', 'medium', 'high', 'critical'];

@Injectable()
export class DefectsService {
  constructor(@Inject(DEFECTS_REPOSITORY) private readonly repo: DefectsRepository) {}

  async create(input: NewDefect, reporterId: string): Promise<Defect> {
    const defect: Defect = {
      id: randomUUID(),
      title: input.title.trim(),
      severity: SEVERITIES.includes(input.severity) ? input.severity : 'medium',
      area: input.area ?? '',
      steps: input.steps ?? '',
      ...(input.attachmentId ? { attachmentId: input.attachmentId } : {}),
      status: 'open',
      reporterId,
      reportedAt: new Date().toISOString(),
    };
    await this.repo.insert(defect);
    return defect;
  }
}
