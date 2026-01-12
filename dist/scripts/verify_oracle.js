"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
const ethers_1 = require("ethers");
dotenv.config();
const connection = new client_1.PrismaClient();
const baseUrl = 'http://localhost:5000';
async function registerUser(prefix) {
    const email = `${prefix}_${Date.now()}@test.com`;
    const wallet = ethers_1.ethers.Wallet.createRandom();
    const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: 'password123',
            username: `${prefix}_${Date.now()}`,
            wallet_address: wallet.address,
            role: 'buyer',
            setting: {
                kyc: {
                    fullName: `Test User`,
                    country: 'US',
                    idType: 'passport',
                    idNumber: `A${Date.now().toString().slice(-8)}`,
                    consent: true,
                    reference: `${prefix}-ref-${Math.floor(Math.random() * 10000)}`
                },
                kyc_status: 'verified'
            },
        }),
    });
    const data = await res.json();
    if (!data.success)
        throw new Error(`Failed to register ${prefix}: ${JSON.stringify(data)}`);
    const user = await connection.auth.findUnique({ where: { email } });
    if (!user)
        throw new Error('User not found after register');
    await connection.balance.upsert({
        where: { userId: user.id },
        update: { available: 5000 },
        create: { userId: user.id, available: 5000 },
    });
    return { id: user.id, token: data.token, wallet: wallet.address };
}
async function main() {
    console.log('Starting Oracle Workflow Verification...');
    const creatorA = await registerUser('creatorA');
    const creatorB = await registerUser('creatorB');
    const voter1 = await registerUser('voter1');
    const voter2 = await registerUser('voter2');
    const voter3 = await registerUser('voter3');
    const disputer = await registerUser('disputer');
    const adminEmail = `admin_${Date.now()}@test.com`;
    const adminWallet = ethers_1.ethers.Wallet.createRandom();
    const adminRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: adminEmail,
            password: 'password123',
            username: `admin_${Date.now()}`,
            wallet_address: adminWallet.address,
            role: 'admin',
            setting: {
                kyc: {
                    fullName: `Test Admin`,
                    country: 'US',
                    idType: 'passport',
                    idNumber: `A${Date.now().toString().slice(-8)}`,
                    consent: true,
                    reference: `admin-ref-${Math.floor(Math.random() * 10000)}`
                },
                kyc_status: 'verified'
            },
        }),
    });
    const adminData = await adminRes.json();
    if (!adminRes.ok || !adminData.success)
        throw new Error(`Failed to register admin: ${JSON.stringify(adminData)}`);
    const adminUser = await connection.auth.findUnique({ where: { email: adminEmail } });
    await connection.balance.upsert({ where: { userId: adminUser.id }, update: { available: 5000 }, create: { userId: adminUser.id, available: 5000 } });
    const endSoon = new Date(Date.now() + 3000);
    const betA = await connection.bet.create({
        data: {
            creatorId: creatorA.id,
            title: 'Oracle Test A',
            description: 'Outcome testing YES',
            category: 'Sports',
            options: ['YES', 'NO'],
            choice: 'YES',
            stakeAmount: 100,
            currency: 'USD',
            endDate: endSoon,
            status: client_1.BetStatus.ACTIVE,
            ethicsVerdict: 'APPROVED'
        },
    });
    const betB = await connection.bet.create({
        data: {
            creatorId: creatorB.id,
            title: 'Oracle Test B',
            description: 'Outcome testing NO',
            category: 'Sports',
            options: ['YES', 'NO'],
            choice: 'NO',
            stakeAmount: 100,
            currency: 'USD',
            endDate: endSoon,
            status: client_1.BetStatus.ACTIVE,
            ethicsVerdict: 'APPROVED'
        },
    });
    const match = await connection.match.create({
        data: {
            betAId: betA.id,
            betBId: betB.id,
            status: client_1.MatchStatus.MARKET_CREATED,
            marketId: `test-${Date.now()}`,
            marketStartTime: new Date(),
        },
    });
    const pool = await connection.pool.create({
        data: {
            matchId: match.id,
            userAId: creatorA.id,
            userBId: creatorB.id,
            stakeA: betA.stakeAmount,
            stakeB: betB.stakeAmount,
            totalPoolAmount: (Number(betA.stakeAmount) + Number(betB.stakeAmount)),
            participantsCount: 2,
            closeTime: endSoon,
            status: client_1.PoolStatus.LIVE,
            resolutionWindowHours: 0.01,
            disputeWindowHours: 0.01,
        },
    });
    console.log('Seeded match and pool:', match.id, pool.matchId);
    console.log('Waiting ~20s for market to close and resolution to open...');
    await new Promise((r) => setTimeout(r, 20000));
    const disputeRes = await fetch(`${baseUrl}/bets/matches/${match.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${disputer.token}` },
        body: JSON.stringify({ outcome: 'NO', amount: 50 }),
    });
    const disputeData = await disputeRes.json().catch(() => ({}));
    console.log('Dispute response:', disputeData);
    if (!disputeRes.ok)
        throw new Error(`dispute failed: ${JSON.stringify(disputeData)}`);
    const voteYesRes = await fetch(`${baseUrl}/bets/matches/${match.id}/resolution/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${voter1.token}` },
        body: JSON.stringify({ outcome: 'YES', amount: 30 }),
    });
    const voteYesData = await voteYesRes.json().catch(() => ({}));
    if (!voteYesRes.ok)
        throw new Error(`vote YES failed: ${JSON.stringify(voteYesData)}`);
    const voteNoRes = await fetch(`${baseUrl}/bets/matches/${match.id}/resolution/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${voter2.token}` },
        body: JSON.stringify({ outcome: 'NO', amount: 20 }),
    });
    const voteNoData = await voteNoRes.json().catch(() => ({}));
    if (!voteNoRes.ok)
        throw new Error(`vote NO failed: ${JSON.stringify(voteNoData)}`);
    const voteYesRes2 = await fetch(`${baseUrl}/bets/matches/${match.id}/resolution/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${voter3.token}` },
        body: JSON.stringify({ outcome: 'YES', amount: 25 }),
    });
    const voteYesData2 = await voteYesRes2.json().catch(() => ({}));
    if (!voteYesRes2.ok)
        throw new Error(`vote YES (voter3) failed: ${JSON.stringify(voteYesData2)}`);
    const finalizeRes = await fetch(`${baseUrl}/bets/matches/${match.id}/resolution/finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${creatorA.token}` },
    });
    const finalizeData = await finalizeRes.json().catch(() => ({}));
    console.log('Finalize voting:', finalizeData);
    if (!finalizeRes.ok)
        throw new Error(`finalize failed: ${JSON.stringify(finalizeData)}`);
    const finalizeAdminRes = await fetch(`${baseUrl}/bets/matches/${match.id}/finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminData.token}` },
    });
    const finalizeAdminData = await finalizeAdminRes.json().catch(() => ({}));
    console.log('Admin finalize:', finalizeAdminData);
    const finalPool = await connection.pool.findUnique({ where: { matchId: match.id } });
    console.log('Final market status:', finalPool?.status);
    const profileRes = await fetch(`${baseUrl}/gamification/profile/${voter1.id}`, { method: 'GET' });
    const profileData = await profileRes.json().catch(() => ({}));
    console.log('Public profile (voter1):', profileData);
    if (!profileRes.ok || !profileData.success)
        throw new Error(`profile fetch failed: ${JSON.stringify(profileData)}`);
    const resolverStats = profileData.resolver;
    const computedAccuracy = resolverStats.totalResolutions > 0 ? (resolverStats.correctResolutions / resolverStats.totalResolutions) * 100 : 0;
    if (Math.abs(computedAccuracy - resolverStats.accuracyRate) > 0.0001) {
        throw new Error(`accuracy mismatch: computed=${computedAccuracy} returned=${resolverStats.accuracyRate}`);
    }
    const leaderboardRes = await fetch(`${baseUrl}/gamification/leaderboard?type=accuracy&limit=10`, { method: 'GET' });
    const leaderboardData = await leaderboardRes.json().catch(() => ({}));
    console.log('Leaderboard (accuracy):', leaderboardData);
    if (!Array.isArray(leaderboardData))
        throw new Error(`leaderboard format unexpected: ${JSON.stringify(leaderboardData)}`);
    const lbEntry = leaderboardData.find((e) => Number(e.id) === Number(voter1.id));
    if (lbEntry) {
        const lbAcc = Number(lbEntry.accuracy || 0);
        if (Math.abs(lbAcc - resolverStats.accuracyRate) > 0.0001) {
            throw new Error(`leaderboard/profile accuracy mismatch: lb=${lbAcc} profile=${resolverStats.accuracyRate}`);
        }
    }
    console.log('Oracle Workflow Verification Completed');
}
main().catch(async (e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await connection.$disconnect();
});
//# sourceMappingURL=verify_oracle.js.map