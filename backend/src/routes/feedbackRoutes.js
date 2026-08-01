import express from "express";
import multer from "multer";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { requireWorkspace } from "../middleware/workspaceMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createFeedbackSchema,
  updateStatusSchema,
  listFeedbackQuerySchema,
} from "../validators/feedbackValidators.js";
import {
  createFeedback,
  listFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  reclassifyFeedback,
  reclassifyAllUnclassified,
  bulkUploadFeedback,
  simulateChannel,
} from "../controllers/feedbackController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
      return cb(new Error("Only .csv files are allowed"));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.use(protect, requireWorkspace);

router.get("/", validate(listFeedbackQuerySchema, "query"), listFeedback);
router.get("/:id", getFeedbackById);

// Analysts and admins can ingest/manage; viewers are read-only (C2)
router.post("/", authorize("admin", "analyst"), validate(createFeedbackSchema), createFeedback);
router.patch("/:id/status", authorize("admin", "analyst"), validate(updateStatusSchema), updateFeedbackStatus);
router.post("/:id/reclassify", authorize("admin", "analyst"), reclassifyFeedback);
router.post("/reclassify-all", authorize("admin", "analyst"), reclassifyAllUnclassified);
router.post("/bulk-upload", authorize("admin", "analyst"), upload.single("file"), bulkUploadFeedback);
router.post("/simulate-channel", authorize("admin", "analyst"), simulateChannel);

export default router;
