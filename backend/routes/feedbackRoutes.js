import express from "express";
import {
  getMyFeedback,
  getMyFeedbackSummary,
  submitFeedback
} from "../controllers/feedbackController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadAudio } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRoles("employee"),
  uploadAudio.single("audio"),
  submitFeedback
);

router.get("/my", authenticateToken, authorizeRoles("employee"), getMyFeedback);
router.get("/my/summary", authenticateToken, authorizeRoles("employee"), getMyFeedbackSummary);

export default router;
