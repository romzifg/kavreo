CREATE TABLE "work_tasks" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "title" TEXT NOT NULL,
 "brief" TEXT NOT NULL,
 "deadline" TIMESTAMP(3) NOT NULL,
 "assignee_id" TEXT NOT NULL,
 "assigner_id" TEXT NOT NULL,
 "content_id" TEXT NOT NULL,
 "started_at" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "work_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "work_tasks_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "work_tasks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "work_tasks_content_id_key" ON "work_tasks"("content_id");
CREATE INDEX "work_tasks_assignee_id_deadline_idx" ON "work_tasks"("assignee_id", "deadline");
CREATE INDEX "work_tasks_assigner_id_deadline_idx" ON "work_tasks"("assigner_id", "deadline");
