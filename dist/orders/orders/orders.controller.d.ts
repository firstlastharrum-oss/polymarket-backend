import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(req: any, listingId: number, amount: number): Promise<{
        success: boolean;
        order: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            buyerId: number;
            sellerId: number;
            listingId: number | null;
            amount: import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    getOrderById(id: number): Promise<{
        success: boolean;
        order: {
            listing: {
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
            } | null;
            buyer: {
                id: number;
                email: string;
                username: string;
                password: string;
                wallet_address: string | null;
                role: import("@prisma/client").$Enums.Role;
                setting: import("@prisma/client/runtime/library").JsonValue;
                nonce: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
            seller: {
                id: number;
                email: string;
                username: string;
                password: string;
                wallet_address: string | null;
                role: import("@prisma/client").$Enums.Role;
                setting: import("@prisma/client/runtime/library").JsonValue;
                nonce: string | null;
                createdAt: Date;
                updatedAt: Date;
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
        };
    }>;
    getOrdersByUser(req: any): Promise<{
        success: boolean;
        orders: ({
            listing: {
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
            } | null;
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
    }>;
}
