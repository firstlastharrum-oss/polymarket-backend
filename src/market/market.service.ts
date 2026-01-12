import { Injectable, BadRequestException } from '@nestjs/common';
import { ConnectionService } from '../connection/connection.service';
import { BetsService } from '../../bets/bets/bets.service';

@Injectable()
export class MarketService {
  constructor(
    private readonly connection: ConnectionService,
    private readonly bets: BetsService,
  ) {}

  async match(betId: number) {
    if (!betId) throw new BadRequestException('Invalid betId');
    await this.bets.tryMatch(betId);
    return { success: true };
  }

  async resolve(adminUserId: number, matchId: number, outcome: string) {
    return await this.bets.resolveMatch(adminUserId, matchId, outcome);
  }

  async getPoolByMarket(idOrHash: string) {
    const asNum = Number(idOrHash);
    if (!isNaN(asNum) && asNum > 0) {
      const pool = await this.connection.pool.findUnique({
        where: { matchId: asNum },
      });
      if (!pool) throw new BadRequestException('Pool not found');
      return { success: true, pool };
    }
    const pool = await this.connection.pool.findFirst({
      where: { marketId: idOrHash },
    });
    if (!pool) throw new BadRequestException('Pool not found');
    return { success: true, pool };
  }

  async getUserBalance(userId: number) {
    if (!userId) throw new BadRequestException('Invalid userId');
    const balance = await this.connection.balance.findUnique({
      where: { userId },
    });
    return { success: true, balance: balance || { available: 0, locked: 0 } };
  }
}
