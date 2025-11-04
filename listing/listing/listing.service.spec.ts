import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ConnectionService } from 'src/connection/connection.service';

export enum Status {
  Crypto = 'Crypto',
  Sports = 'Sports',
  Politics = 'Politics',
}

@Injectable()
export class ListingService {
  constructor(private readonly connectionService: ConnectionService) {}

  async createListing(
    seller_id: number,
    price: number,
    currency: string,
    status: Status,
    asset_id: string
  ) {
    try {
      if (!seller_id || !price || !currency || !status || !asset_id) {
        throw new BadRequestException('All fields are required');
      }

      const numericPrice = new Decimal(price);

      const newListing = await this.connectionService.listing.create({
        data: {
          seller_id,
          price: numericPrice,
          currency,
          status,
          asset_id,
        },
      });

      return { success: true, listing: newListing };
    } catch (err) {
      console.error('Error in ListingService.createListing:', err.message);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getListing() {
    const listings = await this.connectionService.listing.findMany();
    return { success: true, listings };
  }
}
