import { Controller, Get, Query, Param } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  getLeaderboard(@Query('type') type: string, @Query('limit') limit: number) {
    return this.gamificationService.getLeaderboard(type, limit);
  }

  @Get('user/:id')
  getUserStats(@Param('id') id: string) {
    return this.gamificationService.getUserStats(Number(id));
  }

  @Get('profile/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.gamificationService.getPublicProfile(Number(id));
  }
}
