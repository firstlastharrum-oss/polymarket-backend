import { BetsService } from './bets.service';
export declare class BetsController {
    private readonly betsService;
    constructor(betsService: BetsService);
    create(req: any, body: any): Promise<{
        success: boolean;
        bet: any;
    }>;
    list(query: any): Promise<{
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
    listMine(req: any, query: any): Promise<{
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
    positionsMine(req: any): Promise<{
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
    matches(): Promise<{
        success: boolean;
        matches: any[];
    }>;
    marketAdminOverview(req: any, id: string): Promise<{
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
    get(id: string): Promise<{
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
    cancel(req: any, id: string): Promise<{
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
    resolve(req: any, id: string, winner: string): Promise<{
        success: boolean;
        matchId: number;
    }>;
    challenge(req: any, id: string): Promise<{
        success: boolean;
    }>;
    expireNowMatch(req: any, id: string): Promise<{
        success: boolean;
    }>;
    fastFinalize(req: any, id: string): Promise<{
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
    voteResolution(req: any, id: string, outcome: string, amount: number): Promise<{
        success: boolean;
    }>;
    raiseDispute(req: any, id: string, outcome: string, amount: number): Promise<{
        success: boolean;
    }>;
    finalizeResolution(req: any, id: string): Promise<{
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
    finalize(req: any, id: string): Promise<{
        success: boolean;
    }>;
    override(req: any, id: string, outcome: string): Promise<{
        success: boolean;
    }>;
    placeOnListing(req: any, listingId: number, side: 'YES' | 'NO', amount: number): Promise<{
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
    poolSummary(req: any, id: string): Promise<{
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
    getBalance(req: any): Promise<{
        success: boolean;
        balance: {
            available: number;
            locked: number;
        };
    }>;
    faucet(req: any, amount?: number): Promise<{
        success: boolean;
        balance: {
            available: number;
            locked: number;
        };
    }>;
    listingAdminDetails(req: any, id: string): Promise<{
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
    resolveListing(req: any, id: string, outcome?: string): Promise<{
        success: boolean;
    }>;
    challengeListing(req: any, id: string): Promise<{
        success: boolean;
    }>;
    expireNowListing(req: any, id: string): Promise<{
        success: boolean;
    }>;
    finalizeListing(req: any, id: string): Promise<{
        success: boolean;
        refunded?: undefined;
    } | {
        success: boolean;
        refunded: boolean;
    }>;
    closeListing(req: any, id: string): Promise<void>;
    getOracleReputation(userId: string): Promise<{
        success: boolean;
        reputation: number;
        accuracy: number;
        wins: number;
        losses: number;
        tier: string;
    }>;
    challenged(req: any): Promise<{
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
    report(req: any, id: string): Promise<{
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
    adminRemoveWallet(req: any, address: string): Promise<{
        success: boolean;
        userId: number | null;
        removedPositions: boolean;
        address: string;
    }>;
}
