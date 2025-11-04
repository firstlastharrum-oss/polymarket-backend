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
const listing_service_1 = require("./listing.service");
const listing_guard_1 = require("./listing.guard");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
var Status;
(function (Status) {
    Status["Crypto"] = "Crypto";
    Status["Sports"] = "Sports";
    Status["Politics"] = "Politics";
})(Status || (Status = {}));
let ListingController = class ListingController {
    constructor(listingService) {
        this.listingService = listingService;
    }
    async createListing(file, price, currency, status, title, description, req) {
        const seller_id = req.user?.id;
        if (!seller_id)
            throw new common_1.UnauthorizedException('User not authenticated');
        if (!file)
            throw new common_1.BadRequestException('Asset image is required');
        if (!title?.trim())
            throw new common_1.BadRequestException('Title is required');
        if (!price || isNaN(parseFloat(price)))
            throw new common_1.BadRequestException('Valid price is required');
        return this.listingService.createListing({
            seller_id,
            price: parseFloat(price),
            currency,
            status: status,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            title,
            description,
        });
    }
    async getAllListings() {
        return this.listingService.getListing();
    }
    async getListingById(id) {
        return this.listingService.getListingById(id);
    }
};
exports.ListingController = ListingController;
__decorate([
    (0, common_1.UseGuards)(listing_guard_1.JwtCookieAuthGuard),
    (0, common_1.Post)('create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('asset', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (_, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + (0, path_1.extname)(file.originalname));
            },
        }),
        fileFilter: (_, file, cb) => {
            if (!file.mimetype.startsWith('image/')) {
                return cb(new common_1.BadRequestException('Only image files are allowed'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('price')),
    __param(2, (0, common_1.Body)('currency')),
    __param(3, (0, common_1.Body)('status')),
    __param(4, (0, common_1.Body)('title')),
    __param(5, (0, common_1.Body)('description')),
    __param(6, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "createListing", null);
__decorate([
    (0, common_1.Get)('all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ListingController.prototype, "getAllListings", null);
__decorate([
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