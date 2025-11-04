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
            username: string;
            email: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    login(email: string, password: string, wallet_address: string, res: Response): Promise<{
        success: boolean;
        message: string;
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
        };
    }>;
    logout(res: Response): Promise<{
        success: boolean;
        message: string;
    }>;
    checkAuth(req: any): {
        success: boolean;
        user: any;
    };
}
