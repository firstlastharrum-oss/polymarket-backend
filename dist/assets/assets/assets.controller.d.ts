import { AssetsService } from './assets.service';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    uploadImage(file: Express.Multer.File): Promise<{
        message: string;
        pubilic_url: any;
        url: any;
    }>;
    getImage(publicId: string): Promise<{
        message: string;
        image: any;
    }>;
    getAllAssets(): Promise<{
        success: boolean;
        assets: {
            id: string;
            public_id: string;
            url: string;
            created_at: Date;
            uploaded_by: number | null;
            type: string | null;
            format: string | null;
            size: number | null;
        }[];
    }>;
}
