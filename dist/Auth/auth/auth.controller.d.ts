import { AuthService } from './auth.service';
import type { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(email: string, username: string, password: string, wallet_address: string, role: string, setting: object, nonce: string, res: Response): Promise<{
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
    login(email: string, password: string, wallet_address: string, res: Response): Promise<{
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
    verifySignatureAlias(wallet_address: string, signature: string, res: Response): Promise<{
        success: boolean;
        message: string;
        data: {
            wallet_address: string | null;
            token: string;
            verified: boolean;
        };
    }>;
    logout(res: Response): Promise<{
        success: boolean;
        message: string;
    }>;
    checkAuth(req: any): Promise<{
        success: boolean;
        user: {
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
    updateProfile(updateData: {
        username?: string;
        email?: string;
        wallet_address?: string;
    }, req: any): Promise<{
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
    changePassword(passwordData: {
        currentPassword: string;
        newPassword: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    updatePreferences(preferencesData: {
        preferences: object;
    }, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            preferences: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    getWishlist(req: any): Promise<{
        success: boolean;
        data: {
            wishlist: any;
        };
    }>;
    toggleWishlist(req: any, listingId: number): Promise<{
        success: boolean;
        data: {
            wishlist: number[];
        };
    }>;
    submitKyc(file: Express.Multer.File, req: any): Promise<{
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
    } | {
        success: boolean;
        message: string;
    }>;
    fund(wallet_address: string, amount: number, req: any): Promise<{
        success: boolean;
        message: string;
        txHash: any;
        amount: number;
    }>;
}
