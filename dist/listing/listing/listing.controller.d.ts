import { ListingService } from './listing.service';
export declare class ListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    createListing(file: Express.Multer.File, price: string, currency: string, status: string, title: string, description: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            seller: {
                id: number;
                email: string;
                username: string;
            };
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
        } & {
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            asset_id: string;
            seller_id: number;
        };
    }>;
    getAllListings(): Promise<{
        success: boolean;
        data: ({
            seller: {
                id: number;
                username: string;
            };
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
        } & {
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            asset_id: string;
            seller_id: number;
        })[];
    }>;
    getListingById(id: number): Promise<{
        success: boolean;
        data: {
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
                status: import("@prisma/client").$Enums.OrderStatus;
                createdAt: Date;
                updatedAt: Date;
                id: number;
                buyerId: number;
                sellerId: number;
                listingId: number | null;
                amount: import("@prisma/client/runtime/library").Decimal;
            })[];
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
        } & {
            title: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            status: import("@prisma/client").$Enums.Status;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            asset_id: string;
            seller_id: number;
        };
    }>;
}
