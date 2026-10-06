import { Router } from "express";
import { authenticate } from "./common/middleware/auth";
import { authRoutes } from "./modules/auth/auth.routes";
import { calendarRoutes } from "./modules/calendars/calendar.routes";
import { contentRoutes } from "./modules/contents/content.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { notificationRoutes } from "./modules/notifications/notification.routes";
import { userRoutes } from "./modules/users/user.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { aiRoutes } from "./modules/ai/ai.routes";
import { taskRoutes } from "./modules/tasks/task.routes";

export const routes = Router();

routes.use("/auth", authRoutes);

// Semua route di bawah ini wajib login
routes.use(authenticate);
routes.use("/dashboard", dashboardRoutes);
routes.use("/contents", contentRoutes);
routes.use("/calendars", calendarRoutes);
routes.use("/notifications", notificationRoutes);
routes.use("/users", userRoutes);
routes.use("/settings", settingsRoutes);
routes.use("/ai", aiRoutes);
routes.use("/tasks", taskRoutes);
