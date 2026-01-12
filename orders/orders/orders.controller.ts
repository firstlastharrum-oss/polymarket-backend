import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CookieAuthGuard } from './orders.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @UseGuards(CookieAuthGuard) 
  async createOrder(
    @Req() req,
    @Body('listingId') listingId: number,
    @Body('amount') amount: number,
  ) {
    const buyerId = req.user?.id;

    if (!buyerId || !listingId || !amount) {
      throw new BadRequestException('Listing ID and amount are required');
    }

    const listing = await this.ordersService['connectionService'].listing.findUnique({
      where: { id: listingId },
      select: { seller_id: true },
    });

    if (!listing) {
      throw new BadRequestException('Invalid listing');
    }

    const sellerId = listing.seller_id;

    return await this.ordersService.createOrder(
      buyerId,
      sellerId,
      listingId,
      amount,
    );
  }

  @Post('bet')
  @UseGuards(CookieAuthGuard)
  async placeBet(
    @Req() req,
    @Body('listingId') listingId: number,
    @Body('amount') amount: number,
    @Body('choice') choice: string,
  ) {
    const buyerId = req.user?.id;
    if (!buyerId || !listingId || !amount || !choice) {
      throw new BadRequestException('Listing ID, amount and choice are required');
    }
    if (typeof choice !== 'string' || choice.trim().length < 2) {
      throw new BadRequestException('Invalid choice');
    }
    const listing = await this.ordersService['connectionService'].listing.findUnique({
      where: { id: listingId },
      select: { seller_id: true },
    });
    if (!listing) throw new BadRequestException('Invalid listing');
    const sellerId = listing.seller_id;

    return await this.ordersService.placeBet(
      buyerId,
      sellerId,
      listingId,
      Number(amount),
      String(choice).trim(),
    );
  }

  @Get(':id')
  @UseGuards(CookieAuthGuard) 
  async getOrderById(@Param('id') id: number) {
    if (!id) throw new BadRequestException('Order ID is required');
    return await this.ordersService.getOrderById(Number(id));
  }

  @Get()
  @UseGuards(CookieAuthGuard) 
  async getOrdersByUser(@Req() req) {
    const buyerId = req.user?.id;
    if (!buyerId) throw new BadRequestException('Invalid user');
    return await this.ordersService.getOrdersByBuyer(buyerId);
  }
}
