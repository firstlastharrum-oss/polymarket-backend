"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const raw = process.argv[2] || '';
        const addr = String(raw).trim().toLowerCase();
        if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
            console.error('Usage: ts-node scripts/removeAddress.ts <0x...address>');
            process.exit(1);
        }
        const user = await prisma.auth.findFirst({ where: { wallet_address: addr } });
        const upd = await prisma.auth.updateMany({
            where: { wallet_address: addr },
            data: { wallet_address: null },
        });
        const delPos = await prisma.position.deleteMany({
            where: { walletAddress: addr },
        });
        console.log(JSON.stringify({
            success: true,
            userId: user?.id ?? null,
            authUpdated: upd.count,
            positionsDeleted: delPos.count,
            address: addr,
        }, null, 2));
    }
    catch (e) {
        console.error('Error:', e?.message || e);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=removeAddress.js.map