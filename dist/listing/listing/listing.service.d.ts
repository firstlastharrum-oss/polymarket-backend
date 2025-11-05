import { Status } from '@prisma/client';
import { ConnectionService } from 'src/connection/connection.service';
interface CreateListingDto {
    seller_id: number;
    price: number;
    currency: string;
    status: Status;
    filename: string;
    mimetype: string;
    size: number;
    title: string;
    description?: string;
}
export declare class ListingService {
    private prisma;
    constructor(prisma: ConnectionService);
    createListing(data: CreateListingDto): Promise<{
        success: boolean;
        message: string;
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
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            asset_id: string;
            seller_id: number;
        };
    }>;
    getListing(): Promise<{
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
                username: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            asset_id: string;
            seller_id: number;
        })[];
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
                buyerId: number;
                sellerId: number;
                listingId: number | null;
                amount: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            asset_id: string;
            seller_id: number;
        };
    }>;
    analyzeBet(bet: string): boolean;
}
export {};
