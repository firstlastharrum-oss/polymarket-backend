"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../../src/connection/connection.service");
const cloudinary_1 = require("cloudinary");
let AssetsService = class AssetsService {
    constructor(connectionService) {
        this.connectionService = connectionService;
        cloudinary_1.v2.config({
            cloud_name: 'dj3l7qar9',
            api_key: '648656716361129',
            api_secret: '6VQgYOrLijMX3nJlljAaLYSjDT4',
        });
    }
    async uploadImage(file) {
        try {
            return await new Promise((resolve, reject) => {
                const upload = cloudinary_1.v2.uploader.upload_stream({ folder: 'uploads' }, (error, result) => {
                    if (error)
                        return reject(error);
                    resolve(result);
                });
                upload.end(file.buffer);
            });
        }
        catch (err) {
            console.error('Error in AssetsService.uploadImage:', err.message);
            throw new common_1.InternalServerErrorException('Failed to upload image to Cloudinary');
        }
    }
    async getImage(publicId) {
        try {
            const imageUrl = cloudinary_1.v2.url(publicId, {
                secure: true,
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            });
            return { imageUrl };
        }
        catch (err) {
            console.error('Cloudinary Error:', err);
            throw new common_1.InternalServerErrorException('Failed to fetch image from Cloudinary');
        }
    }
    async getAllAssets() {
        try {
            const assets = await this.connectionService.asset.findMany({
                orderBy: {
                    created_at: 'desc',
                },
            });
            return assets;
        }
        catch (err) {
            console.error('Database Error:', err);
            throw new common_1.InternalServerErrorException('Failed to fetch assets from database');
        }
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map