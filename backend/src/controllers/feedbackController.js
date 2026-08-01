import Feedback from "../models/Feedback.js";
import Theme, { FeedbackTheme } from "../models/Theme.js";
import Workspace from "../models/Workspace.js";
import Embedding from "../models/Embedding.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseFeedbackCsv } from "../services/csvService.js";
import { classifyFeedback } from "../services/aiService.js";
import { embedText } from "../services/embeddingService.js";
import { SAMPLE_CHANNEL_FEEDBACK } from "../utils/sampleFeedback.js";

export const classifyAndIndex = async (feedbackDoc, workspaceId) => {
  const workspace = await Workspace.findById(workspaceId);
  const result = await classifyFeedback(
    feedbackDoc.content,
    workspace?.themeSeedList || []
  );

  feedbackDoc.sentiment = result.sentiment;
  feedbackDoc.sentimentScore = result.sentimentScore;
  feedbackDoc.featureArea = result.featureArea;
  feedbackDoc.classificationRationale = result.rationale;
  feedbackDoc.classifiedAt = new Date();
  await feedbackDoc.save();

  // Assign / create themes (Day 19)
  const themeNames = (result.themes || []).slice(0, 3);
  const themeIds = [];
  for (const name of themeNames) {
    if (!name) continue;
    let theme = await Theme.findOne({ workspaceId, name });
    if (!theme) {
      theme = await Theme.create({ workspaceId, name });
      await Workspace.findByIdAndUpdate(workspaceId, {
        $addToSet: { themeSeedList: name },
      });
    }
    await FeedbackTheme.findOneAndUpdate(
      { feedbackId: feedbackDoc._id, themeId: theme._id },
      { workspaceId, confidence: 0.85 },
      { upsert: true, new: true }
    );
    theme.feedbackCount += 1;
    await theme.save();
    themeIds.push(theme._id);
  }

  try {
    const vector = await embedText(feedbackDoc.content);
    await Embedding.findOneAndUpdate(
      { feedbackId: feedbackDoc._id },
      { workspaceId, vector },
      { upsert: true }
    );
  } catch (err) {
    console.error("Embedding generation failed:", err.message);
  }

  return { ...result, themeIds };
};

// POST /api/feedback/reclassify-all — backfill classification for anything
// saved as UNCLASSIFIED (e.g. added while the Anthropic key wasn't working
// yet). Runs sequentially and capped per call to stay within API rate limits;
// call again to continue if you have more than the cap.
export const reclassifyAllUnclassified = asyncHandler(async (req, res) => {
  const BATCH_CAP = 50;
  const pending = await Feedback.find({
    workspaceId: req.workspaceId,
    sentiment: "UNCLASSIFIED",
  }).limit(BATCH_CAP);

  let succeeded = 0;
  let stillFailed = 0;

  for (const doc of pending) {
    try {
      const result = await classifyAndIndex(doc, req.workspaceId);
      if (result.sentiment && result.sentiment !== "UNCLASSIFIED") succeeded += 1;
      else stillFailed += 1;
    } catch (err) {
      stillFailed += 1;
    }
  }

  res.json({
    success: true,
    message: `Reclassified ${succeeded}/${pending.length} item(s)${
      pending.length === BATCH_CAP ? " (more may remain — run again)" : ""
    }`,
    data: { attempted: pending.length, succeeded, stillFailed },
  });
});

export const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.create({
    ...req.body,
    workspaceId: req.workspaceId,
    ingestedBy: req.user._id,
  });

  // Fire-and-forget AI classification so the create call stays fast
  classifyAndIndex(feedback, req.workspaceId).catch((err) =>
    console.error("classifyAndIndex failed:", err.message)
  );

  res.status(201).json({ success: true, data: { feedback } });
});

export const listFeedback = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    channel,
    sentiment,
    status,
    themeId,
    dateFrom,
    dateTo,
  } = req.validatedQuery;

  const query = { workspaceId: req.workspaceId };
  if (channel) query.channel = channel;
  if (sentiment) query.sentiment = sentiment;
  if (status) query.status = status;
  if (search) query.$text = { $search: search };
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  if (themeId) {
    const links = await FeedbackTheme.find({ workspaceId: req.workspaceId, themeId }).select(
      "feedbackId"
    );
    query._id = { $in: links.map((l) => l.feedbackId) };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Feedback.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/feedback/:id
export const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOne({
    _id: req.params.id,
    workspaceId: req.workspaceId, // tenant isolation
  });
  if (!feedback) {
    return res.status(404).json({ success: false, message: "Feedback not found" });
  }
  const themeLinks = await FeedbackTheme.find({ feedbackId: feedback._id }).populate("themeId");
  res.json({ success: true, data: { feedback, themes: themeLinks.map((l) => l.themeId) } });
});

// PATCH /api/feedback/:id/status  — status workflow (Day 12)
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOneAndUpdate(
    { _id: req.params.id, workspaceId: req.workspaceId },
    { status: req.body.status },
    { new: true }
  );
  if (!feedback) {
    return res.status(404).json({ success: false, message: "Feedback not found" });
  }
  res.json({ success: true, data: { feedback } });
});

// POST /api/feedback/:id/reclassify  — manual re-classify (Day 18)
export const reclassifyFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOne({
    _id: req.params.id,
    workspaceId: req.workspaceId,
  });
  if (!feedback) {
    return res.status(404).json({ success: false, message: "Feedback not found" });
  }
  const result = await classifyAndIndex(feedback, req.workspaceId);
  res.json({ success: true, message: "Re-classified", data: { feedback, result } });
});

// POST /api/feedback/bulk-upload  — CSV import (Day 10/11)
export const bulkUploadFeedback = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "CSV file is required" });
  }

  const { validRows, failedRows, totalRows } = await parseFeedbackCsv(req.file.buffer);

  const docs = await Feedback.insertMany(
    validRows.map((row) => ({
      ...row,
      workspaceId: req.workspaceId,
      ingestedBy: req.user._id,
    })),
    { ordered: false }
  );

  // Classify in the background, capped to avoid hammering the AI API on huge files
  docs.slice(0, 50).forEach((doc) => {
    classifyAndIndex(doc, req.workspaceId).catch((err) =>
      console.error("bulk classify failed:", err.message)
    );
  });

  res.status(201).json({
    success: true,
    message: `Imported ${docs.length}/${totalRows} rows`,
    data: {
      importedCount: docs.length,
      failedCount: failedRows.length,
      totalRows,
      failedRows,
    },
  });
});

// POST /api/feedback/simulate-channel  — seeds realistic feedback (Day 11)
export const simulateChannel = asyncHandler(async (req, res) => {
  const { channel = "app_store_review", count = 15 } = req.body;
  const pool = SAMPLE_CHANNEL_FEEDBACK[channel] || SAMPLE_CHANNEL_FEEDBACK.support_ticket;

  const rows = Array.from({ length: Math.min(count, pool.length) }, (_, i) => ({
    content: pool[i].content,
    channel,
    customerLabel: pool[i].customerLabel || "",
    workspaceId: req.workspaceId,
    ingestedBy: req.user._id,
  }));

  const docs = await Feedback.insertMany(rows);
  docs.forEach((doc) =>
    classifyAndIndex(doc, req.workspaceId).catch((err) =>
      console.error("simulate classify failed:", err.message)
    )
  );

  res.status(201).json({
    success: true,
    message: `Simulated ${docs.length} items from ${channel}`,
    data: { importedCount: docs.length },
  });
});
