import { Module } from '@nestjs/common';
import { DefectsModule } from './defects/defects.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DefectsModule],
  controllers: [HealthController],
})
export class AppModule {}
