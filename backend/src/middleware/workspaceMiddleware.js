// ─── Workspace Guard ───────────────────────────────────────────────────────
// Ensures the authenticated user belongs to a workspace before allowing
// access to any tenant-owned resource, and exposes req.workspaceId so every
// controller can (and must) scope its queries by it.
//
// Non-negotiable rule: every DB query touching Feedback, Theme, Report, or
// Embedding must filter by req.workspaceId. A user must never be able to
// read another workspace's rows, even by guessing an ID in the URL.
export const requireWorkspace = (req, res, next) => {
  if (!req.user?.workspaceId) {
    return res.status(403).json({
      success: false,
      message: "You must belong to a workspace to perform this action",
    });
  }
  req.workspaceId = req.user.workspaceId;
  next();
};

export default requireWorkspace;
