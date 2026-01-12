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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const orders_guard_1 = require("./orders.guard");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async createOrder(req, listingId, amount) {
        const buyerId = req.user?.id;
        if (!buyerId || !listingId || !amount) {
            throw new common_1.BadRequestException('Listing ID and amount are required');
        }
        const listing = await this.ordersService['connectionService'].listing.findUnique({
            where: { id: listingId },
            select: { seller_id: true },
        });
        if (!listing) {
            throw new common_1.BadRequestException('Invalid listing');
        }
        const sellerId = listing.seller_id;
        return await this.ordersService.createOrder(buyerId, sellerId, listingId, amount);
    }
    async placeBet(req, listingId, amount, choice) {
        const buyerId = req.user?.id;
        if (!buyerId || !listingId || !amount || !choice) {
            throw new common_1.BadRequestException('Listing ID, amount and choice are required');
        }
        if (typeof choice !== 'string' || choice.trim().length < 2) {
            throw new common_1.BadRequestException('Invalid choice');
        }
        const listing = await this.ordersService['connectionService'].listing.findUnique({
            where: { id: listingId },
            select: { seller_id: true },
        });
        if (!listing)
            throw new common_1.BadRequestException('Invalid listing');
        const sellerId = listing.seller_id;
        return await this.ordersService.placeBet(buyerId, sellerId, listingId, Number(amount), String(choice).trim());
    }
    async getOrderById(id) {
        if (!id)
            throw new common_1.BadRequestException('Order ID is required');
        return await this.ordersService.getOrderById(Number(id));
    }
    async getOrdersByUser(req) {
        const buyerId = req.user?.id;
        if (!buyerId)
            throw new common_1.BadRequestException('Invalid user');
        return await this.ordersService.getOrdersByBuyer(buyerId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('listingId')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Post)('bet'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('listingId')),
    __param(2, (0, common_1.Body)('amount')),
    __param(3, (0, common_1.Body)('choice')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "placeBet", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(orders_guard_1.CookieAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrdersByUser", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map