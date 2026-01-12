import { Request } from 'express';
import { MarketService } from './market.service';
export declare class MarketController {
    private readonly marketService;
    constructor(marketService: MarketService);
    match(betId: number): Promise<{
        success: boolean;
    }>;
    resolve(req: Request & {
        user?: {
            id: number;
        };
    }, matchId: number, outcome: string): Promise<{
        success: boolean;
        matchId: number;
    }>;
    getPool(id: string): Promise<{
        success: boolean;
        pool: {
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PoolStatus;
            listingId: number | null;
            outcome: string;
            marketId: string | null;
            matchId: number;
            userAId: number;
            userBId: number | null;
            stakeA: import("@prisma/client/runtime/library").Decimal;
            stakeB: import("@prisma/client/runtime/library").Decimal;
            totalYesAmount: import("@prisma/client/runtime/library").Decimal;
            totalNoAmount: import("@prisma/client/runtime/library").Decimal;
            totalPoolAmount: import("@prisma/client/runtime/library").Decimal;
            participantsCount: number;
            challengeDeadline: Date | null;
            challengeCount: number;
            challengeBond: import("@prisma/client/runtime/library").Decimal;
            challengerId: number | null;
            healthScore: number;
            riskLabel: string;
            closeTime: Date | null;
            disputeDeadline: Date | null;
            disputeWindowHours: number;
            disputeMinStakePercent: import("@prisma/client/runtime/library").Decimal;
            disputed: boolean;
            disputeStakeTotal: import("@prisma/client/runtime/library").Decimal;
            resolutionDeadline: Date | null;
            resolutionYesStake: import("@prisma/client/runtime/library").Decimal;
            resolutionNoStake: import("@prisma/client/runtime/library").Decimal;
            resolutionMinStakePercent: import("@prisma/client/runtime/library").Decimal;
            resolutionWindowHours: number;
            slashingRatePercent: number;
            minResolutionParticipants: number;
            resolutionEscalated: boolean;
            resolutionIncentivePercent: number;
            isLocked: boolean;
            adminFinalized: boolean;
            settledAt: Date | null;
        };
    }>;
    getBalance(id: string): Promise<{
        success: boolean;
        balance: {
            id: number;
            updatedAt: Date;
            userId: number;
            available: import("@prisma/client/runtime/library").Decimal;
            locked: import("@prisma/client/runtime/library").Decimal;
        } | {
            available: number;
            locked: number;
        };
    }>;
}
