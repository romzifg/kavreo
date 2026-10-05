CREATE TABLE "application_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "approval_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "application_settings" ("id", "approval_enabled", "updated_at")
VALUES ('global', true, CURRENT_TIMESTAMP);
