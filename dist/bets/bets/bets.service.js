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
exports.BetsService = void 0;
exports.toProbTag = toProbTag;
exports.toRiskLabel = toRiskLabel;
exports.scoreFeasibility = scoreFeasibility;
exports.scoreHealth = scoreHealth;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const connection_service_1 = require("../../src/connection/connection.service");
const client_1 = require("@prisma/client");
const gamification_service_1 = require("../../gamification/gamification/gamification.service");
let BetsService = class BetsService {
    constructor(connection, gamificationService) {
        this.connection = connection;
        this.gamificationService = gamificationService;
        const env = process.env;
        if (env.MARKET_RPC_URL && env.MARKET_ADDRESS && env.MARKET_PK && String(env.MARKET_AUTO_ACTIVATE || '').toLowerCase() === 'true') {
            setInterval(() => {
                this.retryPendingActivations().catch((e) => {
                    console.error('retryPendingActivations error', e?.message || e);
                });
                this.activateListingPools().catch((e) => {
                    console.error('activateListingPools error', e?.message || e);
                });
            }, 5000);
        }
        setInterval(() => {
            this.autoFinalizeExpired().catch(() => { });
        }, 10000);
        setInterval(() => {
            this.autoOracleCycle().catch(() => { });
        }, 10000);
        setInterval(() => {
            this.expirePendingPools().catch(() => { });
        }, 60000);
    }
    async expirePendingPools() {
        const threshold = new Date(Date.now() - 60 * 60 * 1000);
        const expired = await this.connection.pool.findMany({
            where: { status: client_1.PoolStatus.PENDING, createdAt: { lt: threshold } },
        });
        for (const pool of expired) {
            const positions = await this.connection.position.findMany({ where: { poolId: pool.matchId } });
            for (const p of positions) {
                const bal = await this.connection.balance.findUnique({ where: { userId: p.userId } });
                if (bal) {
                    await this.connection.balance.update({
                        where: { userId: p.userId },
                        data: { available: { increment: Number(p.amount) }, locked: { decrement: Number(p.amount) } },
                    });
                }
            }
            await this.connection.pool.update({ where: { matchId: pool.matchId }, data: { status: client_1.PoolStatus.CANCELLED } });
            await this.connection.eventLog.create({
                data: {
                    type: 'MarketExpired',
                    refPoolId: pool.matchId,
                    payload: { reason: 'Pending market expired due to insufficient liquidity' },
                },
            });
        }
    }
    async attemptPoolActivation(poolId) {
        const pool = await this.connection.pool.findUnique({ where: { matchId: poolId } });
        if (!pool || pool.status !== client_1.PoolStatus.PENDING)
            return;
        const stakeA = Number(pool.totalYesAmount || 0);
        const stakeB = Number(pool.totalNoAmount || 0);
        if (stakeA <= 0 || stakeB <= 0)
            return;
        const fakeMoney = String(process.env.TEST_FAKE_MONEY || 'true').toLowerCase() === 'true';
        if (fakeMoney) {
            await this.connection.pool.update({
                where: { matchId: pool.matchId },
                data: { status: client_1.PoolStatus.LIVE },
            });
            await this.connection.eventLog.create({
                data: { type: 'MarketLive', refPoolId: pool.matchId, payload: { marketId: `fake-${pool.matchId}` } },
            });
            return;
        }
        const env = process.env;
        const ethersAny = require('ethers');
        const rpc = env.MARKET_RPC_URL || env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545';
        const chainId = Number(env.MARKET_CHAIN_ID || 31337);
        const provider = ethersAny.providers?.JsonRpcProvider
            ? new ethersAny.providers.JsonRpcProvider(rpc, chainId)
            : new ethersAny.JsonRpcProvider(rpc, { chainId, name: chainId === 31337 ? 'hardhat' : 'custom' });
        const wallet = new ethersAny.Wallet(env.MARKET_PK, provider);
        const abi = [
            'function createPair(uint256 betAId, uint256 betBId, string category, string currency, uint256 stakeA, uint256 stakeB, address marketCreator, address creatorA, address creatorB, bool choiceA) external payable returns (uint256)',
            'event MarketCreated(uint256 indexed marketId, address creator, string category, string currency, uint256 stakeA, uint256 stakeB)'
        ];
        const contract = new ethersAny.Contract(env.MARKET_ADDRESS, abi, wallet);
        try {
            const stakeAWei = (ethersAny.utils?.parseEther || ethersAny.parseEther)(String(stakeA));
            const stakeBWei = (ethersAny.utils?.parseEther || ethersAny.parseEther)(String(stakeB));
            const totalWei = stakeAWei.add ? stakeAWei.add(stakeBWei) : (BigInt(stakeAWei) + BigInt(stakeBWei));
            const listing = await this.connection.listing.findUnique({ where: { id: pool.listingId || 0 } });
            const category = listing?.category || 'General';
            const currency = 'ETH';
            const tx = await contract.createPair(pool.matchId, pool.matchId, category, currency, stakeAWei, stakeBWei, env.MARKET_ADDRESS, env.MARKET_ADDRESS, env.MARKET_ADDRESS, true, {});
            const receipt = await tx.wait(1);
            const marketId = receipt?.transactionHash || tx?.hash;
            await this.connection.pool.update({
                where: { matchId: pool.matchId },
                data: { status: client_1.PoolStatus.LIVE },
            });
            await this.connection.eventLog.create({
                data: {
                    type: 'MarketLive',
                    refPoolId: pool.matchId,
                    payload: { marketId, txHash: marketId },
                },
            });
        }
        catch (e) {
            console.error('Pool activation failed', e);
        }
    }
    computeProbabilityTag(input) {
        const score = scoreFeasibility({ title: input.title, description: input.description, category: input.category });
        const tag = toProbTag(score);
        if (tag === 'HIGH')
            return 'High Probability';
        if (tag === 'MEDIUM')
            return 'Medium Probability';
        if (tag === 'LOW')
            return 'Low Probability';
        return 'Highly Speculative';
    }
    computeHealthScore(pool, match) {
        const s = scoreHealth(pool, match);
        const l = toRiskLabel(s);
        return { score: s, label: l };
    }
    async callEthics(payload) {
        try {
            const res = await fetch('http://localhost:5000/listing/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: payload.title, description: payload.description }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { verdict: 'REJECTED', reason: json?.reason || 'Ethics service rejected' };
            }
            const ok = json?.data?.isEthical === true || json?.isEthical === true;
            const reason = json?.data?.reason || json?.reason || (ok ? 'Approved' : 'Not ethical');
            return ok ? { verdict: 'APPROVED' } : { verdict: 'REJECTED', reason };
        }
        catch (e) {
            return { verdict: 'NEEDS_REVIEW', reason: e?.message || 'Ethics unreachable' };
        }
    }
    normalizeText(text) {
        return text.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, ' ');
    }
    calculateSimilarity(s1, s2) {
        const set1 = new Set(this.normalizeText(s1).split(' '));
        const set2 = new Set(this.normalizeText(s2).split(' '));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    async logRejection(userId, reason, details = {}) {
        await this.connection.eventLog.create({
            data: {
                type: 'MarketCreationRejected',
                refMatchId: null,
                refPoolId: null,
                payload: { userId, reason, timestamp: new Date(), ...details },
            },
        });
    }
    async createBet(userId, body) {
        const { title, description, category, options, choice, stakeAmount, currency, endDate } = body || {};
        const minStake = 5;
        if (!title || !description || !category || !endDate || !currency) {
            await this.logRejection(userId, 'Missing required fields', { body });
            throw new common_1.BadRequestException('Missing required fields');
        }
        if (!Array.isArray(options) || options.length < 2) {
            await this.logRejection(userId, 'Insufficient outcomes', { options });
            throw new common_1.BadRequestException('Market must have at least 2 outcomes');
        }
        if (new Set(options.map(o => String(o).trim().toLowerCase())).size !== options.length) {
            await this.logRejection(userId, 'Duplicate outcomes', { options });
            throw new common_1.BadRequestException('Outcomes must be unique');
        }
        if (String(description).length < 20) {
            await this.logRejection(userId, 'Description too short', { description });
            throw new common_1.BadRequestException('Description must be at least 20 characters');
        }
        if (new Date(endDate).getTime() < Date.now() + 60 * 60 * 1000) {
            await this.logRejection(userId, 'Invalid end time', { endDate });
            throw new common_1.BadRequestException('End time must be at least 1 hour in the future');
        }
        if (stakeAmount === undefined || stakeAmount === null || isNaN(Number(stakeAmount)) || Number(stakeAmount) < minStake) {
            await this.logRejection(userId, 'Insufficient liquidity', { stakeAmount, minStake });
            throw new common_1.BadRequestException(`Minimum initial stake/liquidity is ${minStake}`);
        }
        const illegalCategories = [
            'violence',
            'death',
            'terrorism',
            'elections manipulation',
            'criminal activity',
            'fraud',
            'hate',
            'harassment',
            'targeted harm',
            'self-harm',
            'exploitation',
        ];
        const illegalTerms = [
            'kill',
            'murder',
            'assassinate',
            'terrorist',
            'bomb',
            'attack',
            'suicide',
            'self harm',
            'self-harm',
            'exploit',
            'exploitative',
            'hate',
            'harass',
            'harassment',
            'racial slur',
            'fraud',
            'scam',
            'launder',
            'money laundering',
            'vote buying',
            'election manipulation',
            'rig election',
            'fix election',
            'dox',
            'doxxing',
        ];
        const catLower = String(category || '').toLowerCase();
        const textLower = (title + ' ' + description).toLowerCase();
        const illegalCatHit = illegalCategories.some((c) => catLower.includes(c));
        const illegalTextHit = illegalTerms.some((t) => textLower.includes(t));
        if (illegalCatHit || illegalTextHit) {
            const reason = illegalCatHit ? `Illegal category: ${category}` : 'Illegal content terms detected';
            await this.logRejection(userId, reason, { title, category, flags: { illegalCatHit, illegalTextHit } });
            throw new common_1.BadRequestException('Illegal market content blocked');
        }
        const blocklist = ['kill', 'murder', 'assassinate', 'terrorism', 'terrorist', 'sex', 'porn', 'child', 'abuse', 'suicide', 'bomb', 'attack'];
        const combinedText = (title + ' ' + description).toLowerCase();
        const foundBadWord = blocklist.find(w => combinedText.includes(w));
        if (foundBadWord) {
            await this.logRejection(userId, 'Ethical compliance violation (Keyword)', { word: foundBadWord });
            throw new common_1.BadRequestException('Market content violates ethical guidelines');
        }
        const ethics = await this.callEthics({ title, description, category, creatorId: userId });
        if (ethics.verdict === 'REJECTED') {
            await this.logRejection(userId, 'Ethical compliance violation (AI)', { reason: ethics.reason });
            throw new common_1.BadRequestException('Market rejected by ethics filter: ' + ethics.reason);
        }
        const recentBets = await this.connection.bet.findMany({
            where: {
                status: { in: [client_1.BetStatus.PENDING, client_1.BetStatus.ACTIVE, client_1.BetStatus.MATCHED] },
                createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
            },
        });
        const normalizedTitle = this.normalizeText(title);
        for (const existing of recentBets) {
            if (this.normalizeText(existing.title) === normalizedTitle &&
                new Date(existing.endDate).getTime() === new Date(endDate).getTime()) {
                await this.logRejection(userId, 'Duplicate market detected', { existingId: existing.id });
                throw new common_1.BadRequestException('Duplicate market detected');
            }
            const similarity = this.calculateSimilarity(title, existing.title);
            if (similarity > 0.8) {
                await this.logRejection(userId, 'Similar market detected', { existingId: existing.id, similarity });
                throw new common_1.BadRequestException('Market is too similar to an existing one');
            }
        }
        const userRecentCount = await this.connection.bet.count({
            where: {
                creatorId: userId,
                createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            },
        });
        if (userRecentCount >= 5) {
            await this.logRejection(userId, 'Creation rate limit exceeded', { count: userRecentCount });
            throw new common_1.BadRequestException('You are creating markets too frequently. Please wait.');
        }
        if (options.length > 10) {
            await this.logRejection(userId, 'Too many outcomes for new market', { outcomeCount: options.length });
            throw new common_1.BadRequestException('Too many outcomes (max 10)');
        }
        let aiScore = 100;
        const aiFlags = [];
        let aiReasoning = "Market appears valid.";
        if (userRecentCount < 1) {
            aiScore -= 10;
            aiFlags.push("New Creator");
        }
        if (description.length < 50) {
            aiScore -= 15;
            aiFlags.push("Short Description");
        }
        const similarBets = recentBets.filter(b => this.calculateSimilarity(title, b.title) > 0.5);
        if (similarBets.length > 0) {
            aiScore -= 20 * similarBets.length;
            aiFlags.push("Similar Markets Exist");
            aiReasoning = `Found ${similarBets.length} similar active markets.`;
        }
        const allowedCategories = ['Crypto', 'Sports', 'Elections', 'Technology'];
        if (!allowedCategories.includes(String(category))) {
            aiScore -= 10;
            aiFlags.push("Niche Category");
        }
        let finalStatus = client_1.BetStatus.PENDING;
        let finalVerdict = ethics.verdict === 'NEEDS_REVIEW' ? client_1.EthicsVerdict.NEEDS_REVIEW : client_1.EthicsVerdict.APPROVED;
        if (aiScore < 50) {
            await this.logRejection(userId, 'AI Confidence too low', { score: aiScore, flags: aiFlags });
            throw new common_1.BadRequestException(`Market rejected by AI review (Score: ${aiScore}/100). Reasons: ${aiFlags.join(', ')}`);
        }
        else if (aiScore < 80) {
            finalVerdict = client_1.EthicsVerdict.NEEDS_REVIEW;
            aiReasoning += " Flagged for admin review due to medium confidence.";
        }
        const userExisting = await this.connection.auth.findUnique({ where: { id: userId } });
        let userSetting = userExisting?.setting;
        if (!userExisting) {
            const syntheticEmail = `user-${userId}-${Date.now()}@user.local`;
            const created = await this.connection.auth.create({
                data: {
                    id: userId,
                    email: syntheticEmail,
                    username: `user_${userId}`,
                    password: '',
                    role: 'buyer',
                    setting: {},
                },
            });
            userSetting = created.setting;
        }
        const kycStatus = (userSetting?.kyc_status || 'verified').toLowerCase();
        if (kycStatus !== 'verified') {
            await this.logRejection(userId, 'KYC not verified', { kycStatus });
            throw new common_1.BadRequestException('KYC not verified');
        }
        const effectiveVerdict = finalVerdict;
        const bet = await this.connection.bet.create({
            data: {
                creatorId: userId,
                title,
                description,
                category,
                options,
                choice: choice ?? null,
                stakeAmount,
                currency,
                endDate: new Date(endDate),
                status: finalStatus,
                ethicsVerdict: effectiveVerdict,
                aiScore: Math.max(0, aiScore),
                aiAnalysis: { score: aiScore, flags: aiFlags, reasoning: aiReasoning },
            },
        });
        this.gamificationService.incrementBetCreation(userId).catch(e => console.error('Gamification update failed', e));
        return { success: true, bet };
    }
    async listBets(query) {
        const status = query?.status;
        const category = query?.category;
        const take = Math.min(Number(query?.limit ?? 20), 100);
        const skip = Math.max(Number(query?.offset ?? 0), 0);
        const where = {};
        if (status && client_1.BetStatus[status])
            where.status = status;
        if (category)
            where.category = category;
        const bets = await this.connection.bet.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
        return { success: true, bets };
    }
    async listMyBets(userId, query) {
        const status = query?.status;
        const take = Math.min(Number(query?.limit ?? 20), 100);
        const skip = Math.max(Number(query?.offset ?? 0), 0);
        const where = { creatorId: userId };
        if (status && client_1.BetStatus[status])
            where.status = status;
        const bets = await this.connection.bet.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } });
        return { success: true, bets };
    }
    async getBet(id) {
        const bet = await this.connection.bet.findUnique({ where: { id } });
        if (!bet)
            throw new common_1.BadRequestException('Bet not found');
        return { success: true, bet };
    }
    async listMatches() {
        const matches = await this.connection.match.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                pool: true,
                betA: {
                    include: {
                        creator: { select: { id: true, username: true, email: true } },
                    },
                },
                betB: {
                    include: {
                        creator: { select: { id: true, username: true, email: true } },
                    },
                },
            },
        });
        const enriched = await Promise.all(matches.map(async (m) => {
            const pool = m.pool;
            if (pool) {
                const { score, label } = this.computeHealthScore(pool, m);
                m.pool.healthScore = score;
                m.pool.riskLabel = label;
            }
            return m;
        }));
        return { success: true, matches: enriched };
    }
    async getAverageBetSize(matchId) {
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            return 0;
        const agg = await this.connection.position.aggregate({
            where: { poolId: matchId },
            _sum: { amount: true },
            _count: { amount: true },
        });
        const count = Number(agg?._count?.amount || 0);
        const sum = Number(agg?._sum?.amount || 0);
        if (count > 0 && sum > 0)
            return sum / count;
        const base = (Number(pool.stakeA) + Number(pool.stakeB)) / Math.max(1, (Number(pool.stakeB) > 0 ? 2 : 1));
        return base > 0 ? base : 0;
    }
    async voteResolution(userId, matchId, outcome, amount) {
        const match = await this.connection.match.findUnique({ where: { id: matchId } });
        if (!match)
            throw new common_1.BadRequestException('Match not found');
        let pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        const poolId = pool.matchId;
        let poolSafe = pool;
        if (String(pool.status) !== 'RESOLUTION_OPEN') {
            const now = Date.now();
            const closeTime = pool.closeTime ? new Date(pool.closeTime).getTime() : 0;
            const bettingEnded = closeTime && closeTime <= now;
            if (bettingEnded) {
                const prov = await this.connection.eventLog.findFirst({ where: { refMatchId: matchId, type: 'ProvisionalSet' }, orderBy: { createdAt: 'desc' } });
                let proposedYes = null;
                if (prov && prov.payload) {
                    const p = prov.payload;
                    if (typeof p.outcomeYes === 'boolean')
                        proposedYes = !!p.outcomeYes;
                    else if (typeof p.outcome === 'string')
                        proposedYes = String(p.outcome).toUpperCase() === 'YES';
                }
                if (proposedYes === null)
                    proposedYes = Number(pool.totalYesAmount || 0) >= Number(pool.totalNoAmount || 0);
                const hours = Number(process.env.RESOLUTION_WINDOW_HOURS || (pool.resolutionWindowHours || 24));
                await this.connection.$transaction(async (tx) => {
                    await tx.pool.update({ where: { matchId: poolId }, data: { status: client_1.PoolStatus.RESOLUTION_OPEN, resolutionDeadline: new Date(Date.now() + hours * 60 * 60 * 1000), outcome: proposedYes ? 'YES' : 'NO' } });
                    await tx.eventLog.create({ data: { type: 'OracleVotingOpened', refPoolId: poolId, payload: { windowHours: hours } } });
                    await tx.eventLog.create({ data: { type: 'DefaultOutcomeSet', refPoolId: poolId, payload: { outcome: proposedYes ? 'YES' : 'NO', source: prov ? 'onchain' : 'stakes' } } });
                });
                pool = await this.connection.pool.findUnique({ where: { matchId } });
                if (!pool)
                    throw new common_1.BadRequestException('Pool not found after opening resolution');
                poolSafe = pool;
            }
        }
        if (String(poolSafe.status) !== 'RESOLUTION_OPEN')
            throw new common_1.BadRequestException('Resolution not open');
        const normalized = String(outcome || 'YES').toUpperCase();
        if (normalized !== 'YES' && normalized !== 'NO')
            throw new common_1.BadRequestException('Invalid outcome');
        const fakeMoney = String(process.env.TEST_FAKE_MONEY || 'true').toLowerCase() === 'true';
        const avgBet = await this.getAverageBetSize(matchId);
        const percent = clamp(Number(poolSafe.resolutionMinStakePercent || 0.02), 0.01, 0.05);
        const minStake = Math.max(0.5, avgBet * percent);
        if (!fakeMoney && Number(amount) < minStake) {
            throw new common_1.BadRequestException(`Minimum stake for voting is $${minStake.toFixed(2)}`);
        }
        if (!fakeMoney) {
            const minParticipants = Number(poolSafe.minResolutionParticipants || 3);
            const capBase = Math.max(Number(poolSafe.totalPoolAmount || 0), minStake * minParticipants);
            const maxUserSharePercent = 0.3;
            const userCap = capBase * maxUserSharePercent;
            if (Number(amount) > userCap) {
                throw new common_1.BadRequestException(`Maximum stake per voter is $${userCap.toFixed(2)}`);
            }
        }
        const fakeFunds = String(process.env.FAKE_FUNDS || 'false').toLowerCase() === 'true';
        const allowFake = fakeFunds || fakeMoney;
        let balance = await this.connection.balance.findUnique({ where: { userId } });
        if (!balance) {
            try {
                await this.connection.balance.create({ data: { userId, available: 0, locked: 0 } });
            }
            catch (e) { }
            balance = await this.connection.balance.findUnique({ where: { userId } });
        }
        if (!allowFake) {
            if (!balance || Number(balance.available) < Number(amount))
                throw new common_1.BadRequestException('Insufficient funds');
        }
        const existing = await this.connection.resolutionVote.findUnique({ where: { poolId_userId: { poolId: poolSafe.matchId, userId } } });
        if (existing)
            throw new common_1.BadRequestException('Already voted');
        await this.connection.$transaction(async (tx) => {
            if (!allowFake) {
                await tx.balance.update({
                    where: { userId },
                    data: {
                        available: { decrement: Number(amount) },
                        locked: { increment: Number(amount) },
                    },
                });
            }
            await tx.resolutionVote.create({
                data: { poolId: poolSafe.matchId, userId, outcome: normalized, amount: Number(amount) },
            });
            const prevYes = Number(poolSafe.resolutionYesStake || 0);
            const prevNo = Number(poolSafe.resolutionNoStake || 0);
            await tx.pool.update({ where: { matchId: poolSafe.matchId }, data: { resolutionYesStake: (normalized === 'YES' ? prevYes + Number(amount) : prevYes), resolutionNoStake: (normalized === 'NO' ? prevNo + Number(amount) : prevNo) } });
            const deadline = poolSafe.resolutionDeadline;
            if (deadline) {
                const remainingMs = new Date(deadline).getTime() - Date.now();
                const softCloseMs = 5 * 60 * 1000;
                if (remainingMs > 0 && remainingMs <= softCloseMs && Number(amount) >= (minStake * 10)) {
                    await tx.pool.update({
                        where: { matchId: poolSafe.matchId },
                        data: { resolutionDeadline: new Date(Date.now() + 10 * 60 * 1000) },
                    });
                    await tx.eventLog.create({ data: { type: 'SoftCloseExtended', refPoolId: poolSafe.matchId, payload: { byUserId: userId, amount } } });
                }
            }
        });
        return { success: true };
    }
    async raiseDispute(userId, matchId, outcome, amount) {
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (String(pool.status) !== 'PROVISIONAL')
            throw new common_1.BadRequestException('Dispute not allowed');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        const dDeadline = pool.disputeDeadline;
        if (!dDeadline || Date.now() >= new Date(dDeadline).getTime()) {
            throw new common_1.BadRequestException('Dispute window closed');
        }
        const normalized = String(outcome || 'NO').toUpperCase();
        if (normalized !== 'YES' && normalized !== 'NO')
            throw new common_1.BadRequestException('Invalid outcome');
        const avgBet = await this.getAverageBetSize(matchId);
        const percent = clamp(Number(pool.disputeMinStakePercent || 0.05), 0.03, 0.10);
        const baseStake = Math.max(0.5, avgBet * percent);
        const minStake = Math.max(5, baseStake * 2);
        if (Number(amount) < minStake) {
            throw new common_1.BadRequestException(`Minimum stake for dispute is $${minStake.toFixed(2)}`);
        }
        const fakeFunds = String(process.env.FAKE_FUNDS || 'false').toLowerCase() === 'true';
        let balance = await this.connection.balance.findUnique({ where: { userId } });
        if (!balance) {
            try {
                await this.connection.balance.create({ data: { userId, available: 0, locked: 0 } });
            }
            catch (e) { }
            balance = await this.connection.balance.findUnique({ where: { userId } });
        }
        if (!fakeFunds) {
            if (!balance || Number(balance.available) < Number(amount))
                throw new common_1.BadRequestException('Insufficient funds');
        }
        const hasVoted = await this.connection.resolutionVote.findUnique({ where: { poolId_userId: { poolId: pool.matchId, userId } } });
        if (hasVoted)
            throw new common_1.BadRequestException('Already participated');
        await this.connection.$transaction(async (tx) => {
            await tx.balance.update({
                where: { userId },
                data: {
                    available: { decrement: Number(amount) },
                    locked: { increment: Number(amount) },
                },
            });
            await tx.resolutionVote.create({
                data: { poolId: pool.matchId, userId, outcome: normalized, amount: Number(amount) },
            });
            const prevYes = Number(pool.resolutionYesStake || 0);
            const prevNo = Number(pool.resolutionNoStake || 0);
            const newYes = normalized === 'YES' ? prevYes + Number(amount) : prevYes;
            const newNo = normalized === 'NO' ? prevNo + Number(amount) : prevNo;
            await tx.pool.update({
                where: { matchId },
                data: {
                    disputed: true,
                    disputeStakeTotal: { increment: Number(amount) },
                    resolutionYesStake: newYes,
                    resolutionNoStake: newNo,
                    status: 'RESOLUTION_OPEN',
                    resolutionDeadline: new Date(Date.now() + Number(pool.resolutionWindowHours || 12) * 60 * 60 * 1000),
                },
            });
            await tx.eventLog.create({ data: { type: 'DisputeRaised', refPoolId: pool.matchId, payload: { userId, outcome: normalized, amount } } });
        });
        return { success: true };
    }
    async challengeMatch(userId, matchId) {
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.status !== client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE)
            throw new common_1.BadRequestException('Challenge not allowed');
        if (!pool.challengeDeadline || Date.now() >= new Date(pool.challengeDeadline).getTime())
            throw new common_1.BadRequestException('Challenge window closed');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        const outcome = String(pool.outcome || 'YES').toUpperCase();
        const losingSide = outcome === 'YES' ? client_1.Side.NO : client_1.Side.YES;
        const hasLosingPosition = await this.connection.position.findFirst({ where: { poolId: pool.matchId, userId, side: losingSide } });
        const allowAny = String(process.env.TEST_ALLOW_ANY_CHALLENGE || 'false').toLowerCase() === 'true';
        if (!allowAny && !hasLosingPosition)
            throw new common_1.BadRequestException('Only losing user can challenge');
        const bond = Number(pool.challengeBond || 0);
        const fakeFunds = String(process.env.FAKE_FUNDS || 'false').toLowerCase() === 'true';
        let balance = await this.connection.balance.findUnique({ where: { userId } });
        if (!balance) {
            try {
                await this.connection.balance.create({ data: { userId, available: 0, locked: 0 } });
            }
            catch (e) { }
            balance = await this.connection.balance.findUnique({ where: { userId } });
        }
        if (!fakeFunds && bond > 0) {
            if (!balance || Number(balance.available) < bond)
                throw new common_1.BadRequestException('Insufficient funds');
        }
        await this.connection.$transaction(async (tx) => {
            if (bond > 0 && !fakeFunds) {
                await tx.balance.update({ where: { userId }, data: { available: { decrement: bond }, locked: { increment: bond } } });
            }
            await tx.pool.update({ where: { matchId: pool.matchId }, data: { challengerId: userId, status: client_1.PoolStatus.UNDER_REVIEW, challengeCount: (pool.challengeCount || 0) + 1 } });
            await tx.eventLog.create({ data: { type: 'OutcomeChallenged', refMatchId: matchId, refPoolId: pool.matchId, payload: { byUserId: userId, bond, proposedOutcome: pool.outcome, timestamp: new Date() } } });
        });
        return { success: true };
    }
    async finalizeResolutionVoting(adminUserId, matchId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin)
            throw new common_1.BadRequestException('Invalid user');
        const match = await this.connection.match.findUnique({ where: { id: matchId } });
        if (!match)
            throw new common_1.BadRequestException('Match not found');
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (String(pool.status) !== 'RESOLUTION_OPEN' && String(pool.status) !== 'RESOLUTION_CALCULATION')
            throw new common_1.BadRequestException('Not ready to finalize');
        const voteCount = await this.connection.resolutionVote.count({ where: { poolId: pool.matchId } });
        const minParticipants = Number(pool.minResolutionParticipants || 3);
        const windowHours = Number(pool.resolutionWindowHours || 12);
        const avgBet = await this.getAverageBetSize(matchId);
        const minPercent = clamp(Number(pool.resolutionMinStakePercent || 0.02), 0.01, 0.05);
        const minStake = Math.max(0.5, avgBet * minPercent);
        const yesStake = Number(pool.resolutionYesStake || 0);
        const noStake = Number(pool.resolutionNoStake || 0);
        const totalVotesStake = yesStake + noStake;
        const minTotalStake = minParticipants * minStake;
        const votesAll = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId } });
        const betA = await this.connection.bet.findUnique({ where: { id: match.betAId } });
        const betB = match.betBId ? await this.connection.bet.findUnique({ where: { id: match.betBId } }) : null;
        const creatorIds = new Set([Number(betA?.creatorId || 0), Number(betB?.creatorId || 0)]);
        const hasNonCreatorVoter = votesAll.some((v) => !creatorIds.has(Number(v.userId)));
        const fakeMoney = String(process.env.TEST_FAKE_MONEY || 'true').toLowerCase() === 'true';
        const fastOracle = String(process.env.TEST_FAST_ORACLE || 'false').toLowerCase() === 'true' || fakeMoney;
        if (!fastOracle) {
            if (!hasNonCreatorVoter) {
                await this.connection.pool.update({
                    where: { matchId },
                    data: { status: client_1.PoolStatus.UNDER_REVIEW, resolutionEscalated: true },
                });
                await this.connection.eventLog.create({ data: { type: 'SelfResolutionEscalated', refPoolId: pool.matchId, payload: { reason: 'no_non_creator_voters' } } });
                return { success: true, escalated: true };
            }
        }
        const capBase = Math.max(Number(pool.totalPoolAmount || 0), minTotalStake);
        const capThreshold = capBase * 0.3;
        const weight = (n) => {
            if (n <= capThreshold)
                return n;
            const excess = n - capThreshold;
            return capThreshold + 0.5 * excess;
        };
        const votesYes = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId, outcome: 'YES' } });
        const votesNo = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId, outcome: 'NO' } });
        const weightedYes = votesYes.reduce((acc, v) => acc + weight(Number(v.amount)), 0);
        const weightedNo = votesNo.reduce((acc, v) => acc + weight(Number(v.amount)), 0);
        let finalOutcome = weightedNo > weightedYes ? 'NO' : 'YES';
        const totalLosersStake = (finalOutcome === 'YES' ? votesNo : votesYes).reduce((acc, v) => acc + Number(v.amount), 0);
        const allVotes = [...votesYes, ...votesNo].map((v) => Number(v.amount)).sort((a, b) => b - a);
        const top1 = allVotes[0] || 0;
        const top2 = (allVotes[0] || 0) + (allVotes[1] || 0);
        const totalVotesStake2 = yesStake + noStake;
        const top1Share = totalVotesStake2 > 0 ? top1 / totalVotesStake2 : 0;
        const top2Share = totalVotesStake2 > 0 ? top2 / totalVotesStake2 : 0;
        if (top2Share >= 0.6) {
            await this.connection.eventLog.create({ data: { type: 'CollusionRisk', refPoolId: pool.matchId, payload: { top1Share, top2Share } } });
        }
        if (!fakeMoney && top2Share >= 0.8) {
            await this.connection.pool.update({ where: { matchId }, data: { status: client_1.PoolStatus.UNDER_REVIEW, resolutionEscalated: true } });
            await this.connection.eventLog.create({ data: { type: 'CollusionEscalated', refPoolId: pool.matchId, payload: { top1Share, top2Share } } });
            return { success: true, escalated: true };
        }
        const nowTs = Date.now();
        const recentCount = [...votesYes, ...votesNo].filter((v) => {
            const t = new Date(v.createdAt).getTime();
            return nowTs - t <= 2 * 60 * 1000;
        }).length;
        const totalVotes = votesYes.length + votesNo.length;
        if (totalVotes >= 5 && recentCount / totalVotes >= 0.5) {
            await this.connection.eventLog.create({ data: { type: 'RapidVotingPattern', refPoolId: pool.matchId, payload: { totalVotes, recentCount } } });
        }
        await this.connection.$transaction(async (tx) => {
            await tx.match.update({ where: { id: matchId }, data: { status: client_1.MatchStatus.RESOLVED } });
            await tx.pool.update({
                where: { matchId },
                data: {
                    status: client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE,
                    outcome: finalOutcome,
                    challengeDeadline: fakeMoney ? new Date(Date.now() + 10 * 1000) : (String(process.env.TEST_KEEP_CHALLENGE_OPEN || 'false').toLowerCase() === 'true' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000)),
                    isLocked: true,
                    settledAt: new Date(),
                    adminFinalized: false,
                },
            });
            await tx.eventLog.create({ data: { type: 'OracleOutcomeFinalized', refPoolId: pool.matchId, payload: { outcome: finalOutcome } } });
        });
        return { success: true, outcome: finalOutcome, status: 'RESOLVED_PENDING_CHALLENGE' };
    }
    async cancelBet(userId, id) {
        const bet = await this.connection.bet.findUnique({ where: { id } });
        if (!bet)
            throw new common_1.BadRequestException('Bet not found');
        if (bet.creatorId !== userId)
            throw new common_1.BadRequestException('Not your bet');
        if (bet.status !== client_1.BetStatus.PENDING && bet.status !== client_1.BetStatus.MATCHED) {
            throw new common_1.BadRequestException('Cannot cancel at current status');
        }
        if (bet.status === client_1.BetStatus.PENDING) {
            await this.connection.balance.update({
                where: { userId },
                data: {
                    available: { increment: Number(bet.stakeAmount) },
                    locked: { decrement: Number(bet.stakeAmount) }
                }
            });
        }
        const updated = await this.connection.bet.update({ where: { id }, data: { status: client_1.BetStatus.CANCELLED } });
        return { success: true, bet: updated };
    }
    async resolveMatch(adminUserId, id, winnerChoice) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const match = await this.connection.match.findUnique({ where: { id } });
        if (!match)
            throw new common_1.BadRequestException('Match not found');
        const pool = await this.connection.pool.findUnique({ where: { matchId: id } });
        if (!pool)
            throw new common_1.BadRequestException('No matched pool');
        if (pool.status === client_1.PoolStatus.PAID_OUT || match.status === client_1.MatchStatus.PAID) {
            throw new common_1.BadRequestException('Market already settled/paid');
        }
        const allowedStatuses = [client_1.PoolStatus.UNDER_REVIEW, client_1.PoolStatus.DISPUTED, client_1.PoolStatus.RESOLVED, client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE];
        if (!allowedStatuses.includes(pool.status)) {
            throw new common_1.BadRequestException(`Admin can only resolve markets in statuses: ${allowedStatuses.join(', ')}. Current status: ${String(pool.status)}`);
        }
        let choice = winnerChoice && String(winnerChoice).trim() ? String(winnerChoice).toUpperCase() : 'BY_VOTES';
        const betArec = await this.connection.bet.findUnique({ where: { id: match.betAId } });
        const betBrec = match.betBId ? await this.connection.bet.findUnique({ where: { id: match.betBId } }) : null;
        if (!betArec)
            throw new common_1.BadRequestException('Bets not found for this match');
        const optsA = Array.isArray(betArec.options) ? betArec.options : [];
        const optsB = Array.isArray(betBrec?.options) ? betBrec?.options : [];
        const validOutcomes = new Set([String(betArec.choice || '').toUpperCase(), String(betBrec?.choice || '').toUpperCase(), ...optsA.map((o) => String(o).toUpperCase()), ...optsB.map((o) => String(o).toUpperCase())]);
        validOutcomes.add('YES');
        validOutcomes.add('NO');
        let finalOutcome = choice;
        if (choice === 'BY_VOTES' || choice === 'VOTE' || choice === 'AUTO' || choice === 'AUTO_BY_VOTES') {
            const votes = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId } });
            if (!votes || votes.length === 0)
                throw new common_1.BadRequestException('No resolution votes found to derive outcome');
            const stakes = {};
            for (const v of votes) {
                const o = String(v.outcome || 'YES').toUpperCase();
                stakes[o] = (stakes[o] || 0) + Number(v.amount || 0);
            }
            const sorted = Object.entries(stakes).sort((a, b) => b[1] - a[1]);
            finalOutcome = sorted.length ? sorted[0][0] : String(pool.outcome || 'YES').toUpperCase();
        }
        if (!validOutcomes.has(String(finalOutcome))) {
            throw new common_1.BadRequestException(`Invalid outcome: ${finalOutcome}. Valid outcomes: ${Array.from(validOutcomes).filter(Boolean).join(', ')}`);
        }
        if (pool.adminFinalized)
            return { success: true, matchId: id };
        const alreadyAdminResolved = await this.connection.eventLog.findFirst({ where: { refMatchId: id, type: 'AdminResolved' } });
        if (alreadyAdminResolved)
            return { success: true, matchId: id };
        const payoutAlready = await this.connection.eventLog.findFirst({ where: { refMatchId: id, type: 'PayoutProcessed' } });
        await this.connection.$transaction(async (tx) => {
            if (pool.challengerId && Number(pool.challengeBond) > 0) {
                const bond = Number(pool.challengeBond);
                const challengerId = pool.challengerId;
                const isChallengerWinner = String(betArec.choice || '').toUpperCase() === String(finalOutcome) ? (betArec.creatorId === challengerId) : (betBrec && String(betBrec.choice || '').toUpperCase() === String(finalOutcome) ? (betBrec.creatorId === challengerId) : false);
                if (isChallengerWinner) {
                    await tx.balance.update({ where: { userId: challengerId }, data: { locked: { decrement: bond }, available: { increment: bond } } });
                }
                else {
                    await tx.balance.update({ where: { userId: challengerId }, data: { locked: { decrement: bond } } });
                }
            }
            await tx.match.update({ where: { id }, data: { status: client_1.MatchStatus.RESOLVED } });
            await tx.pool.update({ where: { matchId: id }, data: { outcome: finalOutcome, status: client_1.PoolStatus.SETTLED, isLocked: true, settledAt: new Date(), adminFinalized: true } });
            await tx.eventLog.create({ data: { type: 'MarketResolved', refMatchId: id, payload: { outcome: finalOutcome } } });
            await tx.eventLog.create({ data: { type: 'AdminResolved', refMatchId: id, refPoolId: pool.matchId, payload: { adminUserId, outcome: finalOutcome, resolvedAt: new Date() } } });
        });
        if (!payoutAlready) {
            await this.finalizePayoutInternal(id, true);
            await this.connection.eventLog.create({ data: { type: 'PayoutProcessed', refMatchId: id, refPoolId: pool.matchId, payload: { processedAt: new Date(), byAdmin: adminUserId } } });
            await this.connection.eventLog.create({ data: { type: 'Payout', refMatchId: id, refPoolId: pool.matchId, payload: { status: 'SUCCESS', processedAt: new Date() } } });
        }
        await this.connection.pool.update({ where: { matchId: id }, data: { status: client_1.PoolStatus.SETTLED, isLocked: true, settledAt: new Date(), adminFinalized: true } });
        await this.connection.eventLog.create({ data: { type: 'MarketLocked', refMatchId: id, refPoolId: pool.matchId, payload: { lockedAt: new Date(), byAdmin: adminUserId } } });
        return { success: true, matchId: id };
    }
    async finalizePayoutInternal(id, force = false) {
        const match = await this.connection.match.findUnique({ where: { id } });
        if (!match)
            return;
        const pool = await this.connection.pool.findUnique({ where: { matchId: id } });
        if (!pool)
            return;
        if (match.status === client_1.MatchStatus.PAID || pool.status === client_1.PoolStatus.PAID_OUT)
            return;
        if (pool.status !== client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE && pool.status !== client_1.PoolStatus.UNDER_REVIEW) {
            if (!(force && String(pool.status) === 'RESOLVED'))
                return;
        }
        if (!force && pool.status === client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE) {
            if (!pool.challengeDeadline || Date.now() < new Date(pool.challengeDeadline).getTime())
                return;
        }
        const outcome = String(pool.outcome || 'YES').toUpperCase();
        const winningSide = outcome === 'YES' ? 'YES' : 'NO';
        const positions = await this.connection.position.findMany({
            where: { poolId: pool.matchId }
        });
        if (!positions || positions.length === 0) {
            const betA = await this.connection.bet.findUnique({ where: { id: match.betAId } });
            if (!betA) {
                await this.connection.pool.update({ where: { matchId: id }, data: { status: client_1.PoolStatus.SETTLED, isLocked: true, settledAt: new Date() } });
                return;
            }
        }
        const total = Number(pool.totalPoolAmount);
        const pCount = pool.participantsCount || positions.length;
        let rate = 100 + (pCount * 10);
        if (rate > 1000)
            rate = 1000;
        const commission = (total * rate) / 10000;
        const payoutPool = total - commission;
        const winners = positions.filter((p) => p.side === winningSide);
        const losers = positions.filter((p) => p.side !== winningSide);
        const totalWinningStake = winners.reduce((sum, p) => sum + Number(p.amount), 0);
        const betA = await this.connection.bet.findUnique({ where: { id: match.betAId } });
        const marketCreatorId = betA ? betA.creatorId : pool.userAId;
        let creatorShare = 0.10;
        if (pCount >= 50 && total >= 10000) {
            creatorShare = 0.30;
        }
        else if (pCount >= 10 || total >= 1000) {
            creatorShare = 0.20;
        }
        const aiScore = betA ? (betA.aiScore ?? 100) : 100;
        let qualityMultiplier = 1.0;
        if (aiScore >= 80)
            qualityMultiplier += 0.2;
        if (pool.disputed)
            qualityMultiplier -= 0.3;
        qualityMultiplier = Math.max(0.5, Math.min(1.5, qualityMultiplier));
        const rawCreatorCommission = Number(commission) * creatorShare;
        const finalCreatorCommission = rawCreatorCommission * qualityMultiplier;
        await this.connection.$transaction(async (tx) => {
            if (finalCreatorCommission > 0 && marketCreatorId) {
                await tx.balance.update({
                    where: { userId: marketCreatorId },
                    data: { available: { increment: finalCreatorCommission } }
                });
                await tx.creatorEarnings.create({
                    data: {
                        marketId: betA ? betA.id : 0,
                        creatorId: marketCreatorId,
                        platformFee: commission,
                        commissionEarned: finalCreatorCommission,
                        status: 'PAID',
                    }
                });
                const txAny = tx;
                const creatorProfile = await txAny.gamificationProfile.findUnique({ where: { userId: marketCreatorId } });
                if (creatorProfile) {
                    await txAny.gamificationProfile.update({
                        where: { userId: marketCreatorId },
                        data: { totalEarnings: { increment: finalCreatorCommission } }
                    });
                }
                else {
                    await txAny.gamificationProfile.create({
                        data: {
                            userId: marketCreatorId,
                            totalEarnings: finalCreatorCommission,
                        }
                    });
                }
            }
            for (const winner of winners) {
                const share = totalWinningStake > 0 ? (Number(winner.amount) / totalWinningStake) * payoutPool : 0;
                const bal = await tx.balance.findUnique({ where: { userId: winner.userId } });
                if (bal) {
                    await tx.balance.update({
                        where: { userId: winner.userId },
                        data: {
                            available: { increment: share },
                            locked: { decrement: Number(winner.amount) }
                        }
                    });
                }
                const txAny = tx;
                const profile = await txAny.gamificationProfile.findUnique({ where: { userId: winner.userId } });
                const profit = share - Number(winner.amount);
                if (profile) {
                    await txAny.gamificationProfile.update({
                        where: { userId: winner.userId },
                        data: {
                            wins: { increment: 1 },
                            totalEarnings: { increment: profit },
                            reputationScore: { increment: 10 }
                        }
                    });
                }
                else {
                    await txAny.gamificationProfile.create({
                        data: {
                            userId: winner.userId,
                            wins: 1,
                            losses: 0,
                            totalEarnings: profit,
                            reputationScore: 10
                        }
                    });
                }
            }
            for (const loser of losers) {
                const bal = await tx.balance.findUnique({ where: { userId: loser.userId } });
                if (bal) {
                    await tx.balance.update({
                        where: { userId: loser.userId },
                        data: {
                            locked: { decrement: Number(loser.amount) }
                        }
                    });
                }
                const txAny = tx;
                const profile = await txAny.gamificationProfile.findUnique({ where: { userId: loser.userId } });
                if (profile) {
                    await txAny.gamificationProfile.update({
                        where: { userId: loser.userId },
                        data: {
                            losses: { increment: 1 },
                            totalEarnings: { decrement: Number(loser.amount) },
                            reputationScore: { decrement: 5 }
                        }
                    });
                }
                else {
                    await txAny.gamificationProfile.create({
                        data: {
                            userId: loser.userId,
                            wins: 0,
                            losses: 1,
                            totalEarnings: -Number(loser.amount),
                            reputationScore: 0
                        }
                    });
                }
            }
            await tx.match.update({ where: { id }, data: { status: client_1.MatchStatus.PAID } });
            await tx.pool.update({ where: { matchId: id }, data: { status: client_1.PoolStatus.PAID_OUT } });
            const bond = Number(pool.challengeBond || 0);
            const challengerId = pool.challengerId;
            if (challengerId && bond > 0) {
                const isChallengerWinner = winners.some((w) => w.userId === challengerId);
                if (isChallengerWinner) {
                    await tx.balance.update({
                        where: { userId: challengerId },
                        data: {
                            available: { increment: bond },
                            locked: { decrement: bond }
                        }
                    });
                }
                else {
                    await tx.balance.update({
                        where: { userId: challengerId },
                        data: { locked: { decrement: bond } }
                    });
                }
            }
        });
    }
    async finalizeOracleRewards(matchId) {
        const pool = await this.connection.pool.findUnique({ where: { matchId: matchId } });
        if (!pool)
            return;
        const outcome = String(pool.outcome || 'YES').toUpperCase();
        const votesYes = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId, outcome: 'YES' } });
        const votesNo = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId, outcome: 'NO' } });
        const winners = outcome === 'YES' ? votesYes : votesNo;
        const losers = outcome === 'YES' ? votesNo : votesYes;
        const totalWinners = winners.reduce((acc, v) => acc + Number(v.amount), 0);
        const totalLosersStake = losers.reduce((acc, v) => acc + Number(v.amount), 0);
        const slashRateBase = clamp(Number(pool.slashingRatePercent || 50), 30, 100);
        const incentiveRate = clamp(Number(pool.resolutionIncentivePercent || 0), 0, 50);
        const effectiveRate = clamp(slashRateBase + incentiveRate, 0, 100);
        const totalSlashed = (totalLosersStake * effectiveRate) / 100;
        const envIncentive = Number(process.env.ORACLE_INCENTIVE_POOL_USD || 0);
        const totalRewardPool = totalSlashed + Math.max(0, envIncentive);
        await this.connection.$transaction(async (tx) => {
            for (const w of winners) {
                const reward = totalWinners > 0 ? (Number(w.amount) / totalWinners) * totalRewardPool : 0;
                await tx.balance.update({
                    where: { userId: w.userId },
                    data: {
                        locked: { decrement: Number(w.amount) },
                        available: { increment: Number(w.amount) + reward },
                    },
                });
                const txAny = tx;
                const profile = await txAny.gamificationProfile.findUnique({ where: { userId: w.userId } });
                const base = 2;
                const stakeWeight = Math.min(1.2, 0.1 * Math.sqrt(Number(w.amount)));
                const delta = Math.min(5, Math.max(-5, base * 1 * stakeWeight));
                const wins = (profile?.wins || 0) + 1;
                const losses = profile?.losses || 0;
                const totalResolutions = wins + losses;
                const accuracy = totalResolutions > 0 ? (wins / totalResolutions) * 100 : 0.0;
                if (profile) {
                    await txAny.gamificationProfile.update({
                        where: { userId: w.userId },
                        data: {
                            wins,
                            accuracy,
                            totalVolume: { increment: Number(w.amount) },
                            reputationScore: { increment: Math.round(delta) },
                            totalEarnings: { increment: reward }
                        },
                    });
                }
                else {
                    await txAny.gamificationProfile.create({
                        data: {
                            userId: w.userId,
                            wins,
                            losses,
                            accuracy,
                            totalEarnings: 0,
                            totalVolume: Number(w.amount),
                            reputationScore: Math.round(50 + delta),
                        },
                    });
                }
                await tx.eventLog.create({ data: { type: 'ReputationUpdated', refPoolId: matchId, payload: { userId: w.userId, delta: Math.round(delta), outcome: 'WIN' } } });
                await tx.eventLog.create({ data: { type: 'OracleRewardPaid', refPoolId: matchId, payload: { userId: w.userId, amount: reward } } });
            }
            for (const l of losers) {
                const penalty = (Number(l.amount) * effectiveRate) / 100;
                const refund = Number(l.amount) - penalty;
                await tx.balance.update({
                    where: { userId: l.userId },
                    data: {
                        locked: { decrement: Number(l.amount) },
                        available: refund > 0 ? { increment: refund } : undefined,
                    },
                });
                const txAny = tx;
                const profile = await txAny.gamificationProfile.findUnique({ where: { userId: l.userId } });
                const base = -2;
                const stakeWeight = Math.min(1.2, 0.1 * Math.sqrt(Number(l.amount)));
                const delta = Math.min(5, Math.max(-5, base * 1 * stakeWeight));
                const wins = profile?.wins || 0;
                const losses = (profile?.losses || 0) + 1;
                const totalResolutions = wins + losses;
                const accuracy = totalResolutions > 0 ? (wins / totalResolutions) * 100 : 0.0;
                if (profile) {
                    await txAny.gamificationProfile.update({
                        where: { userId: l.userId },
                        data: {
                            losses,
                            accuracy,
                            totalVolume: { increment: Number(l.amount) },
                            reputationScore: { increment: Math.round(delta) },
                        },
                    });
                }
                else {
                    await txAny.gamificationProfile.create({
                        data: {
                            userId: l.userId,
                            wins,
                            losses,
                            accuracy,
                            totalEarnings: 0,
                            totalVolume: Number(l.amount),
                            reputationScore: Math.round(50 + delta),
                        },
                    });
                }
                await tx.eventLog.create({ data: { type: 'ReputationUpdated', refPoolId: matchId, payload: { userId: l.userId, delta: Math.round(delta), outcome: 'LOSE' } } });
            }
        });
    }
    async forceCloseListingPool(adminUserId, listingId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.status !== client_1.PoolStatus.LIVE)
            throw new common_1.BadRequestException('Market not open');
        await this.connection.$transaction(async (tx) => {
            await tx.pool.update({
                where: { matchId: pool.matchId },
                data: { status: client_1.PoolStatus.CLOSED, closeTime: new Date() },
            });
            await tx.eventLog.create({
                data: {
                    type: 'MarketForceClosed',
                    refPoolId: pool.matchId,
                    payload: { adminUserId, listingId, timestamp: new Date() },
                },
            });
        });
        return { success: true };
    }
    async finalizeMatch(adminUserId, id) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findUnique({ where: { matchId: id } });
        if (!pool)
            throw new common_1.BadRequestException('No matched pool');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        if (pool.status !== client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE && pool.status !== client_1.PoolStatus.UNDER_REVIEW)
            throw new common_1.BadRequestException('Not eligible for finalize');
        await this.finalizePayoutInternal(id, true);
        return { success: true };
    }
    async adminOverrideOutcome(adminUserId, id, outcome) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findUnique({ where: { matchId: id } });
        if (!pool)
            throw new common_1.BadRequestException('No matched pool');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        if (pool.status !== client_1.PoolStatus.UNDER_REVIEW && pool.status !== client_1.PoolStatus.DISPUTED)
            throw new common_1.BadRequestException('Admin can only resolve challenged markets (UNDER_REVIEW or DISPUTED).');
        const normalized = String(outcome || 'YES').toUpperCase();
        await this.connection.$transaction(async (tx) => {
            await tx.pool.update({
                where: { matchId: id },
                data: {
                    outcome: normalized,
                    status: client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE,
                    challengeDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
                    challengeCount: 0,
                },
            });
            await tx.eventLog.create({ data: { type: 'AdminOverrideOutcome', refMatchId: id, refPoolId: pool.matchId, payload: { outcome: normalized } } });
        });
        return { success: true };
    }
    async getCreatorEarnings(creatorId) {
        const where = creatorId ? { creatorId } : {};
        const earnings = await this.connection.creatorEarnings.findMany({
            where,
            include: { bet: { select: { title: true, status: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, earnings };
    }
    async autoFinalizeExpired() {
        const now = new Date();
        const pools = await this.connection.pool.findMany({
            where: {
                status: client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE,
                challengeDeadline: { lt: now },
            },
            take: 10,
            orderBy: { challengeDeadline: 'asc' },
        });
        for (const p of pools) {
            await this.finalizePayoutInternal(p.matchId);
        }
    }
    async autoOracleCycle() {
        const now = new Date();
        const toClose = await this.connection.pool.findMany({
            where: { status: 'LIVE', closeTime: { lte: now } },
            take: 10,
            orderBy: { closeTime: 'asc' },
        });
        for (const p of toClose) {
            await this.connection.pool.update({ where: { matchId: p.matchId }, data: { status: 'CLOSED' } });
            await this.connection.eventLog.create({ data: { type: 'MarketAutoClosed', refPoolId: p.matchId, payload: { timestamp: new Date(), reason: 'TimeExpired' } } });
        }
        const toDefault = await this.connection.pool.findMany({
            where: { status: 'CLOSED' },
            take: 10,
            orderBy: { updatedAt: 'asc' },
        });
        for (const p of toDefault) {
            const hours = 24;
            const prov = await this.connection.eventLog.findFirst({ where: { refMatchId: p.matchId, type: 'ProvisionalSet' }, orderBy: { createdAt: 'desc' } });
            let proposedYes = null;
            if (prov && prov.payload) {
                const payload = prov.payload;
                if (typeof payload.outcomeYes === 'boolean')
                    proposedYes = !!payload.outcomeYes;
                else if (typeof payload.outcome === 'string')
                    proposedYes = String(payload.outcome).toUpperCase() === 'YES';
            }
            if (proposedYes === null)
                proposedYes = Number(p.totalYesAmount || 0) >= Number(p.totalNoAmount || 0);
            await this.connection.pool.update({
                where: { matchId: p.matchId },
                data: { status: 'RESOLUTION_OPEN', resolutionDeadline: new Date(Date.now() + hours * 60 * 60 * 1000), outcome: proposedYes ? 'YES' : 'NO' },
            });
            await this.connection.eventLog.create({ data: { type: 'OracleVotingOpened', refPoolId: p.matchId, payload: { windowHours: hours } } });
            await this.connection.eventLog.create({ data: { type: 'DefaultOutcomeSet', refPoolId: p.matchId, payload: { outcome: proposedYes ? 'YES' : 'NO', source: prov ? 'onchain' : 'stakes' } } });
        }
        const toFinalizeDefault = await this.connection.pool.findMany({
            where: { status: 'PROVISIONAL', disputeDeadline: { lt: now }, disputed: false },
            take: 10,
            orderBy: { disputeDeadline: 'asc' },
        });
        for (const p of toFinalizeDefault) {
            await this.connection.pool.update({ where: { matchId: p.matchId }, data: { status: 'RESOLVED' } });
            await this.connection.eventLog.create({ data: { type: 'DefaultOutcomeFinalized', refPoolId: p.matchId, payload: { outcome: 'YES' } } });
            await this.finalizeOracleRewards(p.matchId).catch(() => { });
            await this.finalizePayoutInternal(p.matchId, true).catch(() => { });
        }
        const toCalc = await this.connection.pool.findMany({
            where: { status: 'RESOLUTION_OPEN', resolutionDeadline: { lt: now } },
            take: 10,
            orderBy: { resolutionDeadline: 'asc' },
        });
        for (const p of toCalc) {
            await this.connection.pool.update({ where: { matchId: p.matchId }, data: { status: 'RESOLUTION_CALCULATION' } });
            await this.finalizeResolutionVoting(p.userAId, p.matchId).catch(() => { });
        }
        const toEscalate = await this.connection.pool.findMany({
            where: { status: { in: ['PROVISIONAL', 'DISPUTED', 'RESOLUTION_OPEN'] }, closeTime: { not: null } },
            take: 10,
            orderBy: { updatedAt: 'asc' },
        });
        for (const p of toEscalate) {
            const closeMs = p.closeTime ? new Date(p.closeTime).getTime() : 0;
            if (closeMs > 0 && Date.now() - closeMs > 48 * 60 * 60 * 1000) {
                await this.connection.pool.update({ where: { matchId: p.matchId }, data: { status: client_1.PoolStatus.UNDER_REVIEW } });
                await this.connection.eventLog.create({ data: { type: 'HardDeadlineEscalated', refPoolId: p.matchId, payload: { sinceMs: Date.now() - closeMs } } });
            }
        }
    }
    async retryPendingActivations() {
        const env = process.env;
        const pending = await this.connection.match.findMany({
            where: { status: client_1.MatchStatus.PENDING },
            take: 5,
            orderBy: { createdAt: 'asc' },
            include: {
                betA: { include: { creator: true } },
                betB: { include: { creator: true } },
            },
        });
        if (!pending.length)
            return;
        const ethersAny = require('ethers');
        const rpc = env.MARKET_RPC_URL || env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545';
        const chainId = Number(env.MARKET_CHAIN_ID || 31337);
        const provider = ethersAny.providers?.JsonRpcProvider
            ? new ethersAny.providers.JsonRpcProvider(rpc, chainId)
            : new ethersAny.JsonRpcProvider(rpc, { chainId, name: chainId === 31337 ? 'hardhat' : 'custom' });
        const wallet = new ethersAny.Wallet(env.MARKET_PK, provider);
        const abi = [
            'function createPair(uint256 betAId, uint256 betBId, string category, string currency, uint256 stakeA, uint256 stakeB, address marketCreator, address creatorA, address creatorB, bool choiceA) external payable returns (uint256)',
        ];
        const contract = new ethersAny.Contract(env.MARKET_ADDRESS, abi, wallet);
        for (const m of pending) {
            const betA = m.betA;
            const betB = m.betB;
            if (!betA || !betB)
                continue;
            try {
                const stakeWei = (ethersAny.utils?.parseEther || ethersAny.parseEther)(String(betA.stakeAmount));
                const creatorAddr = betA.creator?.wallet_address || env.MARKET_ADDRESS;
                const creatorA = betA.creator?.wallet_address || env.MARKET_ADDRESS;
                const creatorB = betB.creator?.wallet_address || env.MARKET_ADDRESS;
                const choiceA = String(betA.choice || 'YES').toUpperCase() === 'YES';
                let valueToSend;
                if (stakeWei.mul) {
                    valueToSend = stakeWei.mul(2);
                }
                else {
                    valueToSend = BigInt(stakeWei) * 2n;
                }
                const tx = await contract.createPair(betA.id, betB.id, betA.category, betA.currency, stakeWei, stakeWei, creatorAddr, creatorA, creatorB, choiceA, { value: valueToSend });
                const receipt = await tx.wait(1);
                const marketId = receipt?.transactionHash || tx?.hash || String(m.id);
                const participants = [
                    { userId: betA.creatorId, choice: betA.choice, stakeAmount: betA.stakeAmount, currency: betA.currency },
                    { userId: betB.creatorId, choice: betB.choice, stakeAmount: betB.stakeAmount, currency: betB.currency },
                ];
                await this.connection.match.update({
                    where: { id: m.id },
                    data: {
                        status: client_1.MatchStatus.MARKET_CREATED,
                        marketId,
                        contractAddress: env.MARKET_ADDRESS,
                        marketStartTime: new Date(),
                        participants: participants,
                    },
                });
                await this.connection.bet.update({ where: { id: betA.id }, data: { status: client_1.BetStatus.ACTIVE } });
                await this.connection.bet.update({ where: { id: betB.id }, data: { status: client_1.BetStatus.ACTIVE } });
            }
            catch (e) {
                console.error('activation retry failed', e?.message || e);
            }
        }
    }
    async activateListingPools() {
        const env = process.env;
        const fakeMoney = String(process.env.TEST_FAKE_MONEY || 'true').toLowerCase() === 'true';
        if (fakeMoney) {
            const pools = await this.connection.pool.findMany({
                where: { status: client_1.PoolStatus.LIVE, marketId: null },
                take: 5,
                include: { listing: true },
            });
            for (const p of pools) {
                try {
                    const fakeMarketId = `fake-${p.matchId}`;
                    await this.connection.pool.update({
                        where: { matchId: p.matchId },
                        data: { marketId: fakeMarketId }
                    });
                    console.log(`FAKE MONEY MODE: Activated pool ${p.matchId} with fake market ID ${fakeMarketId}`);
                }
                catch (e) {
                    console.error('Failed to activate pool in FAKE MONEY mode', p.matchId, e?.message || e);
                }
            }
            return;
        }
        const pools = await this.connection.pool.findMany({
            where: { status: client_1.PoolStatus.LIVE, marketId: null },
            take: 5,
            include: { listing: true },
        });
        if (!pools.length)
            return;
        const ethersAny = require('ethers');
        const rpc = env.MARKET_RPC_URL || env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545';
        const chainId = Number(env.MARKET_CHAIN_ID || 31337);
        const provider = ethersAny.providers?.JsonRpcProvider
            ? new ethersAny.providers.JsonRpcProvider(rpc, chainId)
            : new ethersAny.JsonRpcProvider(rpc, { chainId, name: chainId === 31337 ? 'hardhat' : 'custom' });
        const wallet = new ethersAny.Wallet(env.MARKET_PK, provider);
        const abi = [
            'function createPair(uint256 betAId, uint256 betBId, string category, string currency, uint256 stake, uint256 expiration, bool isYesSide) external payable returns (uint256)',
            'function matchMarket(uint256 marketId) external payable',
            'event MarketCreated(uint256 indexed marketId, address creator, string category, string currency, uint256 stakeA, uint256 stakeB)'
        ];
        const contract = new ethersAny.Contract(env.MARKET_ADDRESS, abi, wallet);
        for (const p of pools) {
            try {
                const stake = 1;
                const expiration = Math.floor(new Date(p.closeTime || Date.now() + 86400000).getTime() / 1000);
                const txCreate = await contract.createPair(p.listingId || 1, p.listingId || 1, "General", "USD", stake, expiration, true, { value: stake });
                const receiptCreate = await txCreate.wait(1);
                let marketId = null;
                for (const log of receiptCreate.logs) {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        if (parsed.name === 'MarketCreated') {
                            marketId = parsed.args.marketId;
                            break;
                        }
                    }
                    catch { }
                }
                if (!marketId) {
                    console.error('MarketCreated event not found for pool', p.matchId);
                    continue;
                }
                const txMatch = await contract.matchMarket(marketId, { value: stake });
                await txMatch.wait(1);
                await this.connection.pool.update({
                    where: { matchId: p.matchId },
                    data: { marketId: String(marketId) }
                });
            }
            catch (e) {
                console.error('Failed to activate pool', p.matchId, e?.message || e);
            }
        }
    }
    async tryMatch(betId) {
        try {
            const bet = await this.connection.bet.findUnique({ where: { id: betId }, include: { creator: true } });
            if (!bet || bet.status !== client_1.BetStatus.PENDING || !bet.choice)
                return;
            const oppositeChoice = bet.choice.toUpperCase() === 'YES' ? 'NO' : 'YES';
            let candidate = await this.connection.bet.findFirst({
                where: {
                    status: client_1.BetStatus.PENDING,
                    category: bet.category,
                    currency: bet.currency,
                    choice: oppositeChoice,
                    creatorId: { not: bet.creatorId },
                },
                orderBy: { createdAt: 'asc' },
                include: { creator: true },
            });
            if (!candidate) {
                candidate = await this.connection.bet.findFirst({
                    where: {
                        status: client_1.BetStatus.PENDING,
                        category: bet.category,
                        currency: bet.currency,
                        choice: oppositeChoice,
                    },
                    orderBy: { createdAt: 'asc' },
                    include: { creator: true },
                });
            }
            if (!candidate)
                return;
            await this.connection.$transaction(async (tx) => {
                await tx.bet.update({ where: { id: bet.id }, data: { status: client_1.BetStatus.MATCHED } });
                await tx.bet.update({ where: { id: candidate.id }, data: { status: client_1.BetStatus.MATCHED } });
                const match = await tx.match.create({
                    data: {
                        betAId: bet.id,
                        betBId: candidate.id,
                        status: client_1.MatchStatus.PENDING,
                    },
                });
                const totalPool = Number(bet.stakeAmount) + Number(candidate.stakeAmount);
                await tx.pool.create({
                    data: {
                        matchId: match.id,
                        userAId: bet.creatorId,
                        userBId: candidate.creatorId,
                        stakeA: bet.stakeAmount,
                        stakeB: candidate.stakeAmount,
                        totalPoolAmount: totalPool,
                        participantsCount: 2,
                        closeTime: new Date(Math.max(new Date(bet.endDate).getTime(), new Date(candidate.endDate).getTime())),
                        status: client_1.PoolStatus.LIVE,
                    },
                });
                const balB = await tx.balance.findUnique({ where: { userId: candidate.creatorId } });
                if (balB) {
                    await tx.balance.update({
                        where: { userId: candidate.creatorId },
                        data: {
                            available: (Number(balB.available) - Number(candidate.stakeAmount)),
                            locked: (Number(balB.locked || 0) + Number(candidate.stakeAmount)),
                        },
                    });
                }
                else {
                    await tx.balance.create({
                        data: { userId: candidate.creatorId, available: (0 - Number(candidate.stakeAmount)), locked: Number(candidate.stakeAmount) },
                    });
                }
                await tx.eventLog.create({ data: { type: 'PoolCreated', refMatchId: match.id, payload: { betAId: bet.id, betBId: candidate.id, totalPool: totalPool } } });
                const env = process.env;
                const fakeMoney = String(process.env.TEST_FAKE_MONEY || 'true').toLowerCase() === 'true';
                if (fakeMoney) {
                    const fakeMarketId = `fake-match-${match.id}`;
                    await tx.match.update({ where: { id: match.id }, data: { status: client_1.MatchStatus.MARKET_CREATED, marketId: fakeMarketId } });
                    await tx.pool.update({ where: { matchId: match.id }, data: { marketId: fakeMarketId } });
                    console.log(`FAKE MONEY MODE: Created fake market ID ${fakeMarketId} for match ${match.id}`);
                    return;
                }
                if (env.MARKET_RPC_URL && env.MARKET_ADDRESS && env.MARKET_PK) {
                    try {
                        const ethersAny = require('ethers');
                        const rpc = env.MARKET_RPC_URL || env.SEPOLIA_RPC_URL || 'http://127.0.0.1:8545';
                        const chainId = Number(env.MARKET_CHAIN_ID || 31337);
                        const provider = ethersAny.providers?.JsonRpcProvider
                            ? new ethersAny.providers.JsonRpcProvider(rpc, chainId)
                            : new ethersAny.JsonRpcProvider(rpc, { chainId, name: chainId === 31337 ? 'hardhat' : 'custom' });
                        const wallet = new ethersAny.Wallet(env.MARKET_PK, provider);
                        const abi = [
                            'function createPair(uint256 betAId, uint256 betBId, string category, string currency, uint256 stake, address marketCreator, address creatorA, address creatorB, bool choiceA) external payable returns (uint256)',
                        ];
                        const contract = new ethersAny.Contract(env.MARKET_ADDRESS, abi, wallet);
                        const stakeWei = (ethersAny.utils?.parseEther || ethersAny.parseEther)(String(bet.stakeAmount));
                        const creatorAddr = bet.creator?.wallet_address || env.MARKET_ADDRESS;
                        const creatorA = bet.creator?.wallet_address || env.MARKET_ADDRESS;
                        const creatorB = candidate.creator?.wallet_address || env.MARKET_ADDRESS;
                        const choiceA = String(bet.choice || 'YES').toUpperCase() === 'YES';
                        let valueToSend;
                        if (stakeWei.mul) {
                            valueToSend = stakeWei.mul(2);
                        }
                        else {
                            valueToSend = BigInt(stakeWei) * 2n;
                        }
                        const tx = await contract.createPair(bet.id, candidate.id, bet.category, bet.currency, stakeWei, creatorAddr, creatorA, creatorB, choiceA, { value: valueToSend });
                        const receipt = await tx.wait(1);
                        const marketId = receipt?.transactionHash || tx?.hash || String(match.id);
                        await tx.match.update({ where: { id: match.id }, data: { status: client_1.MatchStatus.MARKET_CREATED, marketId } });
                        await tx.pool.update({ where: { matchId: match.id }, data: { marketId } });
                        const participants = [
                            { userId: bet.creatorId, choice: bet.choice, stakeAmount: bet.stakeAmount, currency: bet.currency },
                            { userId: candidate.creatorId, choice: candidate.choice, stakeAmount: candidate.stakeAmount, currency: candidate.currency },
                        ];
                        await tx.match.update({
                            where: { id: match.id },
                            data: {
                                contractAddress: env.MARKET_ADDRESS,
                                marketStartTime: new Date(),
                                participants: participants,
                            },
                        });
                        await tx.bet.update({ where: { id: bet.id }, data: { status: client_1.BetStatus.ACTIVE } });
                        await tx.bet.update({ where: { id: candidate.id }, data: { status: client_1.BetStatus.ACTIVE } });
                    }
                    catch (chainErr) {
                        console.error('createMarket failed; keeping match pending', chainErr?.message || chainErr);
                    }
                }
                const createdPool = await this.connection.pool.findUnique({ where: { matchId: match.id } });
                if (createdPool) {
                    const hs = this.computeHealthScore(createdPool, match);
                }
            });
        }
        catch (err) {
            console.error('tryMatch error', err?.message || err);
        }
    }
    async placeBetOnListing(userId, payload) {
        const listingId = Number(payload?.listingId);
        const side = String(payload?.side || 'YES').toUpperCase();
        const amount = Number(payload?.amount);
        if (!listingId || !amount || amount <= 0 || (side !== 'YES' && side !== 'NO')) {
            throw new common_1.BadRequestException('Invalid request');
        }
        const user = await this.connection.auth.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const listing = await this.connection.listing.findUnique({ where: { id: listingId } });
        if (!listing)
            throw new common_1.BadRequestException('Market not found');
        let pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool) {
            pool = await this.connection.pool.create({
                data: {
                    matchId: await (async () => {
                        const bet = await this.connection.bet.create({
                            data: {
                                creatorId: userId,
                                title: listing?.title || `Listing-${listingId}`,
                                description: listing?.description || '',
                                category: listing?.category || 'General',
                                options: [],
                                choice: null,
                                stakeAmount: 0,
                                currency: 'USD',
                                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                            },
                        });
                        const m = await this.connection.match.create({ data: { betAId: bet.id, status: client_1.MatchStatus.PENDING } });
                        return m.id;
                    })(),
                    listingId,
                    userAId: userId,
                    userBId: userId,
                    stakeA: 0,
                    stakeB: 0,
                    totalYesAmount: 0,
                    totalNoAmount: 0,
                    totalPoolAmount: 0,
                    status: client_1.PoolStatus.PENDING,
                    outcome: 'YES',
                },
            });
        }
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        if (pool.status === client_1.PoolStatus.CLOSED || pool.status === client_1.PoolStatus.RESOLVED || pool.status === client_1.PoolStatus.PAID_OUT || pool.status === client_1.PoolStatus.FINALIZED) {
            throw new common_1.BadRequestException('Market not open for betting');
        }
        const balance = await this.connection.balance.findUnique({ where: { userId } });
        if (!balance) {
            await this.connection.balance.create({ data: { userId, available: 0, locked: 0 } });
        }
        await this.connection.$transaction(async (tx) => {
            await tx.balance.update({
                where: { userId },
                data: {
                    available: { decrement: amount },
                    locked: { increment: amount }
                }
            });
            await tx.position.create({
                data: {
                    poolId: pool.matchId,
                    userId,
                    side: side === 'YES' ? client_1.Side.YES : client_1.Side.NO,
                    amount: amount,
                    walletAddress: user.wallet_address || '',
                },
            });
            const yes = Number(pool.totalYesAmount) + (side === 'YES' ? amount : 0);
            const no = Number(pool.totalNoAmount) + (side === 'NO' ? amount : 0);
            const total = yes + no;
            await tx.pool.update({
                where: { matchId: pool.matchId },
                data: {
                    totalYesAmount: yes,
                    totalNoAmount: no,
                    totalPoolAmount: total,
                    participantsCount: await tx.position.count({ where: { poolId: pool.matchId } }),
                    status: (pool.status === client_1.PoolStatus.PENDING && yes > 0 && no > 0 ? client_1.PoolStatus.LIVE : pool.status)
                },
            });
            await tx.eventLog.create({
                data: {
                    type: 'BetPlaced',
                    refPoolId: pool.matchId,
                    payload: { userId, listingId, side, amount },
                },
            });
        });
        const currentPool = await this.connection.pool.findUnique({ where: { matchId: pool.matchId } });
        if (currentPool && currentPool.status === client_1.PoolStatus.PENDING) {
            await this.attemptPoolActivation(currentPool.matchId);
        }
        const updated = await this.connection.pool.findUnique({ where: { matchId: pool.matchId } });
        const total = Number(updated?.totalPoolAmount || 0);
        const yesProb = total > 0 ? Number(updated?.totalYesAmount || 0) / total : 0;
        const noProb = total > 0 ? Number(updated?.totalNoAmount || 0) / total : 0;
        const hs = this.computeHealthScore(updated, { marketStartTime: updated?.createdAt, status: client_1.MatchStatus.PENDING });
        return {
            success: true,
            pool: updated,
            probabilities: { yes: yesProb, no: noProb },
            health: { score: hs.score, label: hs.label },
        };
    }
    async getUserBalance(userId) {
        const bal = await this.connection.balance.findUnique({ where: { userId } });
        if (!bal) {
            const initial = Number(process.env.TEST_FAKE_INITIAL_BALANCE || 1000);
            await this.connection.balance.create({ data: { userId, available: initial, locked: 0 } });
            return { success: true, balance: { available: initial, locked: 0 } };
        }
        return { success: true, balance: { available: Number(bal.available || 0), locked: Number(bal.locked || 0) } };
    }
    async faucet(userId, amount) {
        const amt = Math.max(1, Number(amount || 100));
        const bal = await this.connection.balance.findUnique({ where: { userId } });
        if (!bal) {
            await this.connection.balance.create({ data: { userId, available: amt, locked: 0 } });
        }
        else {
            await this.connection.balance.update({ where: { userId }, data: { available: { increment: amt } } });
        }
        const updated = await this.connection.balance.findUnique({ where: { userId } });
        return { success: true, balance: { available: Number(updated?.available || 0), locked: Number(updated?.locked || 0) } };
    }
    async getListingPoolSummary(listingId, userId) {
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            return { success: true, pool: null, probabilities: { yes: 0, no: 0 }, participants: 0, my: { yes: 0, no: 0 } };
        const total = Number(pool.totalPoolAmount || 0);
        const yesProb = total > 0 ? Number(pool.totalYesAmount || 0) / total : 0;
        const noProb = total > 0 ? Number(pool.totalNoAmount || 0) / total : 0;
        const participants = await this.connection.position.count({ where: { poolId: pool.matchId } });
        let my = { yes: 0, no: 0 };
        if (userId) {
            const myYes = await this.connection.position.aggregate({
                where: { poolId: pool.matchId, userId, side: client_1.Side.YES },
                _sum: { amount: true },
            });
            const myNo = await this.connection.position.aggregate({
                where: { poolId: pool.matchId, userId, side: client_1.Side.NO },
                _sum: { amount: true },
            });
            my = { yes: Number(myYes?._sum?.amount || 0), no: Number(myNo?._sum?.amount || 0) };
        }
        return { success: true, pool, probabilities: { yes: yesProb, no: noProb }, participants, my };
    }
    async getListingAdminDetails(adminUserId, listingId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const listing = await this.connection.listing.findUnique({
            where: { id: listingId },
            include: {
                seller: { select: { id: true, username: true, email: true, wallet_address: true } },
                asset: true,
            },
        });
        if (!listing)
            throw new common_1.BadRequestException('Market not found');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool) {
            return {
                success: true,
                listing,
                pool: null,
                probabilities: { yes: 0, no: 0 },
                participants: { count: 0, yes: [], no: [] },
                status: 'NO_POOL',
            };
        }
        const total = Number(pool.totalPoolAmount || 0);
        const yesProb = total > 0 ? Number(pool.totalYesAmount || 0) / total : 0;
        const noProb = total > 0 ? Number(pool.totalNoAmount || 0) / total : 0;
        const positions = await this.connection.position.findMany({
            where: { poolId: pool.matchId },
            include: { user: { select: { id: true, username: true, email: true, wallet_address: true } } },
            orderBy: { createdAt: 'desc' },
        });
        const yes = positions.filter((p) => p.side === client_1.Side.YES).map((p) => ({ user: p.user, amount: Number(p.amount), createdAt: p.createdAt }));
        const no = positions.filter((p) => p.side === client_1.Side.NO).map((p) => ({ user: p.user, amount: Number(p.amount), createdAt: p.createdAt }));
        const hs = this.computeHealthScore(pool, { marketStartTime: pool.createdAt, status: client_1.MatchStatus.PENDING });
        const deploymentStatus = {
            isDeployed: pool.status === client_1.PoolStatus.LIVE || pool.status === client_1.PoolStatus.CLOSED || pool.status === client_1.PoolStatus.RESOLVED,
            blockers: [],
        };
        if (pool.status === client_1.PoolStatus.PENDING) {
            if (Number(pool.totalYesAmount || 0) <= 0)
                deploymentStatus.blockers.push('Missing YES liquidity');
            if (Number(pool.totalNoAmount || 0) <= 0)
                deploymentStatus.blockers.push('Missing NO liquidity');
        }
        return {
            success: true,
            listing,
            pool,
            probabilities: { yes: yesProb, no: noProb },
            participants: { count: positions.length, yes, no },
            status: pool.status,
            deploymentStatus,
            outcome: pool.outcome,
            challengeDeadline: pool.challengeDeadline,
            challengeCount: pool.challengeCount,
            health: { score: hs.score, label: hs.label },
        };
    }
    async getMarketAdminOverview(adminUserId, matchId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const match = await this.connection.match.findUnique({
            where: { id: matchId },
            include: { pool: true, betA: { select: { id: true, choice: true, creatorId: true } }, betB: { select: { id: true, choice: true, creatorId: true } } },
        });
        if (!match || !match.pool)
            throw new common_1.BadRequestException('Market not found');
        const pool = match.pool;
        const votesYes = await this.connection.resolutionVote.findMany({
            where: { poolId: pool.matchId, outcome: 'YES' },
            include: { user: { select: { id: true, username: true } } },
        });
        const votesNo = await this.connection.resolutionVote.findMany({
            where: { poolId: pool.matchId, outcome: 'NO' },
            include: { user: { select: { id: true, username: true } } },
        });
        const totalVoters = votesYes.length + votesNo.length;
        const yesStake = votesYes.reduce((acc, v) => acc + Number(v.amount), 0);
        const noStake = votesNo.reduce((acc, v) => acc + Number(v.amount), 0);
        const minStakeUsed = Math.min(...[...votesYes, ...votesNo].map((v) => Number(v.amount))) || 0;
        const maxStakeUsed = Math.max(...[...votesYes, ...votesNo].map((v) => Number(v.amount))) || 0;
        const totalResolutionStake = yesStake + noStake;
        const slashRateBase = clamp(Number(pool.slashingRatePercent || 50), 30, 100);
        const incentiveRate = clamp(Number(pool.resolutionIncentivePercent || 0), 0, 50);
        const effectiveRate = clamp(slashRateBase + incentiveRate, 0, 100);
        const finalOutcome = String(pool.outcome || 'YES').toUpperCase();
        const totalLosersStake = finalOutcome === 'YES' ? noStake : yesStake;
        const totalSlashed = (totalLosersStake * effectiveRate) / 100;
        const defaultOutcomeEvent = await this.connection.eventLog.findFirst({
            where: { refPoolId: pool.matchId, type: 'DefaultOutcomeSet' },
            orderBy: { createdAt: 'asc' },
        });
        const defaultOutcome = defaultOutcomeEvent ? String(defaultOutcomeEvent.payload?.outcome || 'YES') : 'YES';
        const resolvedEvent = await this.connection.eventLog.findFirst({
            where: { refMatchId: matchId, type: 'MarketResolved' },
            orderBy: { createdAt: 'desc' },
        });
        const reputationProfiles = await this.connection.gamificationProfile.findMany({
            where: { userId: { in: [...votesYes, ...votesNo].map((v) => v.userId) } },
        });
        const repMap = new Map();
        for (const rp of reputationProfiles)
            repMap.set(Number(rp.userId), rp);
        const votersList = [...votesYes, ...votesNo].map((v) => ({
            userId: v.user?.id,
            name: v.user?.username,
            outcome: v.outcome,
            amount: Number(v.amount),
            reputation: Number(repMap.get(Number(v.userId))?.reputationScore || 50),
            accuracy: Number(repMap.get(Number(v.userId))?.accuracy || 0),
            createdAt: v.createdAt,
        }));
        const timeline = await this.connection.eventLog.findMany({
            where: { OR: [{ refMatchId: matchId }, { refPoolId: pool.matchId }] },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });
        const flags = await this.connection.eventLog.findMany({
            where: { refPoolId: pool.matchId, type: { in: ['CollusionRisk', 'CollusionEscalated', 'RapidVotingPattern', 'HardDeadlineEscalated'] } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const bet = await this.connection.bet.findFirst({ where: { id: match.betAId } });
        const aiAnalysis = {
            score: bet?.aiScore || 0,
            flags: bet?.aiAnalysis?.flags || [],
            reasoning: bet?.aiAnalysis?.reasoning || "No analysis available",
        };
        return {
            success: true,
            market: {
                matchId,
                status: match.status,
                poolStatus: pool.status,
                defaultOutcome,
                finalOutcome,
                resolutionTimestamp: resolvedEvent?.createdAt || null,
            },
            oracleVoting: {
                totalVoters,
                yesStake,
                noStake,
                votesYes: votesYes.map((v) => ({ userId: v.user?.id, name: v.user?.username, amount: Number(v.amount), createdAt: v.createdAt })),
                votesNo: votesNo.map((v) => ({ userId: v.user?.id, name: v.user?.username, amount: Number(v.amount), createdAt: v.createdAt })),
            },
            stakeDetails: {
                totalLocked: totalResolutionStake,
                minStakeUsed,
                maxStakeUsed,
                slashedStakeAmount: totalSlashed,
                distribution: [...votesYes, ...votesNo].map((v) => Number(v.amount)).sort((a, b) => b - a).slice(0, 10),
            },
            dispute: {
                disputed: Boolean(pool.disputed),
                initiator: await (async () => {
                    const e = await this.connection.eventLog.findFirst({ where: { refPoolId: pool.matchId, type: 'DisputeRaised' }, orderBy: { createdAt: 'asc' } });
                    return e ? e.payload?.userId || null : null;
                })(),
                stakeAmount: await (async () => {
                    const e = await this.connection.eventLog.findFirst({ where: { refPoolId: pool.matchId, type: 'DisputeRaised' }, orderBy: { createdAt: 'asc' } });
                    return e ? Number(e.payload?.amount || 0) : 0;
                })(),
                windowStart: defaultOutcomeEvent?.createdAt || null,
                windowEnd: pool.disputeDeadline || null,
                outcomeBefore: defaultOutcome,
                outcomeAfter: finalOutcome,
            },
            timeline,
            flags,
            reputationImpact: votersList.map((v) => ({ userId: v.userId, name: v.name, reputation: v.reputation, accuracy: v.accuracy })),
            aiAnalysis,
        };
    }
    async listMyPositions(userId) {
        const positions = await this.connection.position.findMany({
            where: { userId },
            include: {
                pool: true,
                user: { select: { id: true, username: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const enriched = await Promise.all(positions.map(async (p) => {
            const listing = p.pool?.listingId ? await this.connection.listing.findUnique({ where: { id: p.pool.listingId } }) : null;
            const total = Number(p.pool?.totalPoolAmount || 0);
            const yes = Number(p.pool?.totalYesAmount || 0);
            const no = Number(p.pool?.totalNoAmount || 0);
            const probabilities = total > 0 ? { yes: yes / total, no: no / total } : { yes: 0, no: 0 };
            return {
                id: `${p.poolId}:${p.userId}:${p.createdAt.getTime()}`,
                poolId: p.poolId,
                listingId: p.pool?.listingId || null,
                listingTitle: listing?.title || null,
                side: p.side,
                amount: Number(p.amount),
                createdAt: p.createdAt,
                poolStatus: p.pool?.status || null,
                outcome: p.pool?.outcome || null,
                probabilities,
            };
        }));
        return { success: true, positions: enriched };
    }
    async resolveListingPool(adminUserId, listingId, outcome) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.status !== client_1.PoolStatus.UNDER_REVIEW && pool.status !== client_1.PoolStatus.DISPUTED && pool.status !== 'PROVISIONAL') {
            if (pool.status !== client_1.PoolStatus.UNDER_REVIEW && pool.status !== client_1.PoolStatus.DISPUTED) {
                throw new common_1.BadRequestException('Admin can only resolve challenged/disputed markets.');
            }
        }
        if (pool.isLocked || pool.status === client_1.PoolStatus.PAID_OUT)
            throw new common_1.BadRequestException('Market already finalized');
        const normalized = String(outcome || 'YES').toUpperCase();
        await this.connection.pool.update({
            where: { matchId: pool.matchId },
            data: {
                status: client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE,
                outcome: normalized,
                challengeDeadline: (String(process.env.TEST_KEEP_CHALLENGE_OPEN || 'false').toLowerCase() === 'true' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 48 * 60 * 60 * 1000)),
            },
        });
        return { success: true };
    }
    async challengeListingPool(userId, listingId) {
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.status !== client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE)
            throw new common_1.BadRequestException('Challenge not allowed');
        if (!pool.challengeDeadline || Date.now() >= new Date(pool.challengeDeadline).getTime())
            throw new common_1.BadRequestException('Challenge window closed');
        if (pool.isLocked)
            throw new common_1.BadRequestException('Market is settled and locked');
        const outcome = String(pool.outcome || 'YES').toUpperCase();
        const losingSide = outcome === 'YES' ? client_1.Side.NO : client_1.Side.YES;
        const hasLosingPosition = await this.connection.position.findFirst({
            where: { poolId: pool.matchId, userId, side: losingSide },
        });
        const allowAny = String(process.env.TEST_ALLOW_ANY_CHALLENGE || 'false').toLowerCase() === 'true';
        if (!allowAny) {
            if (!hasLosingPosition)
                throw new common_1.BadRequestException('Only losing user can challenge');
        }
        await this.connection.pool.update({
            where: { matchId: pool.matchId },
            data: { status: client_1.PoolStatus.UNDER_REVIEW, challengeCount: (pool.challengeCount || 0) + 1 },
        });
        return { success: true };
    }
    async expireMatchNow(adminUserId, id) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findUnique({ where: { matchId: id } });
        if (!pool)
            throw new common_1.BadRequestException('No matched pool');
        await this.connection.$transaction(async (tx) => {
            await tx.pool.update({ where: { matchId: id }, data: { status: 'CLOSED', closeTime: new Date() } });
            await tx.eventLog.create({ data: { type: 'MarketExpiredInstant', refPoolId: id, payload: { timestamp: new Date() } } });
            const prov = await tx.eventLog.findFirst({ where: { refMatchId: id, type: 'ProvisionalSet' }, orderBy: { createdAt: 'desc' } });
            let proposedYes = null;
            if (prov && prov.payload) {
                const p = prov.payload;
                if (typeof p.outcomeYes === 'boolean')
                    proposedYes = !!p.outcomeYes;
                else if (typeof p.outcome === 'string')
                    proposedYes = String(p.outcome).toUpperCase() === 'YES';
            }
            const poolRec = await tx.pool.findUnique({ where: { matchId: id } });
            if (proposedYes === null)
                proposedYes = Number(poolRec?.totalYesAmount || 0) >= Number(poolRec?.totalNoAmount || 0);
            await tx.pool.update({ where: { matchId: id }, data: { status: 'RESOLUTION_OPEN', resolutionDeadline: new Date(), outcome: proposedYes ? 'YES' : 'NO' } });
            await tx.eventLog.create({ data: { type: 'DefaultOutcomeSet', refPoolId: id, payload: { outcome: proposedYes ? 'YES' : 'NO', source: prov ? 'onchain' : 'stakes' } } });
        });
        return { success: true };
    }
    async expireListingNow(adminUserId, listingId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        await this.connection.$transaction(async (tx) => {
            await tx.pool.update({ where: { matchId: pool.matchId }, data: { status: 'CLOSED', closeTime: new Date() } });
            await tx.eventLog.create({ data: { type: 'MarketExpiredInstant', refPoolId: pool.matchId, payload: { timestamp: new Date() } } });
            const prov = await tx.eventLog.findFirst({ where: { refMatchId: pool.matchId, type: 'ProvisionalSet' }, orderBy: { createdAt: 'desc' } });
            let proposedYes = null;
            if (prov && prov.payload) {
                const p = prov.payload;
                if (typeof p.outcomeYes === 'boolean')
                    proposedYes = !!p.outcomeYes;
                else if (typeof p.outcome === 'string')
                    proposedYes = String(p.outcome).toUpperCase() === 'YES';
            }
            const poolRec = await tx.pool.findUnique({ where: { matchId: pool.matchId } });
            if (proposedYes === null)
                proposedYes = Number(poolRec?.totalYesAmount || 0) >= Number(poolRec?.totalNoAmount || 0);
            await tx.pool.update({ where: { matchId: pool.matchId }, data: { status: 'RESOLUTION_OPEN', resolutionDeadline: new Date(), outcome: proposedYes ? 'YES' : 'NO' } });
            await tx.eventLog.create({ data: { type: 'DefaultOutcomeSet', refPoolId: pool.matchId, payload: { outcome: proposedYes ? 'YES' : 'NO', source: prov ? 'onchain' : 'stakes' } } });
        });
        return { success: true };
    }
    async fastFinalizeOracle(adminUserId, matchId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        await this.connection.pool.update({ where: { matchId }, data: { status: 'RESOLUTION_CALCULATION' } });
        return await this.finalizeResolutionVoting(adminUserId, matchId);
    }
    async getChallengedMarkets(adminUserId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pools = await this.connection.pool.findMany({
            where: { status: { in: [client_1.PoolStatus.UNDER_REVIEW, client_1.PoolStatus.DISPUTED] } },
            orderBy: { updatedAt: 'desc' },
            include: { listing: true, match: true },
        });
        return { success: true, pools };
    }
    async getAdminChallenges(adminUserId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pools = await this.connection.pool.findMany({
            where: {
                OR: [
                    { challengeCount: { gt: 0 } },
                    { status: { in: [client_1.PoolStatus.RESOLVED, client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE, client_1.PoolStatus.UNDER_REVIEW, client_1.PoolStatus.DISPUTED, client_1.PoolStatus.SETTLED, client_1.PoolStatus.FINALIZED] } },
                ],
            },
            orderBy: { updatedAt: 'desc' },
            include: { listing: true, match: true },
        });
        const challenges = await Promise.all(pools.map(async (p) => {
            const events = await this.connection.eventLog.findMany({ where: { refPoolId: p.matchId, type: 'OutcomeChallenged' }, orderBy: { createdAt: 'asc' } });
            const lastEvent = events && events.length ? events[events.length - 1] : null;
            const challengerId = lastEvent?.payload?.byUserId || p.challengerId || null;
            const challenger = challengerId ? await this.connection.auth.findUnique({ where: { id: challengerId }, select: { id: true, username: true, email: true } }) : null;
            const amount = lastEvent?.payload?.bond || Number(p.challengeBond || 0);
            const proposedOutcome = lastEvent?.payload?.proposedOutcome || p.outcome || null;
            const votesYes = await this.connection.resolutionVote.findMany({ where: { poolId: p.matchId, outcome: 'YES' } });
            const votesNo = await this.connection.resolutionVote.findMany({ where: { poolId: p.matchId, outcome: 'NO' } });
            const yesStake = votesYes.reduce((s, v) => s + Number(v.amount), 0);
            const noStake = votesNo.reduce((s, v) => s + Number(v.amount), 0);
            const poolTitle = (p.listing && (p.listing.title || p.listing.name)) || (p.title || null) || (p.match && (p.match.title || null)) || null;
            return {
                challengeId: lastEvent?.id || `pool-${p.matchId}`,
                poolId: p.matchId,
                matchId: p.matchId,
                listingId: p.listingId || null,
                poolTitle,
                challenger: challenger || null,
                amount: Number(amount || 0),
                proposedOutcome: proposedOutcome || null,
                currentOutcome: p.outcome || null,
                challengeTimestamp: lastEvent?.createdAt || p.updatedAt,
                status: p.status,
                votes: {
                    votersCount: (votesYes.length + votesNo.length),
                    yes: { count: votesYes.length, stake: yesStake, voters: votesYes.map((v) => ({ userId: v.userId, amount: Number(v.amount) })) },
                    no: { count: votesNo.length, stake: noStake, voters: votesNo.map((v) => ({ userId: v.userId, amount: Number(v.amount) })) },
                },
                rawPool: p,
                events,
            };
        }));
        return { success: true, challenges };
    }
    async getMarketReport(matchId) {
        const match = await this.connection.match.findUnique({ where: { id: matchId } });
        if (!match)
            throw new common_1.BadRequestException('Match not found');
        const pool = await this.connection.pool.findUnique({ where: { matchId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        const votes = await this.connection.resolutionVote.findMany({ where: { poolId: pool.matchId } });
        const positions = await this.connection.position.findMany({ where: { poolId: pool.matchId } });
        const balances = await Promise.all(positions.map(async (p) => {
            const b = await this.connection.balance.findUnique({ where: { userId: p.userId } });
            return { userId: p.userId, available: Number(b?.available || 0), locked: Number(b?.locked || 0) };
        }));
        const events = await this.connection.eventLog.findMany({ where: { refPoolId: pool.matchId }, orderBy: { createdAt: 'asc' } });
        return {
            success: true,
            status: { match: match.status, pool: pool.status, outcome: pool.outcome },
            votes,
            balances,
            timestamps: {
                created: match.createdAt,
                closed: pool.closeTime,
                resolutionOpened: pool.resolutionDeadline,
                challengeDeadline: pool.challengeDeadline,
                updatedAt: pool.updatedAt,
            },
            events,
        };
    }
    async finalizeListingPool(adminUserId, listingId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        if (pool.status === client_1.PoolStatus.PAID_OUT || pool.isLocked)
            return { success: true };
        if (pool.status !== client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE && pool.status !== client_1.PoolStatus.UNDER_REVIEW)
            throw new common_1.BadRequestException('Not eligible for finalize');
        if (pool.status === client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE) {
            if (!pool.challengeDeadline || Date.now() < new Date(pool.challengeDeadline).getTime())
                throw new common_1.BadRequestException('Challenge window still open');
        }
        const outcome = String(pool.outcome || 'YES').toUpperCase();
        const winningSide = outcome === 'YES' ? client_1.Side.YES : client_1.Side.NO;
        const losingSide = outcome === 'YES' ? client_1.Side.NO : client_1.Side.YES;
        const positionsWin = await this.connection.position.findMany({ where: { poolId: pool.matchId, side: winningSide } });
        const positionsLose = await this.connection.position.findMany({ where: { poolId: pool.matchId, side: losingSide } });
        const totalWin = positionsWin.reduce((acc, p) => acc + Number(p.amount), 0);
        const totalLose = positionsLose.reduce((acc, p) => acc + Number(p.amount), 0);
        if (totalWin === 0 || totalLose === 0) {
            for (const p of [...positionsWin, ...positionsLose]) {
                const bal = await this.connection.balance.findUnique({ where: { userId: p.userId } });
                const available = Number(bal?.available || 0);
                const locked = Number(bal?.locked || 0);
                await this.connection.balance.update({
                    where: { userId: p.userId },
                    data: { available: (available + Number(p.amount)), locked: (locked - Number(p.amount)) },
                });
            }
            await this.connection.pool.update({ where: { matchId: pool.matchId }, data: { status: client_1.PoolStatus.SETTLED, isLocked: true, settledAt: new Date() } });
            return { success: true, refunded: true };
        }
        const totalPool = Number(pool.totalPoolAmount || (totalWin + totalLose));
        for (const p of positionsWin) {
            const payout = (Number(p.amount) / totalWin) * totalPool;
            const bal = await this.connection.balance.findUnique({ where: { userId: p.userId } });
            const available = Number(bal?.available || 0);
            const locked = Number(bal?.locked || 0);
            await this.connection.balance.update({
                where: { userId: p.userId },
                data: { available: (available + payout), locked: Math.max(0, locked - Number(p.amount)) },
            });
        }
        for (const p of positionsLose) {
            const bal = await this.connection.balance.findUnique({ where: { userId: p.userId } });
            const locked = Number(bal?.locked || 0);
            await this.connection.balance.update({
                where: { userId: p.userId },
                data: { locked: Math.max(0, locked - Number(p.amount)) },
            });
        }
        await this.connection.pool.update({ where: { matchId: pool.matchId }, data: { status: client_1.PoolStatus.PAID_OUT } });
        await this.connection.pool.update({ where: { matchId: pool.matchId }, data: { status: client_1.PoolStatus.SETTLED, isLocked: true, settledAt: new Date() } });
        return { success: true };
    }
    async adminCloseListing(adminUserId, listingId) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const pool = await this.connection.pool.findFirst({ where: { listingId } });
        if (!pool)
            throw new common_1.BadRequestException('Pool not found');
        throw new common_1.BadRequestException('Manual close disabled. Markets auto-close at expiry.');
    }
    async getOracleReputation(userId) {
        const profile = await this.connection.gamificationProfile.findUnique({ where: { userId } });
        if (!profile) {
            return { success: true, reputation: 50, accuracy: 0, wins: 0, losses: 0, tier: 'Bronze' };
        }
        const wins = Number(profile.wins || 0);
        const losses = Number(profile.losses || 0);
        const total = wins + losses;
        const accuracy = total > 0 ? (wins / total) * 100 : 0.0;
        return {
            success: true,
            reputation: Number(profile.reputationScore || 50),
            accuracy,
            wins,
            losses,
            tier: String(profile.tier || 'Bronze'),
        };
    }
    async adminRemoveWalletAddress(adminUserId, address) {
        const admin = await this.connection.auth.findFirst({ where: { id: adminUserId } });
        if (!admin || String(admin.role) !== 'admin')
            throw new common_1.BadRequestException('Admin only');
        const addr = String(address || '').toLowerCase();
        if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
            throw new common_1.BadRequestException('Invalid address');
        }
        const user = await this.connection.auth.findFirst({
            where: { wallet_address: addr },
        });
        await this.connection.$transaction(async (tx) => {
            await tx.auth.updateMany({
                where: { wallet_address: addr },
                data: { wallet_address: null },
            });
            await tx.position.deleteMany({
                where: { walletAddress: addr },
            });
        });
        return { success: true, userId: user?.id ?? null, removedPositions: true, address: addr };
    }
};
exports.BetsService = BetsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BetsService.prototype, "autoFinalizeExpired", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BetsService.prototype, "autoOracleCycle", null);
exports.BetsService = BetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connection_service_1.ConnectionService,
        gamification_service_1.GamificationService])
], BetsService);
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
function toProbTag(score) {
    if (score >= 70)
        return 'HIGH';
    if (score >= 50)
        return 'MEDIUM';
    if (score >= 30)
        return 'LOW';
    return 'SPEC';
}
function toRiskLabel(score) {
    if (score >= 80)
        return 'Healthy';
    if (score >= 50)
        return 'Medium Risk';
    return 'High Risk';
}
function scoreFeasibility(input) {
    const t = `${input.title || ''} ${input.description || ''}`.toLowerCase();
    let s = 50;
    const len = t.length;
    if (len >= 20 && len <= 160)
        s += 10;
    else
        s -= 10;
    const timeWords = ['by', 'before', 'after', 'next', 'today', 'this week', 'this month', 'in ', 'on '];
    if (timeWords.some(w => t.includes(w)))
        s += 10;
    const immediate = ['next over', 'next minute', 'next hour', 'immediately'];
    if (immediate.some(w => t.includes(w)))
        s -= 15;
    const measurable = ['win', 'reach', 'hit', 'score', 'increase', 'decrease', 'surpass', 'exceed', 'drop', 'rise'];
    if (measurable.some(w => t.includes(w)))
        s += 15;
    const extreme = ['always', 'never', 'guaranteed', 'impossible'];
    if (extreme.some(w => t.includes(w)))
        s -= 25;
    const speculative = ['might', 'could', 'may', 'possible', 'speculative'];
    if (speculative.some(w => t.includes(w)))
        s -= 10;
    if (String(input.category || '').toLowerCase() === 'sports' && immediate.some(w => t.includes(w)))
        s -= 10;
    return clamp(s, 0, 100);
}
function scoreHealth(pool, match) {
    const total = Number(pool.totalPoolAmount || 0);
    let s = 0;
    if (total >= 1000)
        s += 50;
    else if (total >= 500)
        s += 35;
    else if (total >= 100)
        s += 20;
    else
        s += 5;
    const pc = Number(pool.participantsCount || 0);
    if (pc >= 10)
        s += 20;
    else if (pc >= 6)
        s += 15;
    else if (pc >= 3)
        s += 10;
    else if (pc >= 2)
        s += 5;
    const yes = Number(pool.totalYesAmount || 0);
    const no = Number(pool.totalNoAmount || 0);
    const tot = yes + no;
    let bal = 20;
    if (tot > 0) {
        const share = Math.max(yes, no) / tot;
        if (share >= 0.95)
            bal = 5;
        else if (share >= 0.9)
            bal = 10;
        else if (share >= 0.75)
            bal = 15;
        else
            bal = 20;
    }
    s += bal;
    const started = match.marketStartTime ? new Date(match.marketStartTime).getTime() : pool.createdAt ? new Date(pool.createdAt).getTime() : 0;
    let age = 5;
    if (started > 0) {
        const hrs = (Date.now() - started) / 3600000;
        if (hrs < 1)
            age = 2;
        else if (hrs > 720)
            age = 3;
        else
            age = 5;
    }
    s += age;
    let penalty = 0;
    const stat = pool.status;
    const cc = Number(pool.challengeCount || 0);
    if (stat === client_1.PoolStatus.UNDER_REVIEW)
        penalty += 25;
    else if (stat === client_1.PoolStatus.RESOLVED_PENDING_CHALLENGE)
        penalty += 15;
    penalty += Math.min(cc * 5, 15);
    return clamp(s - penalty, 0, 100);
}
//# sourceMappingURL=bets.service.js.map