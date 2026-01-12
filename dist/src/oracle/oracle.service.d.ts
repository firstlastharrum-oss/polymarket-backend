export declare class OracleService {
    private provider;
    private contract;
    constructor();
    private triggerRequest;
    requestOracleData(): Promise<{
        txHash: string;
        result: string;
    }>;
}
