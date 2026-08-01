import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { requireWorkspace } from "../middleware/workspaceMiddleware.js";
import {
  getWorkspace,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.use(protect, requireWorkspace);

router.get("/", getWorkspace);
router.get("/members", listMembers);

// Admin-only member management
router.post("/invite", authorize("admin"), inviteMember);
router.patch("/members/:id/role", authorize("admin"), updateMemberRole);
router.delete("/members/:id", authorize("admin"), removeMember);

export default router;
