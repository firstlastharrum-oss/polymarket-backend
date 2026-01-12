import { GamificationService } from './gamification.service';
export declare class GamificationController {
    private readonly gamificationService;
    constructor(gamificationService: GamificationService);
    getLeaderboard(type: string, limit: number): Promise<{
        id: any;
        name: any;
        reputationScore: number;
        accuracy: number;
        totalEarnings: number;
        totalVolume: number;
        betsCreated: number;
        currentStreak: number;
        tier: string;
    }[]>;
    getUserStats(id: string): Promise<{
        user: {
            username: string;
            setting: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
        };
    } & {
        id: number;
        updatedAt: Date;
        betsCreated: number;
        userId: number;
        accuracy: number;
        reputationScore: number;
        tier: string;
        currentStreak: number;
        maxStreak: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        totalVolume: import("@prisma/client/runtime/library").Decimal;
        wins: number;
        losses: number;
    }>;
    getPublicProfile(id: string): Promise<{
        success: boolean;
        visibility: string;
        identity?: undefined;
        reputation?: undefined;
        creator?: undefined;
        resolver?: undefined;
        earnings?: undefined;
        activity?: undefined;
    } | {
        success: boolean;
        visibility: string;
        identity: {
            id: number;
            name: any;
            createdAt: any;
        };
        reputation: {
            score: number;
            tier: string;
            accuracy: number;
        };
        creator: {
            marketsCreated: number;
            activeMarkets: number;
            resolvedMarkets: number;
            marketVolumeGenerated: number;
            commissionEarned: number;
        };
        resolver: {
            totalResolutions: number;
            correctResolutions: number;
            incorrectResolutions: number;
            stakeCommitted: number;
            rewardsEarned: number;
            accuracyRate: number;
        };
        earnings: {
            bettingProfitLoss: number;
            creatorCommissions: number;
            oracleRewards: number;
            totalLifetime: number;
        };
        activity: {
            totalBettingVolume: number;
            totalStakeCommitted: number;
            uniqueMarketsParticipated: number;
        };
    }>;
}
