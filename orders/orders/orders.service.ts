import { Injectable, InternalServerErrorException, BadGatewayException, BadRequestException } from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';
import { OrderStatus, PoolStatus, Side } from '../../generated/prisma';

@Injectable()
export class OrdersService {
  constructor(private connectionService: ConnectionService) {}

  async createOrder(buyerId: number, sellerId: number, listingId: number, amount: number) {
    try {
      const order = await this.connectionService.order.create({
        data: {
          buyerId,
          sellerId,
          listingId,
          amount,
          status: OrderStatus.PENDING,
        },
      });
      return { success: true, order };
    } catch (err) {
      console.error('Err in OrdersService.createOrder:', err);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getOrderById(id: number) {
    try {
      const order = await this.connectionService.order.findUnique({
        where: { id },
        include: { buyer: true, seller: true, listing: true },
      });
      if (!order) throw new BadGatewayException('No order found');
      return { success: true, order };
    } catch (err) {
      console.error('Err in OrdersService.getOrderById:', err);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getOrdersByBuyer(buyerId: number) {
    try {
      const orders = await this.connectionService.order.findMany({
        where: { buyerId },
        include: { listing: true, buyer: true, seller: true },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, orders };
    } catch (err) {
      console.error('Err in OrdersService.getOrdersByBuyer:', err);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async placeBet(
    buyerId: number,
    sellerId: number,
    listingId: number,
    amount: number,
    choice: string,
  ) {
    try {
      // 1. Validate Balance
      const balance = await this.connectionService.balance.findUnique({ where: { userId: buyerId } });
      if (!balance || Number(balance.available) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // 2. Fetch Pool
      const pool = await this.connectionService.pool.findUnique({ where: { listingId } });
      if (!pool) {
        throw new BadRequestException('Market pool not found');
      }
      if (pool.status !== PoolStatus.LIVE && pool.status !== PoolStatus.PENDING) {
        throw new BadRequestException('Market is not open for betting');
      }

      // 3. Create Order
      const order = await this.connectionService.order.create({
        data: {
          buyerId,
          sellerId,
          listingId,
          amount,
          status: OrderStatus.PENDING,
        },
      });

      // 4. Update Balance (Deduct available, Add to locked)
      await this.connectionService.balance.update({
        where: { userId: buyerId },
        data: { 
          available: { decrement: amount },
          locked: { increment: amount },
        }
      });

      // 5. Update Pool Stats
      const side = choice.toUpperCase() === 'YES' ? Side.YES : Side.NO;
      await this.connectionService.pool.update({
        where: { matchId: pool.matchId },
        data: {
          totalPoolAmount: { increment: amount },
          totalYesAmount: side === Side.YES ? { increment: amount } : undefined,
          totalNoAmount: side === Side.NO ? { increment: amount } : undefined,
          participantsCount: { increment: 1 }
        }
      });

      // 6. Create/Update Position
      const existingPos = await this.connectionService.position.findFirst({
        where: { poolId: pool.matchId, userId: buyerId, side }
      });

      if (existingPos) {
        await this.connectionService.position.update({
          where: { id: existingPos.id },
          data: { amount: { increment: amount } }
        });
      } else {
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

      // 7. Chain Call (Optional / Conditional)
      let txHash = null;
      if (pool.marketId) {
        const rpcUrl = process.env.RPC_URL || process.env.MARKET_RPC_URL;
        // Prefer MARKET_ADDRESS as it is the main contract
        const bettingAddress = process.env.MARKET_ADDRESS || process.env.BETTING_ADDRESS;
        const pk = process.env.BETTING_PK || process.env.MARKET_PK;

        if (rpcUrl && bettingAddress && pk) {
          try {
            const ethersAny = require('ethers');
            const provider = new ethersAny.JsonRpcProvider(rpcUrl);
            const wallet = new ethersAny.Wallet(pk, provider);
            // Correct ABI for Market.sol placeBet
            const abi = [
              'function placeBet(uint256 marketId, bool yes) external payable'
            ];
            const contract = new ethersAny.Contract(bettingAddress, abi, wallet);
            const valueWei = ethersAny.parseEther(String(amount));
            
            const tx = await contract.placeBet(pool.marketId, side === Side.YES, { value: valueWei });
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (chainErr) {
            console.error('Chain call failed but DB bet succeeded:', chainErr?.message || chainErr);
          }
        }
      }

      // 8. Finalize Order
      await this.connectionService.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED },
      });

      return { success: true, orderId: order.id, txHash, status: 'COMPLETED' };

    } catch (err) {
      console.error('Err in OrdersService.placeBet:', err);
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
