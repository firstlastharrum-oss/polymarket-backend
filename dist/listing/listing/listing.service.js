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
const connection_service_1 = require("../../src/connection/connection.service");
let ListingService = class ListingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createListing(data) {
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
    async getListingById(id) {
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
        if (!listing)
            throw new common_1.NotFoundException(`Listing with ID ${id} not found`);
        return { success: true, data: listing };
    }
    analyzeBet(bet) {
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
            'kill', 'death', 'murder', 'die', 'attack', 'war', 'terror', 'bomb',
            'explosion', 'flood', 'earthquake', 'suicide', 'crime', 'virus',
            'abuse', 'hate', 'racism', 'disaster', 'injury'
        ];
        const unethical = unethicalPatterns.some(word => lower.includes(word));
        return !unethical;
    }
};
exports.ListingService = ListingService;
exports.ListingService = ListingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService])
], ListingService);
//# sourceMappingURL=listing.service.js.map