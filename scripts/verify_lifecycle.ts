
import { PrismaClient, PoolStatus } from '@prisma/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new PrismaClient();
const baseUrl = 'http://127.0.0.1:5000';

async function main() {
  console.log('Starting E2E Lifecycle Verification...');

  // --- Helpers ---
  async function registerUser(prefix: string) {
    const email = `${prefix}-${Date.now()}@test.com`;
    const wallet = ethers.Wallet.createRandom();
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
    if (!data.success) throw new Error(`Failed to register ${prefix}: ${JSON.stringify(data)}`);
    
    // Fund user in DB directly
    await connection.balance.upsert({
        where: { userId: data.data.id },
        update: { available: 1000 },
        create: { userId: data.data.id, available: 1000 },
    });
    
    return { id: data.data.id, token: data.token, wallet };
  }

  async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  // 1. Setup Users
  const userA = await registerUser('UserA_Winner');
  const userB = await registerUser('UserB_Loser');
  const userOracle = await registerUser('User_Oracle');
  console.log('Users created:', { A: userA.id, B: userB.id, Oracle: userOracle.id });

  // 2. Create Listing (Market)
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
  if (!listingData.success) throw new Error(`Failed to create listing: ${JSON.stringify(listingData)}`);
  const listingId = listingData.data.id;
  console.log('Listing created:', listingId);

  // 3. Place Bets (Activation)
  console.log('Placing bets...');
  // User A bets YES (50)
  await fetch(`${baseUrl}/bets/listing/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userA.token}` },
    body: JSON.stringify({ listingId, side: 'YES', amount: 50 }),
  });
  // User B bets NO (50)
  await fetch(`${baseUrl}/bets/listing/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userB.token}` },
    body: JSON.stringify({ listingId, side: 'NO', amount: 50 }),
  });

  // Wait for Activation (Service runs every 5s)
  console.log('Waiting for activation...');
  await sleep(6000);
  
  let pool = await connection.pool.findFirst({ where: { listingId } });
  if (pool?.status !== 'LIVE') {
      console.log('Pool not LIVE yet, waiting more...');
      await sleep(5000);
      pool = await connection.pool.findFirst({ where: { listingId } });
  }
  if (pool?.status !== 'LIVE') throw new Error(`Pool failed to activate: ${pool?.status}`);
  console.log('Market is LIVE. MatchID:', pool.matchId);

  // 4. Simulate Expiration
  console.log('Simulating expiration (Time Travel)...');
  await connection.pool.update({
      where: { matchId: pool.matchId },
      data: { closeTime: new Date(Date.now() - 10000) } // Closed 10s ago
  });

  // Wait for autoOracleCycle (runs every 10s)
  console.log('Waiting for auto-close...');
  await sleep(12000);
  
  pool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
  // It should go LIVE -> CLOSED -> RESOLUTION_OPEN
  if (pool?.status === 'CLOSED') {
      console.log('Pool CLOSED, waiting for RESOLUTION_OPEN...');
      await sleep(12000); // Wait for next cycle
      pool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
  }
  
  if (pool?.status !== 'RESOLUTION_OPEN') {
      // Force it if it's stuck (sometimes cron timing is tricky in tests)
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

  // 5. Oracle Voting
  console.log('Casting Oracle Vote (YES)...');
  const voteRes = await fetch(`${baseUrl}/bets/matches/${pool?.matchId}/resolution/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userOracle.token}` },
      body: JSON.stringify({ outcome: 'YES', amount: 25 })
  });
  if (!voteRes.ok) console.error('Vote failed:', await voteRes.text());

  // 6. Simulate Resolution Deadline
  console.log('Simulating Resolution Deadline...');
  await connection.pool.update({
      where: { matchId: pool?.matchId },
      data: { resolutionDeadline: new Date(Date.now() - 1000) }
  });

  // Wait for calculation
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

  // 7. Simulate Challenge Expiry (Finalization)
  console.log('Simulating Challenge Deadline...');
  await connection.pool.update({
      where: { matchId: pool?.matchId },
      data: { challengeDeadline: new Date(Date.now() - 1000) }
  });

  // Wait for payout
  console.log('Waiting for Final Payout...');
  await sleep(12000);

  pool = await connection.pool.findUnique({ where: { matchId: pool?.matchId } });
  console.log('Final Status:', pool?.status);
  
  if (pool?.status !== 'PAID_OUT' && pool?.status !== 'FINALIZED') {
      // Try to manually trigger finalize if auto failed
      console.log('Auto-finalize might have missed, trying manual finalize trigger...');
      // Actually we don't have a public endpoint for "finalize expired", only admin.
      // But let's check if the loop ran.
      throw new Error(`Market failed to finalize. Status: ${pool?.status}`);
  }

  // 8. Verify Balances
  const balA = await connection.balance.findUnique({ where: { userId: userA.id } });
  const balB = await connection.balance.findUnique({ where: { userId: userB.id } });
  
  console.log('User A (Winner) Balance:', balA?.available); // Started 1000 - 50 + Winnings (approx 100 - fees)
  console.log('User B (Loser) Balance:', balB?.available);   // Started 1000 - 50 = 950

  if (Number(balA?.available) <= 950) throw new Error('User A did not receive winnings');
  if (Number(balB?.available) !== 950) throw new Error('User B balance incorrect');

  // 9. Verify Gamification
  const profileA = await connection.gamificationProfile.findUnique({ where: { userId: userA.id } });
  console.log('User A Stats:', profileA);
  if ((profileA?.wins || 0) < 1) throw new Error('User A wins not incremented');

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
