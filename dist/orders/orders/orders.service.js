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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const connection_service_1 = require("../../src/connection/connection.service");
const client_1 = require("@prisma/client");
let OrdersService = class OrdersService {
    constructor(connectionService) {
        this.connectionService = connectionService;
    }
    async createOrder(buyerId, sellerId, listingId, amount) {
        try {
            const order = await this.connectionService.order.create({
                data: {
                    buyerId,
                    sellerId,
                    listingId,
                    amount,
                    status: client_1.OrderStatus.PENDING,
                },
            });
            return { success: true, order };
        }
        catch (err) {
            console.error('Err in OrdersService.createOrder:', err);
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async getOrderById(id) {
        try {
            const order = await this.connectionService.order.findUnique({
                where: { id },
                include: { buyer: true, seller: true, listing: true },
            });
            if (!order)
                throw new common_1.BadGatewayException('No order found');
            return { success: true, order };
        }
        catch (err) {
            console.error('Err in OrdersService.getOrderById:', err);
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async getOrdersByBuyer(buyerId) {
        try {
            const orders = await this.connectionService.order.findMany({
                where: { buyerId },
                include: { listing: true },
                orderBy: { createdAt: 'desc' },
            });
            return { success: true, orders };
        }
        catch (err) {
            console.error('Err in OrdersService.getOrdersByBuyer:', err);
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map