import { ConnectionService } from 'src/connection/connection.service';
export declare class OrdersService {
    private connectionService;
    constructor(connectionService: ConnectionService);
    createOrder(buyerId: number, sellerId: number, listingId: number, amount: number): Promise<{
        success: boolean;
        order: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.OrderStatus;
            listingId: number | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            buyerId: number;
            sellerId: number;
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
                asset_id: string;
                seller_id: number;
                price: import("@prisma/client/runtime/library").Decimal;
                currency: string;
                status: import("@prisma/client").$Enums.Status;
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
            listingId: number | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            buyerId: number;
            sellerId: number;
        };
    }>;
    getOrdersByBuyer(buyerId: number): Promise<{
        success: boolean;
        orders: ({
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
            listingId: number | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            buyerId: number;
            sellerId: number;
        })[];
    }>;
    placeBet(buyerId: number, sellerId: number, listingId: number, amount: number, choice: string): Promise<{
        success: boolean;
        orderId: number;
        txHash: null;
        status: string;
    }>;
}
