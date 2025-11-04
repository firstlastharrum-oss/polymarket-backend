/*
  Warnings:

  - Added the required column `setting` to the `Auth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Auth" ADD COLUMN     "setting" JSONB NOT NULL;
