import express from "express";
import {
  getDashboard,
  getEmployeeInsights,
  getFeedbackExplorer,
  getTrend
} from "../controllers/adminController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/dashboard", authenticateToken, authorizeRoles("admin"), getDashboard);
router.get("/trend", authenticateToken, authorizeRoles("admin"), getTrend);
router.get("/employees", authenticateToken, authorizeRoles("admin"), getEmployeeInsights);
router.get("/feedback", authenticateToken, authorizeRoles("admin"), getFeedbackExplorer);

export default router;
