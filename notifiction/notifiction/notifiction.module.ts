import { Module } from '@nestjs/common';

import { NotificationController } from './notifiction.controller';
import { ConnectionService } from 'src/connection/connection.service';
import { NotificationService } from './notifiction.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, ConnectionService],
})
export class NotificationModule {}
