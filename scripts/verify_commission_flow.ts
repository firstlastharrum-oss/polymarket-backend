
import { BetsService } from '../bets/bets/bets.service';
import { ConnectionService } from '../src/connection/connection.service';
import { GamificationService } from '../gamification/gamification/gamification.service';
import { BetStatus, PoolStatus, MatchStatus, EthicsVerdict } from '@prisma/client';

async function main() {
    console.log('Initializing services...');
    const connection = new ConnectionService();
    await connection.onModuleInit();
    const gamification = new GamificationService(connection);
    const betsService = new BetsService(connection, gamification);

    try {
        // 1. Setup Users
        console.log('Setting up users...');
        const ensureUser = async (id: number, role: 'admin' | 'buyer') => {
            const email = `user${id}@test.com`;
            let user = await connection.auth.findUnique({ where: { id } });
            if (!user) {
                user = await connection.auth.create({
                    data: {
                        id,
                        email,
                        username: `User${id}`,
                        password: 'password',
                        role: role as any,
                        setting: {},
                        wallet_address: `0xUser${id}`
                    }
                });
            } else if (user.role !== role) {
                await connection.auth.update({ where: { id }, data: { role: role as any } });
            }
            // Fund wallet
            const balance = await connection.balance.findUnique({ where: { userId: id } });
            if (!balance) {
                await connection.balance.create({ data: { userId: id, available: 100000, locked: 0 } });
            } else {
                await connection.balance.update({ where: { userId: id }, data: { available: 100000, locked: 0 } });
            }
            return user;
        };

        const admin = await ensureUser(999, 'admin');
        const creator = await ensureUser(101, 'buyer');
        const winner = await ensureUser(102, 'buyer');
        const loser = await ensureUser(103, 'buyer');

        // 2. Create Bet (Market Proposal)
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
        if (!createResult.success) throw new Error('Bet creation failed');
        const bet = createResult.bet;
        console.log(`Bet created: ${bet.id}, AI Score: ${bet.aiScore}`);

        // 3. Simulate Activation (Match & Pool Creation)
        console.log('Simulating Activation...');
        // Manually update AI Score to ensure we hit the quality bonus
        await connection.bet.update({ where: { id: bet.id }, data: { aiScore: 90 } as any });

        const match = await connection.match.create({
            data: {
                betAId: bet.id,
                status: MatchStatus.PENDING, // Will become PAID after resolution
            }
        });

        // Create Pool with dummy volume to trigger commission tiers
        // Tier 2: >10 participants or >1000 volume.
        // We set totalPoolAmount = 2000, participants = 12.
        const pool = await connection.pool.create({
            data: {
                matchId: match.id,
                userAId: creator.id,
                stakeA: 1000,
                stakeB: 1000,
                totalPoolAmount: 2000,
                participantsCount: 12,
                status: PoolStatus.LIVE,
                outcome: 'YES', // Default
            } as any
        });
        console.log(`Match ${match.id} and Pool created.`);

        // 4. Resolve Market
        console.log('Resolving Market...');
        // Admin resolves it to YES
        await betsService.resolveMatch(admin.id, match.id, 'YES');
        
        // Check status
        const resolvedPool = await connection.pool.findUnique({ where: { matchId: match.id } });
        console.log(`Pool status after resolution: ${resolvedPool?.status}`);

        // 5. Finalize Market (Triggers Payout & Commission)
        console.log('Finalizing Market...');
        // Force finalize usually requires waiting for challenge window, but we can try calling finalizeMatch
        // If finalizeMatch fails due to window, we might need to manually update pool status to simulate window passing.
        
        // Hack: Update challenge deadline to past
        await connection.pool.update({
            where: { matchId: match.id },
            data: { challengeDeadline: new Date(Date.now() - 1000) }
        });

        await betsService.finalizeMatch(admin.id, match.id);
        console.log('Market Finalized.');

        // 6. Verify Commission
        console.log('Verifying Earnings...');
        const earnings = await betsService.getCreatorEarnings(creator.id);
        const latestEarning = earnings.earnings.find(e => e.marketId === bet.id);

        if (latestEarning) {
            console.log('SUCCESS: Commission Record Found!');
            console.log(latestEarning);
            console.log(`Platform Fee: ${latestEarning.platformFee}`);
            console.log(`Commission Earned: ${latestEarning.commissionEarned}`);
            
            // Validate Calculation
            // Rate = 100 + (12 * 10) = 220 => 2.2%
            // Fee = 2000 * 0.022 = 44
            // Share = 0.20 (Tier 2)
            // Quality = 1.2 (AI 90 => +0.2)
            // Expected = 44 * 0.20 * 1.2 = 10.56
            
            const expected = 10.56;
            const actual = Number(latestEarning.commissionEarned);
            if (Math.abs(actual - expected) < 0.1) {
                console.log('Calculation Verified: Correct!');
            } else {
                console.error(`Calculation Mismatch: Expected ${expected}, got ${actual}`);
            }
        } else {
            console.error('FAILURE: No commission record found.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await connection.$disconnect();
    }
}

main();
