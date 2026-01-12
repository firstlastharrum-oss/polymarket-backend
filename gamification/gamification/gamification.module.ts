import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { ConnectionService } from '../../src/connection/connection.service';

@Module({
  controllers: [GamificationController],
  providers: [GamificationService, ConnectionService],
  exports: [GamificationService],
})
export class GamificationModule {}
