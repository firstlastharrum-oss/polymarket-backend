import { ConnectionService } from 'src/connection/connection.service';
export declare class AssetsService {
    private readonly connectionService;
    constructor(connectionService: ConnectionService);
    uploadImage(file: Express.Multer.File): Promise<any>;
    getImage(publicId: string): Promise<any>;
    getAllAssets(): Promise<{
        id: string;
        public_id: string;
        url: string;
        created_at: Date;
        uploaded_by: number | null;
        type: string | null;
        format: string | null;
        size: number | null;
    }[]>;
}
