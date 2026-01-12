import { Controller, Get, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { BetsService } from '../../bets/bets/bets.service';
import { CookieAuthGuard } from 'orders/orders/orders.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly betsService: BetsService) {}

  @Get('challenges')
  @UseGuards(CookieAuthGuard)
  async challenges(@Req() req: any) {
    const adminUserId = req.user?.id;
    if (!adminUserId) throw new BadRequestException('Invalid user');
    return await this.betsService.getAdminChallenges(adminUserId);
  }
}
