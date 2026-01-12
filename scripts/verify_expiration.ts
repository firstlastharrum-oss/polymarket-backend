
import { PrismaClient } from '@prisma/client';
import { PoolStatus } from '../generated/prisma';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new PrismaClient();

async function main() {
  console.log('Starting Expiration Verification...');

  const baseUrl = 'http://localhost:5000';
  
  // Create User
  const email = `testuser_exp${Date.now()}@test.com`;
  const wallet = ethers.Wallet.createRandom();
  const userRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password: 'password123', 
        username: `testuser_exp${Date.now()}`,
        wallet_address: wallet.address,
        role: 'buyer',
        setting: { 
            kyc: {
                fullName: 'Test User',
                country: 'US',
                idType: 'passport',
                idNumber: `E${Date.now().toString().slice(-8)}`,
                consent: true,
                reference: 'test-ref'
            }
        }
      }),
  });
  const userData = await userRes.json();
  if (!userData.success) {
    console.error('Failed to create user:', userData);
    process.exit(1);
  }
  
  const user = await connection.auth.findUnique({ where: { email } });
  if (!user) throw new Error('User not found in DB');
  const userId = user.id;
  const token = userData.token;
  
  // Fund User
  await connection.balance.upsert({
      where: { userId },
      update: { available: 1000 },
      create: { userId, available: 1000 },
  });
  console.log('User funded (1000)');

  // Create Listing
  const listingRes = await fetch(`${baseUrl}/listing/create`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
          title: `Expiration Test Market ${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          description: 'Will this market expire?',
          category: 'Technology',
          price: 100,
          currency: 'USD'
      }),
  });
  const listingData = await listingRes.json();
  if (!listingData.success) {
      console.error('Failed to create listing:', listingData);
      process.exit(1);
  }
  const listingId = listingData.data.id;
  console.log('Listing created:', listingId);

  // Place Bet on YES (Pending State)
  console.log('Placing YES bet (50)...');
  const betRes1 = await fetch(`${baseUrl}/bets/listing/place`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
          listingId,
          side: 'YES',
          amount: 50
      }),
  });
  
  if (!betRes1.ok) {
      console.error('Failed to place YES bet:', await betRes1.text());
      process.exit(1);
  }

  // Verify Balance Deduction
  let balance = await connection.balance.findUnique({ where: { userId } });
  console.log('Balance after bet:', balance?.available.toNumber());
  if (balance?.available.toNumber() !== 950) {
      console.error('Balance mismatch, expected 950');
      process.exit(1);
  }

  // Manually update Pool createdAt to 2 hours ago
  const pool = await connection.pool.findFirst({ where: { listingId } });
  if (!pool) throw new Error('Pool not found');
  
  // Update using matchId as the unique identifier
  await connection.pool.update({
      where: { matchId: pool.matchId },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
  });
  console.log('Pool createdAt set to 2 hours ago. Waiting for expiration (65s)...');

  // Wait for interval
  await new Promise(r => setTimeout(r, 65000));

  // Check Status
  const updatedPool = await connection.pool.findUnique({ where: { matchId: pool.matchId } });
  console.log('Pool Status after wait:', updatedPool?.status);

  if (String(updatedPool?.status) !== 'CANCELLED') {
      console.error('Expected status CANCELLED, got', updatedPool?.status);
      process.exit(1);
  }

  // Check Refund
  balance = await connection.balance.findUnique({ where: { userId } });
  console.log('Balance after expiration:', balance?.available.toNumber());
  if (balance?.available.toNumber() !== 1000) {
      console.error('Refund failed, expected 1000');
      process.exit(1);
  }

  console.log('Expiration Verification Passed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await connection.$disconnect();
  });
