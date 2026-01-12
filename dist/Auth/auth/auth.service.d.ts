import { ConnectionService } from 'src/connection/connection.service';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
export declare class AuthService {
    private readonly connectionService;
    private readonly jwtService;
    constructor(connectionService: ConnectionService, jwtService: JwtService);
    register(email: string, username: string, password: string, wallet_address: string, role: 'buyer' | 'seller' | 'admin', setting: object, nonce: string, res: Response): Promise<{
        success: boolean;
        message: string;
        token: string;
        data: {
            id: number;
            username: string;
            email: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    login(email: string, password: string, res: Response, wallet_address: string): Promise<{
        success: boolean;
        message: string;
        token: string;
        data: {
            username: string;
            email: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    getNonce(wallet_address: string): Promise<{
        success: boolean;
        nonce: string;
    }>;
    verifySignature(wallet_address: string, signature: string, res: Response): Promise<{
        success: boolean;
        message: string;
        data: {
            wallet_address: string | null;
            token: string;
            verified: boolean;
        };
    }>;
    updateProfile(userId: number, updateData: {
        username?: string;
        email?: string;
        wallet_address?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: {
            id: number;
            email: string;
            username: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
            setting: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updatePreferences(userId: number, preferences: object): Promise<{
        success: boolean;
        message: string;
        data: {
            preferences: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    getWishlist(userId: number): Promise<{
        success: boolean;
        data: {
            wishlist: any;
        };
    }>;
    toggleWishlist(userId: number, listingId: number): Promise<{
        success: boolean;
        data: {
            wishlist: number[];
        };
    }>;
    getCurrentUser(userId: number): Promise<{
        success: boolean;
        data: {
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
            id: number;
            email: string;
            username: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
            setting: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    submitKyc(userId: number, documentUrl: string): Promise<{
        success: boolean;
        message: string;
        data: {
            id: number;
            email: string;
            username: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
            setting: import("@prisma/client/runtime/library").JsonValue;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    private validateKycData;
    private isKycDuplicate;
    private isAddress;
    fundWallet(wallet_address: string, amountEth: number): Promise<{
        success: boolean;
        message: string;
        txHash: any;
        amount: number;
    }>;
}
