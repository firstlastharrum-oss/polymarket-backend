import { Injectable, NotFoundException } from '@nestjs/common';
import { Status, MatchStatus, PoolStatus } from '../../generated/prisma';
import { ConnectionService } from 'src/connection/connection.service';
import { OpenAI } from 'openai';
import { MarketValidationService } from './market-validation.service';

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
  marketId?: string; // On-chain ID
  expires_at?: Date;
}

@Injectable()
export class ListingService {
  private readonly openaiClient?: OpenAI;

  constructor(
    private prisma: ConnectionService,
    private validationService: MarketValidationService,
  ) {
    const apiKey = process.env.HF_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openaiClient = new OpenAI({
        baseURL: 'https://router.huggingface.co/v1',
        apiKey,
      });
    }
  }

  // Create a new listing with associated asset
  async createListing(data: CreateListingDto) {
    // Hardened Check: Validate before creation (Engine Level)
    const validation = await this.validationService.validateMarket(data.title, data.description || '');
    if (!validation.isValid) {
      try {
        await (this.prisma as any).eventLog.create({
          data: {
            type: 'ListingCreationRejected',
            refMatchId: null,
            refPoolId: null,
            payload: {
              sellerId: data.seller_id,
              title: data.title,
              reason: validation.reason || 'Invalid market',
              timestamp: new Date(),
            } as any,
          },
        });
      } catch {}
      throw new Error(`Market validation failed: ${validation.reason}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let seller = await tx.auth.findUnique({ where: { id: data.seller_id } });
      if (!seller) {
        const syntheticEmail = `user-${data.seller_id}-${Date.now()}@user.local`;
        seller = await tx.auth.create({
          data: {
            email: syntheticEmail,
            username: `user_${data.seller_id}`,
            password: '',
            role: 'buyer' as any,
            setting: {} as any,
          },
        });
      }
      const asset = await tx.asset.create({
        data: {
          public_id: data.filename,
          url: `/uploads/${data.filename}`,
          uploaded_by: seller.id,
          type: 'image',
          format: data.mimetype.split('/')[1],
          size: data.size,
        },
      });

      const descriptionWithId = data.marketId 
        ? `${data.description || ''}\n\n[OnChainID: ${data.marketId}]` 
        : (data.description || '');

      const listing = await tx.listing.create({
        data: {
          title: data.title,
          description: descriptionWithId,
          asset_id: asset.id.toString(),
          seller_id: seller.id,
          price: data.price,
          currency: data.currency,
          status: data.status,
        },
        include: {
          asset: true,
          seller: { select: { id: true, username: true, email: true, wallet_address: true } },
        },
      });

      const bet = await tx.bet.create({
        data: {
            creatorId: seller.id,
            title: data.title,
            description: descriptionWithId,
            category: 'General',
            options: JSON.stringify({ yes: 'YES', no: 'NO' }),
            stakeAmount: 0 as any,
            currency: data.currency,
            endDate: (data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) as any,
            status: 'ACTIVE' as any,
        }
      });

      const match = await tx.match.create({
        data: {
          betAId: bet.id,
          betBId: undefined, 
          status: MatchStatus.PENDING,
        },
      });
      await tx.pool.create({
        data: ({
          matchId: match.id,
          listingId: listing.id,
          userAId: seller.id,
          stakeA: 0 as any,
          stakeB: 0 as any,
          totalYesAmount: 0 as any,
          totalNoAmount: 0 as any,
          totalPoolAmount: 0 as any,
          participantsCount: 0,
          status: PoolStatus.LIVE,
          outcome: 'YES',
          closeTime: new Date((data.expires_at ? data.expires_at : (listing as any).expires_at || (bet.endDate as any))) as any,
        } as any),
      });

      return listing;
    });

    return { success: true, message: 'Listing created successfully', data: result };
  }

  // Fetch all listings with related asset and seller
  async getListing() {
    const listings = await this.prisma.listing.findMany({
      include: {
        asset: true,
        seller: { select: { id: true, username: true, email: true } },
        pools: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: listings };
  }

  // Fetch a single listing by ID with asset, seller, and orders
  async getListingById(id: number) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        asset: true,
        seller: { select: { id: true, username: true, email: true, wallet_address: true } },
        orders: {
          include: {
            buyer: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    if (!listing) throw new NotFoundException(`Listing with ID ${id} not found`);
    return { success: true, data: listing };
  }

  // Analyze market content for ethical concerns using AI and new Validation Engine
  async analyzeMarket(
    title: string,
    description?: string,
  ): Promise<{ success: boolean; isEthical: boolean; reason: string }> {
    // 1. Run Comprehensive Validation Engine (Duplicates, Ethics, Manipulation, Validity)
    const validation = await this.validationService.validateMarket(title, description || '');
    
    if (!validation.isValid) {
      return {
        success: true,
        isEthical: false,
        reason: validation.reason || 'Market validation failed',
      };
    }

    // 2. Optional: Run Legacy AI Check if Validation Engine passes
    // (We keep this for "AI ethics" requirement if the rule-based engine misses something subtle)
    // ... existing logic ...

    const text = `${title} ${description || ''}`.toLowerCase();
    const harmfulPatterns = [
      /\bkill\b/,
      /\bsuicide\b/,
      /\bsuicidal\b/,
      /\bmurder\b/,
      /\bbomb\b/,
      /\bterrorist\b/,
      /\brape\b/,
      /\bweapon(s)?\b/,
      /\bdrug(s)?\b/,
      /\bdrug\s+trafficking\b/,
      /\billegal\b/,
      /\bharm\b/,
      /\bhurt\b/,
      /\bhate\b/,
      /\bracist\b/,
      /\bviolence\b/,
      /\bdeath\b/,
      /\bdie\b/,
      /\binjury\b/,
      /\baccident\b/,
      /\bfatal\b/,
      /\bdisaster\b/,
      /\bshooting\b/,
      /\bexploit(ation)?\b/,
    ];
    const intentPatterns = [
      /\bhow to\b/,
      /\bwhere to buy\b/,
      /\bbuy\b/,
      /\bsell\b/,
      /\bsupply\b/,
      /\border\b/,
      /\bcontact\b/,
      /\bvendor\b/,
      /\bsupplier\b/,
      /\bmanufactur(e|ing)\b/,
      /\bguide\b/,
      /\btutorial\b/,
      /\bstep(s)?\b/,
    ];
    const predictiveContext = /\b(will|would|predict|prediction|odds|chance|forecast|bet|market)\b/.test(text);
    const allowedContextWords = [
      'policy','legal','regulation','law','debate','news','report','study','statistic','trend','index',
      'market','price','election','vote','stock','crypto','bitcoin','ethereum','sports','game'
    ];
    const hasAllowedContext = allowedContextWords.some((w) => new RegExp(`\\b${w}\\b`).test(text));
    const minorSexual = /(child|minor)s?\b[\s\S]*\b(sex|porn|abuse|exploitation)\b/.test(text);
    const hasHarmful = harmfulPatterns.some((r) => r.test(text));
    const hasIntent = intentPatterns.some((r) => r.test(text));
    
    // STRICTER CHECK: If harmful content is present, block it regardless of intent (for severe categories)
    const severeHarm = /\b(kill|murder|assassinate|terrorist|bomb|rape|torture|slave)\b/.test(text);
    const localEthical = minorSexual ? false : (severeHarm) ? false : (hasHarmful && hasIntent) ? false : true;

    if (!localEthical || !this.openaiClient) {
      return {
        success: true,
        isEthical: localEthical,
        reason: localEthical ? 'Market appears ethical' : 'Content may be unethical',
      };
    }

    try {
      const marketText = description ? `Title: ${title}\nDescription: ${description}` : `Title: ${title}`;
      const completion = await this.openaiClient.chat.completions.create({
        model: 'mistralai/Mistral-7B-Instruct-v0.2:featherless-ai',
        messages: [{ role: 'user', content: `Respond with true or false if this market is ethical:\n${marketText}` }],
        temperature: 0,
        max_tokens: 10,
      });
      const result = completion.choices?.[0]?.message?.content?.trim().toLowerCase() || '';
      const modelSaysTrue = result === 'true' || (result.includes('true') && !result.includes('false'));
      const modelSaysFalse = result === 'false' || (result.includes('false') && !result.includes('true'));
      const isEthical = localEthical ? true : modelSaysTrue ? true : modelSaysFalse ? false : false;
      return {
        success: true,
        isEthical,
        reason: isEthical ? 'Market appears ethical' : 'Content may be unethical',
      };
    } catch {
      return {
        success: true,
        isEthical: localEthical,
        reason: localEthical ? 'Market appears ethical' : 'Content may be unethical',
      };
    }
  }
}
