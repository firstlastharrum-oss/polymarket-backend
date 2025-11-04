import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ConnectionService } from 'src/connection/connection.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, ConnectionService],
})
export class AssetsModule {}
