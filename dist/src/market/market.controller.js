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
exports.MarketController = void 0;
const common_1 = require("@nestjs/common");
const market_service_1 = require("./market.service");
const orders_guard_1 = require("../../orders/orders/orders.guard");
let MarketController = class MarketController {
    constructor(marketService) {
        this.marketService = marketService;
    }
    async match(betId) {
        return await this.marketService.match(Number(betId));
    }
    async resolve(req, matchId, outcome) {
        const userId = req.user?.id;
        if (!userId || !matchId || !outcome)
            throw new common_1.BadRequestException('Invalid request');
        return await this.marketService.resolve(userId, Number(matchId), String(outcome));
    }
    async getPool(id) {
        return await this.marketService.getPoolByMarket(id);
    }
    async getBalance(id) {
        return await this.marketService.getUserBalance(Number(id));
    }
};
exports.MarketController = MarketController;
__decorate([
    (0, common_1.Post)('match'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Body)('betId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "match", null);
__decorate([
    (0, common_1.Post)('resolve'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('matchId')),
    __param(2, (0, common_1.Body)('outcome')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "resolve", null);
__decorate([
    (0, common_1.Get)(':id/pool'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getPool", null);
__decorate([
    (0, common_1.Get)('user/:id/balance'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getBalance", null);
exports.MarketController = MarketController = __decorate([
    (0, common_1.Controller)('market'),
    __metadata("design:paramtypes", [market_service_1.MarketService])
], MarketController);
//# sourceMappingURL=market.controller.js.map