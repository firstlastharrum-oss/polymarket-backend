import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketService } from './market.service';
import { CookieAuthGuard } from 'orders/orders/orders.guard';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('match')
  @UseGuards(CookieAuthGuard)
  async match(@Body('betId') betId: number) {
    return await this.marketService.match(Number(betId));
  }

  @Post('resolve')
  @UseGuards(CookieAuthGuard)
  async resolve(
    @Req() req: Request & { user?: { id: number } },
    @Body('matchId') matchId: number,
    @Body('outcome') outcome: string,
  ) {
    const userId = req.user?.id;
    if (!userId || !matchId || !outcome)
      throw new BadRequestException('Invalid request');
    return await this.marketService.resolve(
      userId,
      Number(matchId),
      String(outcome),
    );
  }

  @Get(':id/pool')
  @UseGuards(CookieAuthGuard)
  async getPool(@Param('id') id: string) {
    return await this.marketService.getPoolByMarket(id);
  }

  @Get('user/:id/balance')
  @UseGuards(CookieAuthGuard)
  async getBalance(@Param('id') id: string) {
    return await this.marketService.getUserBalance(Number(id));
  }
}
