/*
  Warnings:

  - A unique constraint covering the columns `[wallet_address]` on the table `Auth` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `Auth` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Auth` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('buyer', 'seller', 'admin');

-- AlterTable
ALTER TABLE "public"."Auth" ADD COLUMN     "nonce" TEXT,
ADD COLUMN     "role" "public"."Role" NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "wallet_address" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Auth_wallet_address_key" ON "public"."Auth"("wallet_address");
