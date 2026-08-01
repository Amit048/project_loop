import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { requireWorkspace } from "../middleware/workspaceMiddleware.js";
import { listThemes, getThemeById, updateTheme, mergeThemes } from "../controllers/themeController.js";

const router = express.Router();

router.use(protect, requireWorkspace);

router.get("/", listThemes);
router.get("/:id", getThemeById);
router.patch("/:id", authorize("admin", "analyst"), updateTheme);
router.post("/:id/merge", authorize("admin"), mergeThemes);

export default router;
