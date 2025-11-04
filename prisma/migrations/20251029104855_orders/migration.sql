/*
  Warnings:

  - You are about to drop the column `nonce` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `setting` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_address` on the `Auth` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - The `status` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `email` on table `Auth` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `Auth` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `seller_id` on the `Listing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('Crypto', 'Sports', 'Politics');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- DropIndex
DROP INDEX "public"."Auth_wallet_address_key";

-- AlterTable
ALTER TABLE "public"."Auth" DROP COLUMN "nonce",
DROP COLUMN "role",
DROP COLUMN "setting",
DROP COLUMN "username",
DROP COLUMN "wallet_address",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Listing" DROP COLUMN "seller_id",
ADD COLUMN     "seller_id" INTEGER NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "currency" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'Crypto';

-- DropEnum
DROP TYPE "public"."Role";

-- DropEnum
DROP TYPE "public"."status";

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" SERIAL NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "listingId" INTEGER,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Listing" ADD CONSTRAINT "Listing_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "public"."Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
