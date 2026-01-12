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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const assets_guard_1 = require("./assets.guard");
const orders_guard_1 = require("../../orders/orders/orders.guard");
const common_2 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async register(email, username, password, wallet_address, role, setting, nonce, res) {
        return this.authService.register(email, username, password, wallet_address, role, setting, nonce, res);
    }
    async login(email, password, wallet_address, res) {
        return this.authService.login(email, password, res, wallet_address);
    }
    async getNonce(wallet_address) {
        return this.authService.getNonce(wallet_address);
    }
    async verifySignature(wallet_address, signature, res) {
        return this.authService.verifySignature(wallet_address, signature, res);
    }
    async verifySignatureAlias(wallet_address, signature, res) {
        return this.authService.verifySignature(wallet_address, signature, res);
    }
    async logout(res) {
        res.clearCookie('jwt');
        return { success: true, message: 'Logged out successfully' };
    }
    checkAuth(req) {
        return this.authService.getCurrentUser(req.user.id).then((r) => ({ success: true, user: r.data }));
    }
    async updateProfile(updateData, req) {
        return this.authService.updateProfile(req.user.id, updateData);
    }
    async changePassword(passwordData, req) {
        return this.authService.changePassword(req.user.id, passwordData.currentPassword, passwordData.newPassword);
    }
    async updatePreferences(preferencesData, req) {
        return this.authService.updatePreferences(req.user.id, preferencesData.preferences);
    }
    async getWishlist(req) {
        return this.authService.getWishlist(req.user.id);
    }
    async toggleWishlist(req, listingId) {
        return this.authService.toggleWishlist(req.user.id, Number(listingId));
    }
    async submitKyc(file, req) {
        if (!file)
            return { success: false, message: 'KYC document required' };
        const url = `/uploads/${file.filename}`;
        return this.authService.submitKyc(req.user.id, url);
    }
    async fund(wallet_address, amount, req) {
        const addr = wallet_address || req.user?.wallet_address;
        return this.authService.fundWallet(addr, Number(amount || 1));
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('username')),
    __param(2, (0, common_1.Body)('password')),
    __param(3, (0, common_1.Body)('wallet_address')),
    __param(4, (0, common_1.Body)('role')),
    __param(5, (0, common_1.Body)('setting')),
    __param(6, (0, common_1.Body)('nonce')),
    __param(7, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('email')),
    __param(1, (0, common_1.Body)('password')),
    __param(2, (0, common_1.Body)('wallet_address')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('nonce'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('wallet_address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getNonce", null);
__decorate([
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('wallet_address')),
    __param(1, (0, common_1.Body)('signature')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySignature", null);
__decorate([
    (0, common_1.Post)('verify-signature'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('wallet_address')),
    __param(1, (0, common_1.Body)('signature')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySignatureAlias", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('check'),
    (0, common_1.UseGuards)(assets_guard_1.JwtCookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "checkAuth", null);
__decorate([
    (0, common_1.Put)('update-profile'),
    (0, common_1.UseGuards)(assets_guard_1.JwtCookieAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('change-password'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Put)('update-preferences'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Get)('wishlist'),
    (0, common_1.UseGuards)(assets_guard_1.JwtCookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Post)('wishlist/toggle'),
    (0, common_1.UseGuards)(assets_guard_1.JwtCookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('listingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "toggleWishlist", null);
__decorate([
    (0, common_1.Post)('kyc/submit'),
    (0, common_1.UseGuards)(assets_guard_1.JwtCookieAuthGuard),
    (0, common_2.UseInterceptors)((0, platform_express_1.FileInterceptor)('document', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `kyc-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowed.includes(file.mimetype))
                return cb(null, false);
            cb(null, true);
        },
    })),
    __param(0, (0, common_2.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "submitKyc", null);
__decorate([
    (0, common_1.Post)('fund'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('wallet_address')),
    __param(1, (0, common_1.Body)('amount')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "fund", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map