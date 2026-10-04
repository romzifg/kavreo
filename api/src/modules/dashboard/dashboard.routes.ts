import { Router } from "express";
import { currentUser } from "../../common/utils";
import { getDashboard } from "./dashboard.service";

export const dashboardRoutes = Router();

dashboardRoutes.get("/", async (req, res) => {
	res.json({ data: await getDashboard(currentUser(req)) });
});
