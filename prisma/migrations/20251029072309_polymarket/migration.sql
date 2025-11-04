-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('buyer', 'seller', 'admin');

-- CreateTable
CREATE TABLE "public"."Auth" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'buyer',
    "nonce" TEXT,
    "setting" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auth_pkey" PRIMARY KEY ("id")
);
