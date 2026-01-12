const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock Services
const mockConnection = prisma;
// We need to simulate the service logic without importing NestJS modules directly if possible, 
// or just use raw Prisma calls to simulate the state transitions and verify the logic I added to the service?
// No, I need to test the SERVICE logic.
// But importing the service requires NestJS context.
// Easier to replicate the logic flow with raw Prisma calls to setup, then use a simplified version of the logic or just assume the service code is what I wrote.
// Actually, I can use the 'RunCommand' to run a script that imports the service if I setup a standalone Nest app context.
// Or I can just write a script that performs the ACTIONS via HTTP if the server is running?
// The server is running on terminal 7 (hardhat node) and... wait, is the backend server running?
// Terminal 7 is 'npx hardhat node'.
// Terminal 6 is idle.
// I don't think the NestJS backend is running.
// I should run the backend in a new terminal and test via API.
// OR I can write a unit-test style script that imports the Service class and mocks dependencies.

// Let's try to run the backend and use fetch.
// Steps:
// 1. Start Backend.
// 2. Create Users/Match via API (or Prisma directly to save time).
// 3. Call Challenge API.
// 4. Call Admin Override API.
// 5. Call Finalize API.

// Actually, starting the backend might take time/resources.
// Writing a script that instantiates BetsService is better.

const { BetsService } = require('../bets/bets/bets.service');
// const { Test } = require('@nestjs/testing'); // Not used and might fail
// const { ConnectionService } = require('../connection/connection.service'); // Assuming path
// const { GamificationService } = require('../gamification/gamification/gamification.service');

// Mock ConnectionService
const mockConnectionService = {
  ...prisma,
  $transaction: async (cb) => cb(prisma),
  bet: prisma.bet,
  match: prisma.match,
  pool: prisma.pool,
  auth: prisma.auth,
  balance: prisma.balance,
  eventLog: prisma.eventLog,
  gamificationProfile: prisma.gamificationProfile
};

const mockGamificationService = {
  incrementBetCreation: async () => {},
  updateResolutionStats: async () => {}
};

async function main() {
  console.log('Starting Challenge Verification...');
  
  // 1. Setup Data
  const admin = await prisma.auth.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', username: 'Admin', role: 'admin', password: 'p', setting: {} }
  });
  
  const userA = await prisma.auth.upsert({
    where: { email: 'userA@test.com' },
    update: {},
    create: { email: 'userA@test.com', username: 'UserA', role: 'buyer', password: 'p', setting: {} }
  });
  
  const userB = await prisma.auth.upsert({
    where: { email: 'userB@test.com' },
    update: {},
    create: { email: 'userB@test.com', username: 'UserB', role: 'buyer', password: 'p', setting: {} }
  });

  // Reset Balances
  await prisma.balance.upsert({ where: { userId: userA.id }, update: { available: 1000, locked: 0 }, create: { userId: userA.id, available: 1000 } });
  await prisma.balance.upsert({ where: { userId: userB.id }, update: { available: 1000, locked: 0 }, create: { userId: userB.id, available: 1000 } });

  // Create Bets
  const betA = await prisma.bet.create({
    data: { creatorId: userA.id, title: 'Test Bet A', description: 'desc', category: 'Sports', options: [], choice: 'YES', stakeAmount: 100, currency: 'USD', endDate: new Date(), status: 'MATCHED' }
  });
  
  const betB = await prisma.bet.create({
    data: { creatorId: userB.id, title: 'Test Bet B', description: 'desc', category: 'Sports', options: [], choice: 'NO', stakeAmount: 100, currency: 'USD', endDate: new Date(), status: 'MATCHED' }
  });

  // Create Match & Pool
  const match = await prisma.match.create({
    data: { betAId: betA.id, betBId: betB.id, status: 'RESOLVED' }
  });
  
  const pool = await prisma.pool.create({
    data: {
      matchId: match.id,
      userAId: userA.id,
      userBId: userB.id,
      stakeA: 100,
      stakeB: 100,
      totalPoolAmount: 200,
      status: 'RESOLVED_PENDING_CHALLENGE',
      outcome: 'YES', // User A wins initially
      challengeDeadline: new Date(Date.now() + 100000)
    }
  });

  console.log('Match Created:', match.id);

  // Instantiate Service (Manually to avoid NestJS boot overhead)
  const service = new BetsService(mockConnectionService, mockGamificationService);

  // 2. Challenge (User B challenges)
  console.log('Challenging...');
  // Expect Bond: 5% of 200 = 10. Min is 5. So 10.
  const challengeRes = await service.challengeMatch(userB.id, match.id);
  console.log('Challenge Result:', challengeRes);
  
  const poolAfterChallenge = await prisma.pool.findUnique({ where: { matchId: match.id } });
  const balanceB = await prisma.balance.findUnique({ where: { userId: userB.id } });
  
  if (poolAfterChallenge.status !== 'UNDER_REVIEW') throw new Error('Pool status incorrect');
  if (Number(poolAfterChallenge.challengeBond) !== 10) throw new Error('Bond incorrect');
  if (Number(balanceB.available) !== 990) throw new Error('Balance not deducted');

  // 3. Admin Override (Flip to NO)
  console.log('Admin Overriding...');
  await service.adminOverrideOutcome(admin.id, match.id, 'NO');
  
  const poolAfterOverride = await prisma.pool.findUnique({ where: { matchId: match.id } });
  if (poolAfterOverride.status !== 'RESOLVED_PENDING_CHALLENGE') throw new Error('Status after override incorrect');
  if (poolAfterOverride.outcome !== 'NO') throw new Error('Outcome not flipped');

  // 4. Finalize (Return Bond)
  console.log('Finalizing...');
  // Mock finalizePayoutInternal call via finalizeMatch
  // Note: finalizeMatch requires status RESOLVED_PENDING_CHALLENGE or UNDER_REVIEW.
  // It is now RESOLVED_PENDING_CHALLENGE.
  await service.finalizeMatch(admin.id, match.id);
  
  const balanceBFinal = await prisma.balance.findUnique({ where: { userId: userB.id } });
  console.log('Final Balance B:', balanceBFinal);
  
  // User B should get:
  // 1. Bond back (10)
  // 2. Winnings (200)
  // Initial Available: 990.
  // +10 (Bond) = 1000.
  // +200 (Winnings) - 100 (Stake unlock?) 
  // Wait, finalizePayoutInternal logic for balance update:
  // winnerId = userB.
  // balWin.available += total (200).
  // balWin.locked -= stakeWinner (100).
  // Initial Locked: 0 -> challenge -> +10? No, challenge locks bond. 
  // Wait, the bet stake (100) should have been locked when bet was created?
  // My setup didn't lock the initial stake.
  // But `finalizePayoutInternal` assumes it was locked.
  // So `locked` becomes negative if I didn't set it.
  // `available` = 990 + 10 (Bond Return) + 200 (Winnings) = 1200.
  // `locked` = 10 (Bond) - 10 (Bond Return) - 100 (Stake) = -100.
  // I only care about `available` increasing by Bond + Winnings.
  // 990 -> 1200.
  
  if (Number(balanceBFinal.available) !== 1200) {
      console.log('Expected 1200, got', Number(balanceBFinal.available));
      throw new Error('Final Balance incorrect');
  }

  console.log('Verification Successful!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
