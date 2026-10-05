ALTER TABLE "application_settings"
 ADD COLUMN "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "ai_protocol" TEXT NOT NULL DEFAULT 'OLLAMA',
 ADD COLUMN "ai_provider_name" TEXT NOT NULL DEFAULT 'Ollama lokal',
 ADD COLUMN "ai_base_url" TEXT NOT NULL DEFAULT 'http://localhost:11434',
 ADD COLUMN "ai_model" TEXT NOT NULL DEFAULT 'llama3:latest',
 ADD COLUMN "ai_api_key" TEXT,
 ADD COLUMN "ai_max_tokens" INTEGER NOT NULL DEFAULT 800,
 ADD COLUMN "ai_daily_limit" INTEGER NOT NULL DEFAULT 20,
 ADD COLUMN "ai_timeout_sec" INTEGER NOT NULL DEFAULT 180,
 ADD COLUMN "ai_input_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
 ADD COLUMN "ai_output_price" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "ai_usage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "feature" TEXT NOT NULL,
 "provider" TEXT NOT NULL,
 "model" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "input_tokens" INTEGER,
 "output_tokens" INTEGER,
 "cost_usd" DOUBLE PRECISION,
 "duration_ms" INTEGER,
 "error_code" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage"("user_id", "created_at");
CREATE INDEX "ai_usage_created_at_status_idx" ON "ai_usage"("created_at", "status");
