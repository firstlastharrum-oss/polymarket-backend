import { BetsService } from '../../bets/bets/bets.service';
export declare class AdminController {
    private readonly betsService;
    constructor(betsService: BetsService);
    challenges(req: any): Promise<{
        success: boolean;
        challenges: {
            challengeId: any;
            poolId: any;
            matchId: any;
            listingId: any;
            poolTitle: any;
            challenger: {
                id: number;
                email: string;
                username: string;
            } | null;
            amount: number;
            proposedOutcome: any;
            currentOutcome: any;
            challengeTimestamp: any;
            status: any;
            votes: {
                votersCount: any;
                yes: {
                    count: any;
                    stake: any;
                    voters: any;
                };
                no: {
                    count: any;
                    stake: any;
                    voters: any;
                };
            };
            rawPool: any;
            events: any;
        }[];
    }>;
}
