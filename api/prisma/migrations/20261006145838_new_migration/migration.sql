-- DropForeignKey
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_user_id_fkey";

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
