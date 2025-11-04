import { Injectable, NotFoundException } from '@nestjs/common';
import { Status } from '@prisma/client';
import { ConnectionService } from 'src/connection/connection.service';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface CreateListingDto {
  seller_id: number;
  price: number;
  currency: string;
  status: Status;
  filename: string;
  mimetype: string;
  size: number;
  title: string;
  description?: string;
}

@Injectable()
export class ListingService {
  constructor(private prisma: ConnectionService) {}

  async createListing(data: CreateListingDto) {
    const asset = await this.prisma.asset.create({
      data: {
        public_id: data.filename,
        url: `/uploads/${data.filename}`,
        uploaded_by: data.seller_id,
        type: 'image',
        format: data.mimetype.split('/')[1],
        size: data.size,
      },
    });

    const listing = await this.prisma.listing.create({
      data: {
        title: data.title,
        description: data.description || '',
        asset_id: asset.id.toString(),
        seller_id: data.seller_id,
        price: data.price,
        currency: data.currency,
        status: data.status,
      },
      include: {
        asset: true,
        seller: { select: { id: true, username: true, email: true } },
      },
    });

    return { success: true, message: 'Listing created successfully', data: listing };
  }

  async getListing() {
    const listings = await this.prisma.listing.findMany({
      include: {
        asset: true,
        seller: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  
    return {
      success: true,
      data: listings,
    };
  }
  

  async getListingById(id: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        asset: true,
        seller: { select: { id: true, username: true, email: true, wallet_address: true } },
        orders: {
          include: { buyer: { select: { id: true, username: true, email: true } } },
        },
      },
    });

    if (!listing) throw new NotFoundException(`Listing with ID ${id} not found`);
    return { success: true, data: listing };
  }
  analyzeBet(bet: string): boolean {
    const prompt = `You are an AI ethics filter for prediction markets.

Your task is to analyze whether a given bet topic is ETHICAL or UNETHICAL according to the following principles:
- Promotes harm, violence, death, or illegal acts → unethical
- Encourages discrimination, hate, or exploitation → unethical
- Involves natural disasters, accidents, or suffering of people → unethical
- Covers neutral, political, sports, finance, or harmless future events → ethical

Rules:
- Respond strictly with "true" if the bet is ETHICAL
- Respond strictly with "false" if the bet is UNETHICAL
- Do NOT include any explanation, extra text, punctuation, or newlines

Bet to analyze:
"${bet}"`;

    const lower = bet.toLowerCase();
    const unethicalPatterns = [
      'kill','death','murder','die','attack','war','terror','bomb',
      'explosion','flood','earthquake','suicide','crime','virus',
      'abuse','hate','racism','disaster','injury'
    ];

    const unethical = unethicalPatterns.some(word => lower.includes(word));

    return !unethical;
  }
}
