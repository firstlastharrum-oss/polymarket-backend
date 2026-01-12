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
async function main() {
    console.log('Starting Admin Visibility Verification...');
    const baseUrl = 'http://localhost:5000';
    const adminEmail = `admin_test${Date.now()}@test.com`;
    const adminWallet = ethers_1.ethers.Wallet.createRandom();
    const adminRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: adminEmail,
            password: 'password123',
            username: `admin_test${Date.now()}`,
            wallet_address: adminWallet.address,
            role: 'admin',
            setting: {
                kyc: {
                    fullName: 'Admin User',
                    country: 'US',
                    idType: 'passport',
                    idNumber: `A${Date.now().toString().slice(-8)}`,
                    consent: true,
                    reference: 'admin-ref'
                }
            }
        }),
    });
    const adminData = await adminRes.json();
    if (!adminData.success) {
        console.error('Failed to create admin:', adminData);
        process.exit(1);
    }
    const adminUser = await connection.auth.findUnique({ where: { email: adminEmail } });
    if (!adminUser)
        throw new Error('Admin not found in DB');
    const adminId = adminUser.id;
    const adminToken = adminData.token;
    console.log('Admin created:', adminId);
    await connection.balance.upsert({
        where: { userId: adminId },
        update: { available: 2000 },
        create: { userId: adminId, available: 2000 },
    });
    const listingRes = await fetch(`${baseUrl}/listing/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            title: `Unique Admin Market ${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            description: `Will the admin see the pending market by Jan 2026? Resolution based on official platform logs. Ref: ${Date.now()}`,
            category: 'Politics',
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
    const bet1 = await connection.bet.findUnique({ where: { id: 1 } });
    if (bet1) {
        await connection.bet.update({
            where: { id: 1 },
            data: {
                aiScore: 90,
                ethicsVerdict: 'APPROVED'
            }
        });
        console.log('Updated Bet 1 with High AI Score');
    }
    else {
        await connection.bet.create({
            data: {
                id: 1,
                creatorId: adminId,
                title: 'Base Bet',
                description: 'Base',
                category: 'General',
                options: {},
                status: 'ACTIVE',
                ethicsVerdict: 'APPROVED',
                aiScore: 90,
                endDate: new Date(),
                probabilityTag: 'MEDIUM_PROBABILITY'
            }
        });
        console.log('Created Bet 1 with High AI Score');
    }
    console.log('Placing YES bet (100)...');
    await fetch(`${baseUrl}/bets/listing/place`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            listingId,
            side: 'YES',
            amount: 100
        }),
    });
    const detailsRes1 = await fetch(`${baseUrl}/bets/listing/${listingId}/admin?userId=${adminId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const details1 = await detailsRes1.json();
    if (!details1.success) {
        console.error('Failed to get admin details:', details1);
        process.exit(1);
    }
    console.log('Phase 1 Status:', details1.status);
    console.log('Phase 1 Deployed:', details1.deploymentStatus.isDeployed);
    console.log('Phase 1 Blockers:', details1.deploymentStatus.blockers);
    if (details1.status !== 'PENDING') {
        console.error('Expected PENDING status');
        process.exit(1);
    }
    if (details1.deploymentStatus.isDeployed) {
        console.error('Expected NOT deployed');
        process.exit(1);
    }
    if (!details1.deploymentStatus.blockers.includes('Missing NO liquidity')) {
        console.error('Expected Missing NO liquidity blocker');
        process.exit(1);
    }
    console.log('Placing NO bet (100)...');
    await fetch(`${baseUrl}/bets/listing/place`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            listingId,
            side: 'NO',
            amount: 100
        }),
    });
    console.log('Waiting for activation (10s)...');
    await new Promise(r => setTimeout(r, 10000));
    const detailsRes2 = await fetch(`${baseUrl}/bets/listing/${listingId}/admin?userId=${adminId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const details2 = await detailsRes2.json();
    console.log('Phase 2 Status:', details2.status);
    console.log('Phase 2 Deployed:', details2.deploymentStatus.isDeployed);
    if (details2.deploymentStatus.isDeployed) {
        console.log('Market Successfully Deployed!');
    }
    else {
        console.warn('Market NOT Deployed yet. Check backend logs for activation errors.');
    }
    console.log('Admin Visibility Verification Completed');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await connection.$disconnect();
});
//# sourceMappingURL=verify_admin_visibility.js.map