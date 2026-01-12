import { AppService } from './app.service';
import { OracleService } from './oracle/oracle.service';
import type { Response } from 'express';
interface AdapterBody {
    id?: string;
}
export declare class AppController {
    private readonly appService;
    private readonly oracleService;
    constructor(appService: AppService, oracleService: OracleService);
    getHello(): string;
    adapter(body: AdapterBody, res: Response): Promise<{
        jobRunID: string;
        data: {
            userId: number;
            id: number;
            title: string;
            body: string;
        };
        result: {
            userId: number;
            id: number;
            title: string;
            body: string;
        };
        statusCode: number;
        status?: undefined;
        error?: undefined;
    } | {
        jobRunID: string;
        status: string;
        error: string;
        data?: undefined;
        result?: undefined;
        statusCode?: undefined;
    }>;
    requestOracle(): Promise<{
        success: boolean;
        txHash: string;
        result: string;
    }>;
    getOracleTest(): {
        ok: boolean;
    };
}
export {};
