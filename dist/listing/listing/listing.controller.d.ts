import { ListingService } from './listing.service';
export declare class ListingController {
    private readonly listingService;
    constructor(listingService: ListingService);
    createListing(file: Express.Multer.File, price: string, currency: string, status: string, title: string, description: string, req: any): Promise<{
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
}
