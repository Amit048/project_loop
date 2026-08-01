import Theme, { FeedbackTheme } from "../models/Theme.js";
import Feedback from "../models/Feedback.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/themes — list themes with feedback counts (Day 19)
export const listThemes = asyncHandler(async (req, res) => {
  const themes = await Theme.find({ workspaceId: req.workspaceId }).sort({
    feedbackCount: -1,
  });
  res.json({ success: true, data: { themes } });
});

// GET /api/themes/:id — drill down into underlying feedback items
export const getThemeById = asyncHandler(async (req, res) => {
  const theme = await Theme.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
  if (!theme) {
    return res.status(404).json({ success: false, message: "Theme not found" });
  }

  const links = await FeedbackTheme.find({ themeId: theme._id, workspaceId: req.workspaceId });
  const feedback = await Feedback.find({
    _id: { $in: links.map((l) => l.feedbackId) },
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: { theme, feedback } });
});

// PATCH /api/themes/:id — admin renames/recolors a theme
export const updateTheme = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;
  const theme = await Theme.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.workspaceId },
    { ...(name && { name }), ...(description !== undefined && { description }), ...(color && { color }) },
    { new: true, runValidators: true }
  );
  if (!theme) {
    return res.status(404).json({ success: false, message: "Theme not found" });
  }
  res.json({ success: true, data: { theme } });
});

// POST /api/themes/:id/merge — admin merges a source theme into this one
export const mergeThemes = asyncHandler(async (req, res) => {
  const { sourceThemeId } = req.body;
  const target = await Theme.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
  const source = await Theme.findOne({ _id: sourceThemeId, workspaceId: req.workspaceId });

  if (!target || !source) {
    return res.status(404).json({ success: false, message: "Theme(s) not found" });
  }

  const links = await FeedbackTheme.find({ themeId: source._id });
  for (const link of links) {
    await FeedbackTheme.findOneAndUpdate(
      { feedbackId: link.feedbackId, themeId: target._id },
      { workspaceId: req.workspaceId, confidence: link.confidence },
      { upsert: true }
    );
  }

  target.feedbackCount += source.feedbackCount;
  await target.save();
  await FeedbackTheme.deleteMany({ themeId: source._id });
  await source.deleteOne();

  res.json({ success: true, message: `Merged '${source.name}' into '${target.name}'`, data: { theme: target } });
});
