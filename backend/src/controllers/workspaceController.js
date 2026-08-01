import crypto from "crypto";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/workspace  — current workspace details
export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.workspaceId);
  if (!workspace) {
    return res
      .status(404)
      .json({ success: false, message: "Workspace not found" });
  }
  res.json({ success: true, data: { workspace } });
});

// GET /api/workspace/members  — list all members of the current workspace
export const listMembers = asyncHandler(async (req, res) => {
  const members = await User.find({ workspaceId: req.workspaceId }).select(
    "-refreshTokens"
  );
  res.json({ success: true, data: { members } });
});

// POST /api/workspace/invite  — admin invites a teammate by email + role
// If the user already exists (e.g. signed up separately) they are attached
// to this workspace; otherwise a placeholder account with a temp password
// is created so the flow works without an email-delivery integration.
export const inviteMember = asyncHandler(async (req, res) => {
  const { email, name, role = "analyst" } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }
  if (!["admin", "analyst", "viewer"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  let member = await User.findOne({ email });
  let tempPassword = null;

  if (member) {
    if (member.workspaceId && String(member.workspaceId) !== String(req.workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "This user already belongs to another workspace",
      });
    }
    member.workspaceId = req.workspaceId;
    member.role = role;
    await member.save({ validateBeforeSave: false });
  } else {
    tempPassword = crypto.randomBytes(9).toString("base64url");
    member = await User.create({
      name: name || email.split("@")[0],
      email,
      password: tempPassword,
      role,
      workspaceId: req.workspaceId,
    });
    // Dev/demo note: in production this temp password would be emailed via
    // nodemailer (already a dependency) instead of returned in the API
    // response. Returning it here is what makes the invited account usable
    // right now — without it, the account exists but nobody knows its password.
  }

  res.status(201).json({
    success: true,
    message: tempPassword
      ? `✅ ${member.email} added as ${role}. Share the temporary password below with them — it will not be shown again.`
      : `✅ ${member.email} added as ${role}`,
    data: { member, tempPassword },
  });
});

// PATCH /api/workspace/members/:id/role  — admin changes a member's role
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["admin", "analyst", "viewer"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const member = await User.findOne({
    _id: req.params.id,
    workspaceId: req.workspaceId, // tenant isolation: can't touch another workspace's user
  });

  if (!member) {
    return res.status(404).json({ success: false, message: "Member not found" });
  }

  member.role = role;
  await member.save({ validateBeforeSave: false });

  res.json({ success: true, message: "Role updated", data: { member } });
});

// DELETE /api/workspace/members/:id  — remove a member from the workspace
export const removeMember = asyncHandler(async (req, res) => {
  const member = await User.findOne({
    _id: req.params.id,
    workspaceId: req.workspaceId,
  });

  if (!member) {
    return res.status(404).json({ success: false, message: "Member not found" });
  }
  if (String(member._id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot remove yourself from the workspace",
    });
  }

  member.workspaceId = null;
  member.role = "viewer";
  await member.save({ validateBeforeSave: false });

  res.json({ success: true, message: "Member removed from workspace" });
});
