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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const listing_service_1 = require("./listing.service");
const client_1 = require("@prisma/client");
const listing_guard_1 = require("./listing.guard");
let ListingController = class ListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    async createListing(file, price, currency, status, title, description, marketId, expiresAt, req) {
        console.log('Creating listing:', { title, price, currency, status, marketId });
        console.log('User:', req.user);
        console.log('File:', file?.filename);
        if (!req.user?.id) {
            throw new common_1.UnauthorizedException('User must be authenticated to create listings');
        }
        let fileData = file;
        if (!fileData && process.env.NODE_ENV !== 'production') {
            fileData = {
                filename: `default-asset-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`,
                mimetype: 'image/png',
                size: 1024,
                originalname: 'default.png',
                path: 'uploads/default.png',
                fieldname: 'asset',
                encoding: '7bit',
                destination: './uploads',
                buffer: Buffer.from('')
            };
        }
        if (!fileData) {
            throw new common_1.BadRequestException('Asset file is required');
        }
        if (!title?.trim()) {
            throw new common_1.BadRequestException('Market title is required');
        }
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            throw new common_1.BadRequestException('Valid price is required');
        }
        if (!currency?.trim()) {
            throw new common_1.BadRequestException('Currency is required');
        }
        try {
            const analysis = await this.listingService.analyzeMarket(title.trim(), description?.trim());
            if (!analysis.isEthical) {
                throw new common_1.BadRequestException(`Market rejected: ${analysis.reason || 'Content may be unethical or inappropriate'}`);
            }
            console.log('✅ Market analysis passed:', analysis);
        }
        catch (error) {
            console.warn('⚠️ Market analysis error:', error);
        }
        const sellerId = req.user.id;
        try {
            const result = await this.listingService.createListing({
                seller_id: sellerId,
                price: parsedPrice,
                currency: currency.trim(),
                status: status || client_1.Status.Politics,
                filename: fileData.filename,
                mimetype: fileData.mimetype,
                size: fileData.size,
                title: title.trim(),
                description: description?.trim() || '',
                marketId: marketId,
                expires_at: expiresAt ? new Date(expiresAt) : undefined,
            });
            console.log('✅ Listing created:', result.data.id);
            return {
                success: true,
                data: result.data,
                message: 'Listing created successfully',
            };
        }
        catch (error) {
            console.error('❌ Listing creation error:', error);
            throw new common_1.BadRequestException('Failed to create listing: ' + error.message);
        }
    }
    async getAdminListings() {
        try {
            const result = await this.listingService.getListing();
            return {
                success: true,
                data: result.data,
                count: result.data.length,
            };
        }
        catch (error) {
            console.error('❌ Error fetching admin listings:', error);
            throw new common_1.BadRequestException('Failed to fetch admin listings');
        }
    }
    async getAllListings() {
        try {
            const result = await this.listingService.getListing();
            return {
                success: true,
                data: result.data,
                count: result.data.length,
            };
        }
        catch (error) {
            console.error('❌ Error fetching listings:', error);
            throw new common_1.BadRequestException('Failed to fetch listings');
        }
    }
    async analyzeMarket(title, description) {
        if (!title?.trim()) {
            throw new common_1.BadRequestException('Market title is required');
        }
        try {
            const analysis = await this.listingService.analyzeMarket(title.trim(), description?.trim());
            return {
                success: true,
                data: analysis,
            };
        }
        catch (error) {
            console.error('❌ Analysis error:', error);
            throw new common_1.BadRequestException('Failed to analyze market: ' + error.message);
        }
    }
    async getListingById(id) {
        console.log('🔍 Fetching listing:', id);
        try {
            const result = await this.listingService.getListingById(id);
            if (!result.data) {
                throw new common_1.NotFoundException(`Listing with ID ${id} not found`);
            }
            return {
                success: true,
                data: result.data,
            };
        }
        catch (error) {
            console.error('❌ Error fetching listing:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException('Failed to fetch listing: ' + error.message);
        }
    }
};
exports.ListingController = ListingController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('asset', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = (0, path_1.extname)(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new common_1.BadRequestException('Only image files are allowed'), false);
            }
            cb(null, true);
        },
    })),
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('price')),
    __param(2, (0, common_1.Body)('currency')),
    __param(3, (0, common_1.Body)('status')),
    __param(4, (0, common_1.Body)('title')),
    __param(5, (0, common_1.Body)('description')),
    __param(6, (0, common_1.Body)('marketId')),
    __param(7, (0, common_1.Body)('expiresAt')),
    __param(8, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "createListing", null);
__decorate([
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    (0, common_1.Get)('admin/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "getAdminListings", null);
__decorate([
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "getAllListings", null);
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, common_1.Body)('title')),
    __param(1, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "analyzeMarket", null);
__decorate([
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "getListingById", null);
exports.ListingController = ListingController = __decorate([
    (0, common_1.Controller)('listing'),
    __metadata("design:paramtypes", [listing_service_1.ListingService])
], ListingController);
//# sourceMappingURL=listing.controller.js.map