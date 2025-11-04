-- CreateEnum
CREATE TYPE "public"."status" AS ENUM ('Crypto', 'Sports', 'Politics');

-- CreateTable
CREATE TABLE "public"."Listing" (
    "id" SERIAL NOT NULL,
    "asset_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" DECIMAL(65,30) NOT NULL,
    "status" "public"."status" NOT NULL DEFAULT 'Crypto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);
