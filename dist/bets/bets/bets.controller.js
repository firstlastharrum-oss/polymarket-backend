"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetsController = void 0;
const common_1 = require("@nestjs/common");
const bets_service_1 = require("./bets.service");
const orders_guard_1 = require("../../orders/orders/orders.guard");
let BetsController = class BetsController {
    constructor(betsService) {
        this.betsService = betsService;
    }
    async create(req, body) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.betsService.createBet(userId, body);
    }
    async list(query) {
        return await this.betsService.listBets(query);
    }
    async listMine(req, query) {
        const userId = req.user?.id;
        return await this.betsService.listMyBets(userId, query);
    }
    async positionsMine(req) {
        const userId = req.user?.id;
        return await this.betsService.listMyPositions(userId);
    }
    async matches() {
        return await this.betsService.listMatches();
    }
    async marketAdminOverview(req, id) {
        const adminUserId = req.user?.id;
        const matchId = Number(id);
        if (!adminUserId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.getMarketAdminOverview(adminUserId, matchId);
    }
    async get(id) {
        const betId = Number(id);
        if (!betId)
            throw new common_1.BadRequestException('Invalid id');
        return await this.betsService.getBet(betId);
    }
    async cancel(req, id) {
        const userId = req.user?.id;
        const betId = Number(id);
        if (!userId || !betId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.cancelBet(userId, betId);
    }
    async resolve(req, id, winner) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId || !winner)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.resolveMatch(userId, matchId, winner);
    }
    async challenge(req, id) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.challengeMatch(userId, matchId);
    }
    async expireNowMatch(req, id) {
        const adminUserId = req.user?.id;
        const matchId = Number(id);
        if (!adminUserId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.expireMatchNow(adminUserId, matchId);
    }
    async fastFinalize(req, id) {
        const adminUserId = req.user?.id;
        const matchId = Number(id);
        if (!adminUserId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.fastFinalizeOracle(adminUserId, matchId);
    }
    async voteResolution(req, id, outcome, amount) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId || !outcome || !amount)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.voteResolution(userId, matchId, outcome, Number(amount));
    }
    async raiseDispute(req, id, outcome, amount) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId || !outcome || !amount)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.raiseDispute(userId, matchId, outcome, Number(amount));
    }
    async finalizeResolution(req, id) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.finalizeResolutionVoting(userId, matchId);
    }
    async finalize(req, id) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.finalizeMatch(userId, matchId);
    }
    async override(req, id, outcome) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId || !outcome)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.adminOverrideOutcome(userId, matchId, outcome);
    }
    async placeOnListing(req, listingId, side, amount) {
        const userId = req.user?.id;
        if (!userId || !listingId || !side || !amount)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.placeBetOnListing(userId, { listingId: Number(listingId), side, amount: Number(amount) });
    }
    async poolSummary(req, id) {
        const listingId = Number(id);
        if (!listingId)
            throw new common_1.BadRequestException('Invalid id');
        return await this.betsService.getListingPoolSummary(listingId, req.user?.id);
    }
    async getBalance(req) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.betsService.getUserBalance(userId);
    }
    async faucet(req, amount) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.betsService.faucet(userId, Number(amount || 100));
    }
    async listingAdminDetails(req, id) {
        const adminUserId = req.user?.id;
        const listingId = Number(id);
        if (!adminUserId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.getListingAdminDetails(adminUserId, listingId);
    }
    async resolveListing(req, id, outcome) {
        const userId = req.user?.id;
        const listingId = Number(id);
        if (!userId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.resolveListingPool(userId, listingId, outcome);
    }
    async challengeListing(req, id) {
        const userId = req.user?.id;
        const listingId = Number(id);
        if (!userId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.challengeListingPool(userId, listingId);
    }
    async expireNowListing(req, id) {
        const adminUserId = req.user?.id;
        const listingId = Number(id);
        if (!adminUserId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.expireListingNow(adminUserId, listingId);
    }
    async finalizeListing(req, id) {
        const userId = req.user?.id;
        const listingId = Number(id);
        if (!userId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.finalizeListingPool(userId, listingId);
    }
    async closeListing(req, id) {
        const userId = req.user?.id;
        const listingId = Number(id);
        if (!userId || !listingId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.adminCloseListing(userId, listingId);
    }
    async getOracleReputation(userId) {
        const idNum = Number(userId);
        if (!idNum)
            throw new common_1.BadRequestException('Invalid user id');
        return await this.betsService.getOracleReputation(idNum);
    }
    async challenged(req) {
        const adminUserId = req.user?.id;
        if (!adminUserId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.betsService.getChallengedMarkets(adminUserId);
    }
    async report(req, id) {
        const userId = req.user?.id;
        const matchId = Number(id);
        if (!userId || !matchId)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.getMarketReport(matchId);
    }
    async adminRemoveWallet(req, address) {
        const adminUserId = req.user?.id;
        if (!adminUserId || !address)
            throw new common_1.BadRequestException('Invalid request');
        return await this.betsService.adminRemoveWalletAddress(adminUserId, address);
    }
};
exports.BetsController = BetsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)('positions/mine'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "positionsMine", null);
__decorate([
    (0, common_1.Get)('matches'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "matches", null);
__decorate([
    (0, common_1.Get)('matches/:id/admin-overview'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "marketAdminOverview", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('matches/:id/resolve'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('winner')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "resolve", null);
__decorate([
    (0, common_1.Post)('matches/:id/challenge'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "challenge", null);
__decorate([
    (0, common_1.Post)('matches/:id/expire-now'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "expireNowMatch", null);
__decorate([
    (0, common_1.Post)('matches/:id/oracle/fast-finalize'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "fastFinalize", null);
__decorate([
    (0, common_1.Post)('matches/:id/resolution/vote'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('outcome')),
    __param(3, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "voteResolution", null);
__decorate([
    (0, common_1.Post)('matches/:id/dispute'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('outcome')),
    __param(3, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "raiseDispute", null);
__decorate([
    (0, common_1.Post)('matches/:id/resolution/finalize'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "finalizeResolution", null);
__decorate([
    (0, common_1.Post)('matches/:id/finalize'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('matches/:id/admin-override'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('outcome')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "override", null);
__decorate([
    (0, common_1.Post)('listing/place'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('listingId')),
    __param(2, (0, common_1.Body)('side')),
    __param(3, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String, Number]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "placeOnListing", null);
__decorate([
    (0, common_1.Get)('listing/:id/pool'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "poolSummary", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('faucet'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "faucet", null);
__decorate([
    (0, common_1.Get)('listing/:id/admin'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "listingAdminDetails", null);
__decorate([
    (0, common_1.Post)('listing/:id/resolve'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('outcome')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "resolveListing", null);
__decorate([
    (0, common_1.Post)('listing/:id/challenge'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "challengeListing", null);
__decorate([
    (0, common_1.Post)('listing/:id/expire-now'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "expireNowListing", null);
__decorate([
    (0, common_1.Post)('listing/:id/finalize'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "finalizeListing", null);
__decorate([
    (0, common_1.Post)('listing/:id/close'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "closeListing", null);
__decorate([
    (0, common_1.Get)('oracle/reputation/:userId'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "getOracleReputation", null);
__decorate([
    (0, common_1.Get)('markets/challenged'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "challenged", null);
__decorate([
    (0, common_1.Get)('matches/:id/report'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "report", null);
__decorate([
    (0, common_1.Post)('admin/wallet/remove'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BetsController.prototype, "adminRemoveWallet", null);
exports.BetsController = BetsController = __decorate([
    (0, common_1.Controller)('bets'),
    __metadata("design:paramtypes", [bets_service_1.BetsService])
], BetsController);
//# sourceMappingURL=bets.controller.js.map