import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireWorkspace } from "../middleware/workspaceMiddleware.js";
import { validate } from "../middleware/validate.js";
import { askLoopSchema } from "../validators/feedbackValidators.js";
import {
  getSummary,
  getVolumeOverTime,
  getSentimentBreakdown,
  getTopThemes,
  getTrends,
  askLoop,
} from "../controllers/insightsController.js";

const router = express.Router();

router.use(protect, requireWorkspace);

router.get("/summary", getSummary);
router.get("/volume", getVolumeOverTime);
router.get("/sentiment", getSentimentBreakdown);
router.get("/top-themes", getTopThemes);
router.get("/trends", getTrends);
router.post("/ask", validate(askLoopSchema), askLoop);

export default router;
