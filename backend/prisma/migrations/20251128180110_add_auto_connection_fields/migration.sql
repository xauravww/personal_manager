/*
  Warnings:

  - Added the required column `updated_at` to the `knowledge_connections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "knowledge_connections" ADD COLUMN     "auto_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_deleted" BOOLEAN NOT NULL DEFAULT false;
