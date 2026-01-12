import { ConnectionService } from '../../src/connection/connection.service';
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}
export declare class MarketValidationService {
    private prisma;
    constructor(prisma: ConnectionService);
    validateMarket(title: string, description: string): Promise<ValidationResult>;
    checkDuplicates(title: string): Promise<ValidationResult>;
    checkEthics(title: string, description: string): Promise<ValidationResult>;
    checkManipulationRisk(title: string, description: string): Promise<ValidationResult>;
    checkValidity(title: string, description: string): Promise<ValidationResult>;
    private levenshtein;
}
