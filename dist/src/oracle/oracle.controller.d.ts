import { OracleService } from './oracle.service';
export declare class OracleController {
    private readonly oracleService;
    constructor(oracleService: OracleService);
    request(): Promise<{
        success: boolean;
        txHash: string;
        result: string;
    }>;
}
