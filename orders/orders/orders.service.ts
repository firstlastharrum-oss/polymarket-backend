import { Injectable, InternalServerErrorException, BadGatewayException } from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';
import { OrderStatus } from '@prisma/client';

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
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, orders };
    } catch (err) {
      console.error('Err in OrdersService.getOrdersByBuyer:', err);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
