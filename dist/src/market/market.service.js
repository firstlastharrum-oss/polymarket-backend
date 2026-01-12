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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../connection/connection.service");
const bets_service_1 = require("../../bets/bets/bets.service");
let MarketService = class MarketService {
    constructor(connection, bets) {
        this.connection = connection;
        this.bets = bets;
    }
    async match(betId) {
        if (!betId)
            throw new common_1.BadRequestException('Invalid betId');
        await this.bets.tryMatch(betId);
        return { success: true };
    }
    async resolve(adminUserId, matchId, outcome) {
        return await this.bets.resolveMatch(adminUserId, matchId, outcome);
    }
    async getPoolByMarket(idOrHash) {
        const asNum = Number(idOrHash);
        if (!isNaN(asNum) && asNum > 0) {
            const pool = await this.connection.pool.findUnique({
                where: { matchId: asNum },
            });
            if (!pool)
                throw new common_1.BadRequestException('Pool not found');
            return { success: true, pool };
        }
        const pool = await this.connection.pool.findFirst({
            where: { marketId: idOrHash },
        });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        return { success: true, pool };
    }
    async getUserBalance(userId) {
        if (!userId)
            throw new common_1.BadRequestException('Invalid userId');
        const balance = await this.connection.balance.findUnique({
            where: { userId },
        });
        return { success: true, balance: balance || { available: 0, locked: 0 } };
    }
};
exports.MarketService = MarketService;
exports.MarketService = MarketService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService,
        bets_service_1.BetsService])
], MarketService);
//# sourceMappingURL=market.service.js.map