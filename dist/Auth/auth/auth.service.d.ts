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
            username: string;
            email: string;
            wallet_address: string | null;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    login(email: string, password: string, res: Response, wallet_address: string): Promise<{
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
}
