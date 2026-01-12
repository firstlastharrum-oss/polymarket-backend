"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bets_service_1 = require("../bets/bets/bets.service");
const connection_service_1 = require("../src/connection/connection.service");
const gamification_service_1 = require("../gamification/gamification/gamification.service");
const client_1 = require("@prisma/client");
async function main() {
    console.log('Initializing services...');
    const connection = new connection_service_1.ConnectionService();
    await connection.onModuleInit();
    const gamification = new gamification_service_1.GamificationService(connection);
    const betsService = new bets_service_1.BetsService(connection, gamification);
    try {
        console.log('Setting up users...');
        const ensureUser = async (id, role) => {
            const email = `user${id}@test.com`;
            let user = await connection.auth.findUnique({ where: { id } });
            if (!user) {
                user = await connection.auth.create({
                    data: {
                        id,
                        email,
                        username: `User${id}`,
                        password: 'password',
                        role: role,
                        setting: {},
                        wallet_address: `0xUser${id}`
                    }
                });
            }
            else if (user.role !== role) {
                await connection.auth.update({ where: { id }, data: { role: role } });
            }
            const balance = await connection.balance.findUnique({ where: { userId: id } });
            if (!balance) {
                await connection.balance.create({ data: { userId: id, available: 100000, locked: 0 } });
            }
            else {
                await connection.balance.update({ where: { userId: id }, data: { available: 100000, locked: 0 } });
            }
            return user;
        };
        const admin = await ensureUser(999, 'admin');
        const creator = await ensureUser(101, 'buyer');
        const winner = await ensureUser(102, 'buyer');
        const loser = await ensureUser(103, 'buyer');
        console.log('Creating Bet...');
        const betData = {
            title: `Commission Test Market ${Date.now()}`,
            description: 'This market resolves to YES if the commission testing completes successfully by 2026. Source of truth is the system logs.',
            category: 'Technology',
            options: ['Yes', 'No'],
            stakeAmount: 100,
            currency: 'USD',
            endDate: new Date(Date.now() + 7200000).toISOString(),
        };
        const createResult = await betsService.createBet(creator.id, betData);
        if (!createResult.success)
            throw new Error('Bet creation failed');
        const bet = createResult.bet;
        console.log(`Bet created: ${bet.id}, AI Score: ${bet.aiScore}`);
        console.log('Simulating Activation...');
        await connection.bet.update({ where: { id: bet.id }, data: { aiScore: 90 } });
        const match = await connection.match.create({
            data: {
                betAId: bet.id,
                status: client_1.MatchStatus.PENDING,
            }
        });
        const pool = await connection.pool.create({
            data: {
                matchId: match.id,
                userAId: creator.id,
                stakeA: 1000,
                stakeB: 1000,
                totalPoolAmount: 2000,
                participantsCount: 12,
                status: client_1.PoolStatus.LIVE,
                outcome: 'YES',
            }
        });
        console.log(`Match ${match.id} and Pool created.`);
        console.log('Resolving Market...');
        await betsService.resolveMatch(admin.id, match.id, 'YES');
        const resolvedPool = await connection.pool.findUnique({ where: { matchId: match.id } });
        console.log(`Pool status after resolution: ${resolvedPool?.status}`);
        console.log('Finalizing Market...');
        await connection.pool.update({
            where: { matchId: match.id },
            data: { challengeDeadline: new Date(Date.now() - 1000) }
        });
        await betsService.finalizeMatch(admin.id, match.id);
        console.log('Market Finalized.');
        console.log('Verifying Earnings...');
        const earnings = await betsService.getCreatorEarnings(creator.id);
        const latestEarning = earnings.earnings.find(e => e.marketId === bet.id);
        if (latestEarning) {
            console.log('SUCCESS: Commission Record Found!');
            console.log(latestEarning);
            console.log(`Platform Fee: ${latestEarning.platformFee}`);
            console.log(`Commission Earned: ${latestEarning.commissionEarned}`);
            const expected = 10.56;
            const actual = Number(latestEarning.commissionEarned);
            if (Math.abs(actual - expected) < 0.1) {
                console.log('Calculation Verified: Correct!');
            }
            else {
                console.error(`Calculation Mismatch: Expected ${expected}, got ${actual}`);
            }
        }
        else {
            console.error('FAILURE: No commission record found.');
        }
    }
    catch (e) {
        console.error('Error:', e);
    }
    finally {
        await connection.$disconnect();
    }
}
main();
//# sourceMappingURL=verify_commission_flow.js.map