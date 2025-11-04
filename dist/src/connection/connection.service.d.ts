import { PrismaClient } from '@prisma/client';
export declare class ConnectionService extends PrismaClient {
    onModule(): Promise<void>;
}
