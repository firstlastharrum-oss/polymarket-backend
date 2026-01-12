import { ConnectionService } from '../../src/connection/connection.service';
import { GamificationService } from 'gamification/gamification/gamification.service';
export declare class BetsService {
    private readonly connection;
    private readonly gamificationService;
    constructor(connection: ConnectionService, gamificationService: GamificationService);
    private expirePendingPools;
    private attemptPoolActivation;
    private computeProbabilityTag;
    private computeHealthScore;
    private callEthics;
    private normalizeText;
    private calculateSimilarity;
    private logRejection;
    createBet(userId: number, body: any): Promise<{
        success: boolean;
        bet: any;
    }>;
    listBets(query: any): Promise<{
        success: boolean;
        bets: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            currency: string;
            status: import("@prisma/client").$Enums.BetStatus;
            creatorId: number;
            category: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            choice: string | null;
            stakeAmount: import("@prisma/client/runtime/library").Decimal;
            endDate: Date;
            ethicsVerdict: import("@prisma/client").$Enums.EthicsVerdict;
            probabilityTag: import("@prisma/client").$Enums.ProbabilityTag;
            aiScore: number | null;
            aiAnalysis: import("@prisma/client/runtime/library").JsonValue | null;
            creatorCommissionRate: number | null;
            totalStake: import("@prisma/client/runtime/library").Decimal;
            uniqueParticipants: number;
            qualityScore: number | null;
        }[];
    }>;
    listMyBets(userId: number, query: any): Promise<{
        success: boolean;
        bets: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            currency: string;
            status: import("@prisma/client").$Enums.BetStatus;
            creatorId: number;
            category: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            choice: string | null;
            stakeAmount: import("@prisma/client/runtime/library").Decimal;
            endDate: Date;
            ethicsVerdict: import("@prisma/client").$Enums.EthicsVerdict;
            probabilityTag: import("@prisma/client").$Enums.ProbabilityTag;
            aiScore: number | null;
            aiAnalysis: import("@prisma/client/runtime/library").JsonValue | null;
            creatorCommissionRate: number | null;
            totalStake: import("@prisma/client/runtime/library").Decimal;
            uniqueParticipants: number;
            qualityScore: number | null;
        }[];
    }>;
    getBet(id: number): Promise<{
        success: boolean;
        bet: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            currency: string;
            status: import("@prisma/client").$Enums.BetStatus;
            creatorId: number;
            category: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            choice: string | null;
            stakeAmount: import("@prisma/client/runtime/library").Decimal;
            endDate: Date;
            ethicsVerdict: import("@prisma/client").$Enums.EthicsVerdict;
            probabilityTag: import("@prisma/client").$Enums.ProbabilityTag;
            aiScore: number | null;
            aiAnalysis: import("@prisma/client/runtime/library").JsonValue | null;
            creatorCommissionRate: number | null;
            totalStake: import("@prisma/client/runtime/library").Decimal;
            uniqueParticipants: number;
            qualityScore: number | null;
        };
    }>;
    listMatches(): Promise<{
        success: boolean;
        matches: any[];
    }>;
    private getAverageBetSize;
    voteResolution(userId: number, matchId: number, outcome: string, amount: number): Promise<{
        success: boolean;
    }>;
    raiseDispute(userId: number, matchId: number, outcome: string, amount: number): Promise<{
        success: boolean;
    }>;
    challengeMatch(userId: number, matchId: number): Promise<{
        success: boolean;
    }>;
    finalizeResolutionVoting(adminUserId: number, matchId: number): Promise<{
        success: boolean;
        escalated: boolean;
        outcome?: undefined;
        status?: undefined;
    } | {
        success: boolean;
        outcome: string;
        status: string;
        escalated?: undefined;
    }>;
    cancelBet(userId: number, id: number): Promise<{
        success: boolean;
        bet: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            currency: string;
            status: import("@prisma/client").$Enums.BetStatus;
            creatorId: number;
            category: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            choice: string | null;
            stakeAmount: import("@prisma/client/runtime/library").Decimal;
            endDate: Date;
            ethicsVerdict: import("@prisma/client").$Enums.EthicsVerdict;
            probabilityTag: import("@prisma/client").$Enums.ProbabilityTag;
            aiScore: number | null;
            aiAnalysis: import("@prisma/client/runtime/library").JsonValue | null;
            creatorCommissionRate: number | null;
            totalStake: import("@prisma/client/runtime/library").Decimal;
            uniqueParticipants: number;
            qualityScore: number | null;
        };
    }>;
    resolveMatch(adminUserId: number, id: number, winnerChoice: string): Promise<{
        success: boolean;
        matchId: number;
    }>;
    private finalizePayoutInternal;
    private finalizeOracleRewards;
    forceCloseListingPool(adminUserId: number, listingId: number): Promise<{
        success: boolean;
    }>;
    finalizeMatch(adminUserId: number, id: number): Promise<{
        success: boolean;
    }>;
    adminOverrideOutcome(adminUserId: number, id: number, outcome: string): Promise<{
        success: boolean;
    }>;
    getCreatorEarnings(creatorId?: number): Promise<{
        success: boolean;
        earnings: any;
    }>;
    autoFinalizeExpired(): Promise<void>;
    autoOracleCycle(): Promise<void>;
    private retryPendingActivations;
    private activateListingPools;
    tryMatch(betId: number): Promise<void>;
    placeBetOnListing(userId: number, payload: {
        listingId: number;
        side: 'YES' | 'NO';
        amount: number;
    }): Promise<{
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
        } | null;
        probabilities: {
            yes: number;
            no: number;
        };
        health: {
            score: number;
            label: string;
        };
    }>;
    getUserBalance(userId: number): Promise<{
        success: boolean;
        balance: {
            available: number;
            locked: number;
        };
    }>;
    faucet(userId: number, amount: number): Promise<{
        success: boolean;
        balance: {
            available: number;
            locked: number;
        };
    }>;
    getListingPoolSummary(listingId: number, userId?: number): Promise<{
        success: boolean;
        pool: null;
        probabilities: {
            yes: number;
            no: number;
        };
        participants: number;
        my: {
            yes: number;
            no: number;
        };
    } | {
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
        probabilities: {
            yes: number;
            no: number;
        };
        participants: number;
        my: {
            yes: number;
            no: number;
        };
    }>;
    getListingAdminDetails(adminUserId: number, listingId: number): Promise<{
        success: boolean;
        listing: {
            asset: {
                id: string;
                public_id: string;
                url: string;
                created_at: Date;
                uploaded_by: number | null;
                type: string | null;
                format: string | null;
                size: number | null;
            };
            seller: {
                id: number;
                email: string;
                username: string;
                wallet_address: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            asset_id: string;
            seller_id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
        };
        pool: null;
        probabilities: {
            yes: number;
            no: number;
        };
        participants: {
            count: number;
            yes: never[];
            no: never[];
        };
        status: string;
        deploymentStatus?: undefined;
        outcome?: undefined;
        challengeDeadline?: undefined;
        challengeCount?: undefined;
        health?: undefined;
    } | {
        success: boolean;
        listing: {
            asset: {
                id: string;
                public_id: string;
                url: string;
                created_at: Date;
                uploaded_by: number | null;
                type: string | null;
                format: string | null;
                size: number | null;
            };
            seller: {
                id: number;
                email: string;
                username: string;
                wallet_address: string | null;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            asset_id: string;
            seller_id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
        };
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
        probabilities: {
            yes: number;
            no: number;
        };
        participants: {
            count: number;
            yes: {
                user: {
                    id: number;
                    email: string;
                    username: string;
                    wallet_address: string | null;
                };
                amount: number;
                createdAt: Date;
            }[];
            no: {
                user: {
                    id: number;
                    email: string;
                    username: string;
                    wallet_address: string | null;
                };
                amount: number;
                createdAt: Date;
            }[];
        };
        status: import("@prisma/client").$Enums.PoolStatus;
        deploymentStatus: {
            isDeployed: boolean;
            blockers: string[];
        };
        outcome: string;
        challengeDeadline: Date | null;
        challengeCount: number;
        health: {
            score: number;
            label: string;
        };
    }>;
    getMarketAdminOverview(adminUserId: number, matchId: number): Promise<{
        success: boolean;
        market: {
            matchId: number;
            status: import("@prisma/client").$Enums.MatchStatus;
            poolStatus: import("@prisma/client").$Enums.PoolStatus;
            defaultOutcome: string;
            finalOutcome: string;
            resolutionTimestamp: Date | null;
        };
        oracleVoting: {
            totalVoters: any;
            yesStake: any;
            noStake: any;
            votesYes: any;
            votesNo: any;
        };
        stakeDetails: {
            totalLocked: any;
            minStakeUsed: number;
            maxStakeUsed: number;
            slashedStakeAmount: number;
            distribution: number[];
        };
        dispute: {
            disputed: boolean;
            initiator: any;
            stakeAmount: number;
            windowStart: Date | null;
            windowEnd: any;
            outcomeBefore: string;
            outcomeAfter: string;
        };
        timeline: {
            id: number;
            createdAt: Date;
            type: string;
            refMatchId: number | null;
            refPoolId: number | null;
            payload: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        flags: {
            id: number;
            createdAt: Date;
            type: string;
            refMatchId: number | null;
            refPoolId: number | null;
            payload: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        reputationImpact: {
            userId: any;
            name: any;
            reputation: number;
            accuracy: number;
        }[];
        aiAnalysis: {
            score: any;
            flags: any;
            reasoning: any;
        };
    }>;
    listMyPositions(userId: number): Promise<{
        success: boolean;
        positions: {
            id: string;
            poolId: number;
            listingId: number | null;
            listingTitle: string | null;
            side: import("@prisma/client").$Enums.Side;
            amount: number;
            createdAt: Date;
            poolStatus: import("@prisma/client").$Enums.PoolStatus;
            outcome: string | null;
            probabilities: {
                yes: number;
                no: number;
            };
        }[];
    }>;
    resolveListingPool(adminUserId: number, listingId: number, outcome?: string): Promise<{
        success: boolean;
    }>;
    challengeListingPool(userId: number, listingId: number): Promise<{
        success: boolean;
    }>;
    expireMatchNow(adminUserId: number, id: number): Promise<{
        success: boolean;
    }>;
    expireListingNow(adminUserId: number, listingId: number): Promise<{
        success: boolean;
    }>;
    fastFinalizeOracle(adminUserId: number, matchId: number): Promise<{
        success: boolean;
        escalated: boolean;
        outcome?: undefined;
        status?: undefined;
    } | {
        success: boolean;
        outcome: string;
        status: string;
        escalated?: undefined;
    }>;
    getChallengedMarkets(adminUserId: number): Promise<{
        success: boolean;
        pools: ({
            listing: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                description: string;
                asset_id: string;
                seller_id: number;
                price: import("@prisma/client/runtime/library").Decimal;
                currency: string;
                status: import("@prisma/client").$Enums.Status;
            } | null;
            match: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.MatchStatus;
                betAId: number;
                betBId: number | null;
                marketId: string | null;
                contractAddress: string | null;
                marketStartTime: Date | null;
                participants: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
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
        })[];
    }>;
    getAdminChallenges(adminUserId: number): Promise<{
        success: boolean;
        challenges: {
            challengeId: any;
            poolId: any;
            matchId: any;
            listingId: any;
            poolTitle: any;
            challenger: {
                id: number;
                email: string;
                username: string;
            } | null;
            amount: number;
            proposedOutcome: any;
            currentOutcome: any;
            challengeTimestamp: any;
            status: any;
            votes: {
                votersCount: any;
                yes: {
                    count: any;
                    stake: any;
                    voters: any;
                };
                no: {
                    count: any;
                    stake: any;
                    voters: any;
                };
            };
            rawPool: any;
            events: any;
        }[];
    }>;
    getMarketReport(matchId: number): Promise<{
        success: boolean;
        status: {
            match: import("@prisma/client").$Enums.MatchStatus;
            pool: import("@prisma/client").$Enums.PoolStatus;
            outcome: string;
        };
        votes: any;
        balances: any[];
        timestamps: {
            created: Date;
            closed: Date | null;
            resolutionOpened: any;
            challengeDeadline: Date | null;
            updatedAt: Date;
        };
        events: any;
    }>;
    finalizeListingPool(adminUserId: number, listingId: number): Promise<{
        success: boolean;
        refunded?: undefined;
    } | {
        success: boolean;
        refunded: boolean;
    }>;
    adminCloseListing(adminUserId: number, listingId: number): Promise<void>;
    getOracleReputation(userId: number): Promise<{
        success: boolean;
        reputation: number;
        accuracy: number;
        wins: number;
        losses: number;
        tier: string;
    }>;
    adminRemoveWalletAddress(adminUserId: number, address: string): Promise<{
        success: boolean;
        userId: number | null;
        removedPositions: boolean;
        address: string;
    }>;
}
type PoolLike = {
    totalPoolAmount: any;
    totalYesAmount?: any;
    totalNoAmount?: any;
    participantsCount?: number;
    status?: any;
    challengeCount?: number;
    createdAt?: Date;
};
type MatchLike = {
    marketStartTime?: Date | null;
    status?: any;
};
export type HealthInfo = {
    score: number;
    label: string;
};
export type ProbInput = {
    title: string;
    description: string;
    category: string;
};
export declare function toProbTag(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'SPEC';
export declare function toRiskLabel(score: number): string;
export declare function scoreFeasibility(input: ProbInput): number;
export declare function scoreHealth(pool: PoolLike, match: MatchLike): number;
export {};
