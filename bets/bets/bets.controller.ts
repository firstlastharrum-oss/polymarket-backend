import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { BetsService } from './bets.service';
import { CookieAuthGuard } from 'orders/orders/orders.guard';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Invalid user');
    return await this.betsService.createBet(userId, body);
  }

  @Get()
  @UseGuards(CookieAuthGuard)
  async list(@Query() query: any) {
    return await this.betsService.listBets(query);
  }

  @Get('mine')
  @UseGuards(CookieAuthGuard)
  async listMine(@Req() req: any, @Query() query: any) {
    const userId = req.user?.id;
    return await this.betsService.listMyBets(userId, query);
  }

  @Get('positions/mine')
  @UseGuards(CookieAuthGuard)
  async positionsMine(@Req() req: any) {
    const userId = req.user?.id;
    return await this.betsService.listMyPositions(userId);
  }

  @Get('matches')
  @UseGuards(CookieAuthGuard)
  async matches() {
    return await this.betsService.listMatches();
  }

  @Get('matches/:id/admin-overview')
  @UseGuards(CookieAuthGuard)
  async marketAdminOverview(@Req() req: any, @Param('id') id: string) {
    const adminUserId = req.user?.id;
    const matchId = Number(id);
    if (!adminUserId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.getMarketAdminOverview(adminUserId, matchId);
  }

  @Get(':id')
  @UseGuards(CookieAuthGuard)
  async get(@Param('id') id: string) {
    const betId = Number(id);
    if (!betId) throw new BadRequestException('Invalid id');
    return await this.betsService.getBet(betId);
  }

  @Post(':id/cancel')
  @UseGuards(CookieAuthGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const betId = Number(id);
    if (!userId || !betId) throw new BadRequestException('Invalid request');
    return await this.betsService.cancelBet(userId, betId);
  }

  @Post('matches/:id/resolve')
  @UseGuards(CookieAuthGuard)
  async resolve(@Req() req: any, @Param('id') id: string, @Body('winner') winner: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId || !winner) throw new BadRequestException('Invalid request');
    return await this.betsService.resolveMatch(userId, matchId, winner);
  }

  @Post('matches/:id/challenge')
  @UseGuards(CookieAuthGuard)
  async challenge(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.challengeMatch(userId, matchId);
  }
  
  @Post('matches/:id/expire-now')
  @UseGuards(CookieAuthGuard)
  async expireNowMatch(@Req() req: any, @Param('id') id: string) {
    const adminUserId = req.user?.id;
    const matchId = Number(id);
    if (!adminUserId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.expireMatchNow(adminUserId, matchId);
  }
  
  @Post('matches/:id/oracle/fast-finalize')
  @UseGuards(CookieAuthGuard)
  async fastFinalize(@Req() req: any, @Param('id') id: string) {
    const adminUserId = req.user?.id;
    const matchId = Number(id);
    if (!adminUserId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.fastFinalizeOracle(adminUserId, matchId);
  }

  @Post('matches/:id/resolution/vote')
  @UseGuards(CookieAuthGuard)
  async voteResolution(@Req() req: any, @Param('id') id: string, @Body('outcome') outcome: string, @Body('amount') amount: number) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId || !outcome || !amount) throw new BadRequestException('Invalid request');
    return await this.betsService.voteResolution(userId, matchId, outcome, Number(amount));
  }

  @Post('matches/:id/dispute')
  @UseGuards(CookieAuthGuard)
  async raiseDispute(@Req() req: any, @Param('id') id: string, @Body('outcome') outcome: string, @Body('amount') amount: number) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId || !outcome || !amount) throw new BadRequestException('Invalid request');
    return await this.betsService.raiseDispute(userId, matchId, outcome, Number(amount));
  }

  @Post('matches/:id/resolution/finalize')
  @UseGuards(CookieAuthGuard)
  async finalizeResolution(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.finalizeResolutionVoting(userId, matchId);
  }

  @Post('matches/:id/finalize')
  @UseGuards(CookieAuthGuard)
  async finalize(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.finalizeMatch(userId, matchId);
  }

  @Post('matches/:id/admin-override')
  @UseGuards(CookieAuthGuard)
  async override(@Req() req: any, @Param('id') id: string, @Body('outcome') outcome: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId || !outcome) throw new BadRequestException('Invalid request');
    return await this.betsService.adminOverrideOutcome(userId, matchId, outcome);
  }

  @Post('listing/place')
  @UseGuards(CookieAuthGuard)
  async placeOnListing(@Req() req: any, @Body('listingId') listingId: number, @Body('side') side: 'YES' | 'NO', @Body('amount') amount: number) {
    const userId = req.user?.id;
    if (!userId || !listingId || !side || !amount) throw new BadRequestException('Invalid request');
    return await this.betsService.placeBetOnListing(userId, { listingId: Number(listingId), side, amount: Number(amount) });
  }

  @Get('listing/:id/pool')
  @UseGuards(CookieAuthGuard)
  async poolSummary(@Req() req: any, @Param('id') id: string) {
    const listingId = Number(id);
    if (!listingId) throw new BadRequestException('Invalid id');
    return await this.betsService.getListingPoolSummary(listingId, req.user?.id);
  }
  
  @Get('balance')
  @UseGuards(CookieAuthGuard)
  async getBalance(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Invalid user');
    return await this.betsService.getUserBalance(userId);
  }
  
  @Post('faucet')
  @UseGuards(CookieAuthGuard)
  async faucet(@Req() req: any, @Body('amount') amount?: number) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Invalid user');
    return await this.betsService.faucet(userId, Number(amount || 100));
  }

  @Get('listing/:id/admin')
  @UseGuards(CookieAuthGuard)
  async listingAdminDetails(@Req() req: any, @Param('id') id: string) {
    const adminUserId = req.user?.id;
    const listingId = Number(id);
    if (!adminUserId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.getListingAdminDetails(adminUserId, listingId);
  }

  @Post('listing/:id/resolve')
  @UseGuards(CookieAuthGuard)
  async resolveListing(@Req() req: any, @Param('id') id: string, @Body('outcome') outcome?: string) {
    const userId = req.user?.id;
    const listingId = Number(id);
    if (!userId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.resolveListingPool(userId, listingId, outcome);
  }

  @Post('listing/:id/challenge')
  @UseGuards(CookieAuthGuard)
  async challengeListing(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const listingId = Number(id);
    if (!userId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.challengeListingPool(userId, listingId);
  }
  
  @Post('listing/:id/expire-now')
  @UseGuards(CookieAuthGuard)
  async expireNowListing(@Req() req: any, @Param('id') id: string) {
    const adminUserId = req.user?.id;
    const listingId = Number(id);
    if (!adminUserId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.expireListingNow(adminUserId, listingId);
  }

  @Post('listing/:id/finalize')
  @UseGuards(CookieAuthGuard)
  async finalizeListing(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const listingId = Number(id);
    if (!userId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.finalizeListingPool(userId, listingId);
  }

  @Post('listing/:id/close')
  @UseGuards(CookieAuthGuard)
  async closeListing(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const listingId = Number(id);
    if (!userId || !listingId) throw new BadRequestException('Invalid request');
    return await this.betsService.adminCloseListing(userId, listingId);
  }

  @Get('oracle/reputation/:userId')
  @UseGuards(CookieAuthGuard)
  async getOracleReputation(@Param('userId') userId: string) {
    const idNum = Number(userId);
    if (!idNum) throw new BadRequestException('Invalid user id');
    return await this.betsService.getOracleReputation(idNum);
  }
  
  @Get('markets/challenged')
  @UseGuards(CookieAuthGuard)
  async challenged(@Req() req: any) {
    const adminUserId = req.user?.id;
    if (!adminUserId) throw new BadRequestException('Invalid user');
    return await this.betsService.getChallengedMarkets(adminUserId);
  }
  
  @Get('matches/:id/report')
  @UseGuards(CookieAuthGuard)
  async report(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    const matchId = Number(id);
    if (!userId || !matchId) throw new BadRequestException('Invalid request');
    return await this.betsService.getMarketReport(matchId);
  }
  
  @Post('admin/wallet/remove')
  @UseGuards(CookieAuthGuard)
  async adminRemoveWallet(@Req() req: any, @Body('address') address: string) {
    const adminUserId = req.user?.id;
    if (!adminUserId || !address) throw new BadRequestException('Invalid request');
    return await this.betsService.adminRemoveWalletAddress(adminUserId, address);
  }
}
