import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { requireWorkspace } from "../middleware/workspaceMiddleware.js";
import { validate } from "../middleware/validate.js";
import { generateReportSchema } from "../validators/feedbackValidators.js";
import { generateReport, listReports, getReportById } from "../controllers/reportController.js";

const router = express.Router();

router.use(protect, requireWorkspace);

router.get("/", listReports);
router.get("/:id", getReportById);
router.post("/generate", authorize("admin", "analyst"), validate(generateReportSchema), generateReport);

export default router;
