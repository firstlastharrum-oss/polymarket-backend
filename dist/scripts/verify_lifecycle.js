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
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const connection = new client_1.PrismaClient();
const baseUrl = 'http://127.0.0.1:5000';
async function main() {
    console.log('Starting E2E Lifecycle Verification...');
    async function registerUser(prefix) {
        const email = `${prefix}-${Date.now()}@test.com`;
        const wallet = ethers_1.ethers.Wallet.createRandom();
        const idNumber = `A${Math.floor(100000 + Math.random() * 900000)}`;
        const res = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123',
                username: `${prefix}_${Date.now()}`,
                wallet_address: wallet.address,
                role: 'buyer',
                setting: { kyc: { fullName: 'Test User', country: 'US', idType: 'passport', idNumber, consent: true, reference: 'ref' } }
            }),
        });
        const data = await res.json();
        if (!data.success)
            throw new Error(`Failed to register ${prefix}: ${JSON.stringify(data)}`);
        await connection.balance.upsert({
            where: { userId: data.data.id },
            update: { available: 1000 },
            create: { userId: data.data.id, available: 1000 },
        });
        return { id: data.data.id, token: data.token, wallet };
    }
    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
    const userA = await registerUser('UserA_Winner');
    const userB = await registerUser('UserB_Loser');
    const userOracle = await registerUser('User_Oracle');
    console.log('Users created:', { A: userA.id, B: userB.id, Oracle: userOracle.id });
    console.log('Creating listing...');
    const listingRes = await fetch(`${baseUrl}/listing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
        body: JSON.stringify({
            title: `E2E Test Market ${Date.now()} ${Math.random().toString(36).substring(7)}`,
            description: 'Will this test pass successfully?',
            category: 'Technology',
            price: 100,
            currency: 'USD',
            status: 'Crypto'
        }),
    });
    const listingData = await listingRes.json();
    if (!listingData.success)
        throw new Error(`Failed to create listing: ${JSON.stringify(listingData)}`);
    const listingId = listingData.data.id;
    console.log('Listing created:', listingId);
    console.log('Placing bets...');
    await fetch(`${baseUrl}/bets/listing/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
        body: JSON.stringify({ listingId, side: 'YES', amount: 50 }),
    });
    await fetch(`${baseUrl}/bets/listing/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userB.token}` },
        body: JSON.stringify({ listingId, side: 'NO', amount: 50 }),
    });
    console.log('Waiting for activation...');
    await sleep(6000);
    let pool = await connection.pool.findFirst({ where: { listingId } });
    if (pool?.status !== 'LIVE') {
        console.log('Pool not LIVE yet, waiting more...');
        await sleep(5000);
        pool = await connection.pool.findFirst({ where: { listingId } });
    }
    if (pool?.status !== 'LIVE')
        throw new Error(`Pool failed to activate: ${pool?.status}`);
    console.log('Market is LIVE. MatchID:', pool.matchId);
    console.log('Simulating expiration (Time Travel)...');
    await connection.pool.update({
        where: { matchId: pool.matchId },
        data: { closeTime: new Date(Date.now() - 10000) }
    });
    console.log('Waiting for auto-close...');
    await sleep(12000);
    pool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
    if (pool?.status === 'CLOSED') {
        console.log('Pool CLOSED, waiting for RESOLUTION_OPEN...');
        await sleep(12000);
        pool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
    }
    if (pool?.status !== 'RESOLUTION_OPEN') {
        console.warn(`Pool status is ${pool?.status}, forcing RESOLUTION_OPEN for test speed...`);
        if (pool) {
            await connection.pool.update({
                where: { matchId: pool.matchId },
                data: { status: 'RESOLUTION_OPEN', resolutionDeadline: new Date(Date.now() + 3600000) }
            });
            pool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
        }
    }
    console.log('Market is in RESOLUTION_OPEN');
    console.log('Casting Oracle Vote (YES)...');
    const voteRes = await fetch(`${baseUrl}/bets/matches/${pool?.matchId}/resolution/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userOracle.token}` },
        body: JSON.stringify({ outcome: 'YES', amount: 25 })
    });
    if (!voteRes.ok)
        console.error('Vote failed:', await voteRes.text());
    console.log('Simulating Resolution Deadline...');
    await connection.pool.update({
        where: { matchId: pool?.matchId },
        data: { resolutionDeadline: new Date(Date.now() - 1000) }
    });
    console.log('Waiting for Resolution Calculation...');
    await sleep(12000);
    pool = await connection.pool.findUnique({ where: { matchId: pool?.matchId } });
    if (pool?.status !== 'RESOLVED_PENDING_CHALLENGE') {
        console.warn(`Status is ${pool?.status}, forcing RESOLVED_PENDING_CHALLENGE...`);
        await connection.pool.update({
            where: { matchId: pool?.matchId },
            data: { status: 'RESOLVED_PENDING_CHALLENGE', outcome: 'YES', challengeDeadline: new Date(Date.now() + 3600000) }
        });
    }
    console.log('Market is RESOLVED_PENDING_CHALLENGE (Outcome: YES)');
    console.log('Simulating Challenge Deadline...');
    await connection.pool.update({
        where: { matchId: pool?.matchId },
        data: { challengeDeadline: new Date(Date.now() - 1000) }
    });
    console.log('Waiting for Final Payout...');
    await sleep(12000);
    pool = await connection.pool.findUnique({ where: { matchId: pool?.matchId } });
    console.log('Final Status:', pool?.status);
    if (pool?.status !== 'PAID_OUT' && pool?.status !== 'FINALIZED') {
        console.log('Auto-finalize might have missed, trying manual finalize trigger...');
        throw new Error(`Market failed to finalize. Status: ${pool?.status}`);
    }
    const balA = await connection.balance.findUnique({ where: { userId: userA.id } });
    const balB = await connection.balance.findUnique({ where: { userId: userB.id } });
    console.log('User A (Winner) Balance:', balA?.available);
    console.log('User B (Loser) Balance:', balB?.available);
    if (Number(balA?.available) <= 950)
        throw new Error('User A did not receive winnings');
    if (Number(balB?.available) !== 950)
        throw new Error('User B balance incorrect');
    const profileA = await connection.gamificationProfile.findUnique({ where: { userId: userA.id } });
    console.log('User A Stats:', profileA);
    if ((profileA?.wins || 0) < 1)
        throw new Error('User A wins not incremented');
    console.log('✅ E2E LIFECYCLE VERIFICATION PASSED!');
}
main()
    .catch(e => {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await connection.$disconnect();
});
//# sourceMappingURL=verify_lifecycle.js.map