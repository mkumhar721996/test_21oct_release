import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { Defect } from './defects.service';

export const DEFECTS_REPOSITORY = Symbol('DEFECTS_REPOSITORY');

export interface DefectsRepository {
  insert(defect: Defect): Promise<void>;
  findById(id: string): Promise<Defect | undefined>;
}

@Injectable()
export class PgDefectsRepository implements DefectsRepository {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async insert(d: Defect): Promise<void> {
    await this.pool.query(
      `INSERT INTO defects (id, title, severity, area, steps, attachment_id, status, reporter_id, reported_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [d.id, d.title, d.severity, d.area, d.steps, d.attachmentId ?? null, d.status, d.reporterId, d.reportedAt],
    );
  }

  async findById(id: string): Promise<Defect | undefined> {
    const { rows } = await this.pool.query(
      `SELECT id, title, severity, area, steps, attachment_id, status, reporter_id, reported_at
       FROM defects WHERE id = $1`,
      [id],
    );
    const r = rows[0];
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      severity: r.severity,
      area: r.area,
      steps: r.steps,
      ...(r.attachment_id ? { attachmentId: r.attachment_id } : {}),
      status: r.status,
      reporterId: r.reporter_id,
      reportedAt: new Date(r.reported_at).toISOString(),
    };
  }
}
