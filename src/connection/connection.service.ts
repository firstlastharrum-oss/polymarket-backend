import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
process.env.PRISMA_CLIENT_ENGINE_TYPE =
  process.env.PRISMA_CLIENT_ENGINE_TYPE &&
  process.env.PRISMA_CLIENT_ENGINE_TYPE !== 'wasm'
    ? process.env.PRISMA_CLIENT_ENGINE_TYPE
    : 'binary';

@Injectable()
export class ConnectionService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }
}
