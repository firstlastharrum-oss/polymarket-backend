import { ListingService } from './listing.service';
import { Status } from '@prisma/client';
export declare class ListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    createListing(file: Express.Multer.File, price: string, currency: string, status: Status, title: string, description: string, marketId: string, expiresAt: string, req: any): Promise<{
        success: boolean;
        data: {
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
        message: string;
    }>;
    getAdminListings(): Promise<{
        success: boolean;
        data: ({
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
            };
            pools: {
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
            }[];
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
        })[];
        count: number;
    }>;
    getAllListings(): Promise<{
        success: boolean;
        data: ({
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
            };
            pools: {
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
            }[];
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
        })[];
        count: number;
    }>;
    analyzeMarket(title: string, description?: string): Promise<{
        success: boolean;
        data: {
            success: boolean;
            isEthical: boolean;
            reason: string;
        };
    }>;
    getListingById(id: number): Promise<{
        success: boolean;
        data: {
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
            orders: ({
                buyer: {
                    id: number;
                    email: string;
                    username: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                status: import("@prisma/client").$Enums.OrderStatus;
                listingId: number | null;
                amount: import("@prisma/client/runtime/library").Decimal;
                buyerId: number;
                sellerId: number;
            })[];
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
    }>;
}
