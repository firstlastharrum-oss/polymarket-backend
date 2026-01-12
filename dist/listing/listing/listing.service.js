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
exports.ListingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const connection_service_1 = require("../../src/connection/connection.service");
const openai_1 = require("openai");
const market_validation_service_1 = require("./market-validation.service");
let ListingService = class ListingService {
    constructor(prisma, validationService) {
        this.prisma = prisma;
        this.validationService = validationService;
        const apiKey = process.env.HF_API_KEY || process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openaiClient = new openai_1.OpenAI({
                baseURL: 'https://router.huggingface.co/v1',
                apiKey,
            });
        }
    }
    async createListing(data) {
        const validation = await this.validationService.validateMarket(data.title, data.description || '');
        if (!validation.isValid) {
            try {
                await this.prisma.eventLog.create({
                    data: {
                        type: 'ListingCreationRejected',
                        refMatchId: null,
                        refPoolId: null,
                        payload: {
                            sellerId: data.seller_id,
                            title: data.title,
                            reason: validation.reason || 'Invalid market',
                            timestamp: new Date(),
                        },
                    },
                });
            }
            catch { }
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
                        role: 'buyer',
                        setting: {},
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
                    stakeAmount: 0,
                    currency: data.currency,
                    endDate: (data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                    status: 'ACTIVE',
                }
            });
            const match = await tx.match.create({
                data: {
                    betAId: bet.id,
                    betBId: undefined,
                    status: client_1.MatchStatus.PENDING,
                },
            });
            await tx.pool.create({
                data: {
                    matchId: match.id,
                    listingId: listing.id,
                    userAId: seller.id,
                    stakeA: 0,
                    stakeB: 0,
                    totalYesAmount: 0,
                    totalNoAmount: 0,
                    totalPoolAmount: 0,
                    participantsCount: 0,
                    status: client_1.PoolStatus.LIVE,
                    outcome: 'YES',
                    closeTime: new Date((data.expires_at ? data.expires_at : listing.expires_at || bet.endDate)),
                },
            });
            return listing;
        });
        return { success: true, message: 'Listing created successfully', data: result };
    }
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
    async getListingById(id) {
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
        if (!listing)
            throw new common_1.NotFoundException(`Listing with ID ${id} not found`);
        return { success: true, data: listing };
    }
    async analyzeMarket(title, description) {
        const validation = await this.validationService.validateMarket(title, description || '');
        if (!validation.isValid) {
            return {
                success: true,
                isEthical: false,
                reason: validation.reason || 'Market validation failed',
            };
        }
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
            'policy', 'legal', 'regulation', 'law', 'debate', 'news', 'report', 'study', 'statistic', 'trend', 'index',
            'market', 'price', 'election', 'vote', 'stock', 'crypto', 'bitcoin', 'ethereum', 'sports', 'game'
        ];
        const hasAllowedContext = allowedContextWords.some((w) => new RegExp(`\\b${w}\\b`).test(text));
        const minorSexual = /(child|minor)s?\b[\s\S]*\b(sex|porn|abuse|exploitation)\b/.test(text);
        const hasHarmful = harmfulPatterns.some((r) => r.test(text));
        const hasIntent = intentPatterns.some((r) => r.test(text));
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
        }
        catch {
            return {
                success: true,
                isEthical: localEthical,
                reason: localEthical ? 'Market appears ethical' : 'Content may be unethical',
            };
        }
    }
};
exports.ListingService = ListingService;
exports.ListingService = ListingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService,
        market_validation_service_1.MarketValidationService])
], ListingService);
//# sourceMappingURL=listing.service.js.map