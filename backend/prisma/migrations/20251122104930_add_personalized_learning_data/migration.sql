-- AlterTable
ALTER TABLE "learning_modules" ADD COLUMN "checkpoints" TEXT;

-- AlterTable
ALTER TABLE "learning_progress" ADD COLUMN "chat_history" TEXT;
ALTER TABLE "learning_progress" ADD COLUMN "checkpoints_progress" TEXT;
ALTER TABLE "learning_progress" ADD COLUMN "code_snippets" TEXT;
ALTER TABLE "learning_progress" ADD COLUMN "identified_weaknesses" TEXT;
ALTER TABLE "learning_progress" ADD COLUMN "key_learnings" TEXT;
ALTER TABLE "learning_progress" ADD COLUMN "quiz_attempts" TEXT;
