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
                include: { listing: true, buyer: true, seller: true },
                orderBy: { createdAt: 'desc' },
            });
            return { success: true, orders };
        }
        catch (err) {
            console.error('Err in OrdersService.getOrdersByBuyer:', err);
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async placeBet(buyerId, sellerId, listingId, amount, choice) {
        try {
            const balance = await this.connectionService.balance.findUnique({ where: { userId: buyerId } });
            if (!balance || Number(balance.available) < amount) {
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const pool = await this.connectionService.pool.findUnique({ where: { listingId } });
            if (!pool) {
                throw new common_1.BadRequestException('Market pool not found');
            }
            if (pool.status !== client_1.PoolStatus.LIVE && pool.status !== client_1.PoolStatus.PENDING) {
                throw new common_1.BadRequestException('Market is not open for betting');
            }
            const order = await this.connectionService.order.create({
                data: {
                    buyerId,
                    sellerId,
                    listingId,
                    amount,
                    status: client_1.OrderStatus.PENDING,
                },
            });
            await this.connectionService.balance.update({
                where: { userId: buyerId },
                data: {
                    available: { decrement: amount },
                    locked: { increment: amount },
                }
            });
            const side = choice.toUpperCase() === 'YES' ? client_1.Side.YES : client_1.Side.NO;
            await this.connectionService.pool.update({
                where: { matchId: pool.matchId },
                data: {
                    totalPoolAmount: { increment: amount },
                    totalYesAmount: side === client_1.Side.YES ? { increment: amount } : undefined,
                    totalNoAmount: side === client_1.Side.NO ? { increment: amount } : undefined,
                    participantsCount: { increment: 1 }
                }
            });
            const existingPos = await this.connectionService.position.findFirst({
                where: { poolId: pool.matchId, userId: buyerId, side }
            });
            if (existingPos) {
                await this.connectionService.position.update({
                    where: { id: existingPos.id },
                    data: { amount: { increment: amount } }
                });
            }
            else {
                const buyer = await this.connectionService.auth.findUnique({ where: { id: buyerId } });
                await this.connectionService.position.create({
                    data: {
                        poolId: pool.matchId,
                        userId: buyerId,
                        side,
                        amount,
                        walletAddress: buyer?.wallet_address || ''
                    }
                });
            }
            let txHash = null;
            if (pool.marketId) {
                const rpcUrl = process.env.RPC_URL || process.env.MARKET_RPC_URL;
                const bettingAddress = process.env.MARKET_ADDRESS || process.env.BETTING_ADDRESS;
                const pk = process.env.BETTING_PK || process.env.MARKET_PK;
                if (rpcUrl && bettingAddress && pk) {
                    try {
                        const ethersAny = require('ethers');
                        const provider = new ethersAny.JsonRpcProvider(rpcUrl);
                        const wallet = new ethersAny.Wallet(pk, provider);
                        const abi = [
                            'function placeBet(uint256 marketId, bool yes) external payable'
                        ];
                        const contract = new ethersAny.Contract(bettingAddress, abi, wallet);
                        const valueWei = ethersAny.parseEther(String(amount));
                        const tx = await contract.placeBet(pool.marketId, side === client_1.Side.YES, { value: valueWei });
                        const receipt = await tx.wait();
                        txHash = receipt.hash;
                    }
                    catch (chainErr) {
                        console.error('Chain call failed but DB bet succeeded:', chainErr?.message || chainErr);
                    }
                }
            }
            await this.connectionService.order.update({
                where: { id: order.id },
                data: { status: client_1.OrderStatus.COMPLETED },
            });
            return { success: true, orderId: order.id, txHash, status: 'COMPLETED' };
        }
        catch (err) {
            console.error('Err in OrdersService.placeBet:', err);
            if (err instanceof common_1.BadRequestException)
                throw err;
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