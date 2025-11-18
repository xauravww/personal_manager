-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN "steps_progress" TEXT;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN "ai_config" TEXT;
ALTER TABLE "assignments" ADD COLUMN "modalities" TEXT;
ALTER TABLE "assignments" ADD COLUMN "steps" TEXT;

-- CreateTable
CREATE TABLE "user_learning_dna" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "learning_dna" TEXT NOT NULL,
    "last_updated" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_learning_dna_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_dna_user_id_key" ON "user_learning_dna"("user_id");
