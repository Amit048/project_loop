import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Theme, { FeedbackTheme } from "../models/Theme.js";
import Embedding from "../models/Embedding.js";
import asyncHandler from "../utils/asyncHandler.js";
import { embedText, topKSimilar } from "../services/embeddingService.js";
import { answerFromFeedback } from "../services/aiService.js";

const buildDateMatch = (dateFrom, dateTo) => {
  const match = {};
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }
  return match;
};

// GET /api/insights/summary — stat cards (Day 15/16)
export const getSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, channel } = req.query;
  const workspaceId = new mongoose.Types.ObjectId(req.workspaceId);
  const match = { workspaceId, ...buildDateMatch(dateFrom, dateTo) };
  if (channel) match.channel = channel;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, negative, newThisWeek] = await Promise.all([
    Feedback.countDocuments(match),
    Feedback.countDocuments({ ...match, sentiment: "NEG" }),
    Feedback.countDocuments({ ...match, createdAt: { $gte: weekAgo } }),
  ]);

  res.json({
    success: true,
    data: {
      totalFeedback: total,
      negativePct: total ? Math.round((negative / total) * 100) : 0,
      newThisWeek,
    },
  });
});

// GET /api/insights/volume — volume-over-time chart data (Day 15/16)
export const getVolumeOverTime = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, channel } = req.query;
  const workspaceId = new mongoose.Types.ObjectId(req.workspaceId);
  const match = { workspaceId, ...buildDateMatch(dateFrom, dateTo) };
  if (channel) match.channel = channel;

  const data = await Feedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data: data.map((d) => ({ date: d._id, count: d.count })) });
});

// GET /api/insights/sentiment — sentiment breakdown (Day 15/16)
export const getSentimentBreakdown = asyncHandler(async (req, res) => {
  const workspaceId = new mongoose.Types.ObjectId(req.workspaceId);
  const data = await Feedback.aggregate([
    { $match: { workspaceId } },
    { $group: { _id: "$sentiment", count: { $sum: 1 } } },
  ]);
  res.json({ success: true, data: data.map((d) => ({ sentiment: d._id, count: d.count })) });
});

// GET /api/insights/top-themes — top themes by count (Day 15/16)
export const getTopThemes = asyncHandler(async (req, res) => {
  const themes = await Theme.find({ workspaceId: req.workspaceId })
    .sort({ feedbackCount: -1 })
    .limit(10);
  res.json({ success: true, data: { themes } });
});

// GET /api/insights/trends — theme volume over time + week-over-week spikes (Day 20)
export const getTrends = asyncHandler(async (req, res) => {
  const workspaceId = new mongoose.Types.ObjectId(req.workspaceId);
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const themes = await Theme.find({ workspaceId: req.workspaceId });

  const trends = await Promise.all(
    themes.map(async (theme) => {
      const links = await FeedbackTheme.find({ themeId: theme._id, workspaceId });
      const feedbackIds = links.map((l) => l.feedbackId);

      const [thisWeek, lastWeek] = await Promise.all([
        Feedback.countDocuments({ _id: { $in: feedbackIds }, createdAt: { $gte: weekAgo } }),
        Feedback.countDocuments({
          _id: { $in: feedbackIds },
          createdAt: { $gte: twoWeeksAgo, $lt: weekAgo },
        }),
      ]);

      const deltaPct = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

      return {
        themeId: theme._id,
        name: theme.name,
        totalCount: theme.feedbackCount,
        thisWeek,
        lastWeek,
        deltaPct,
        isSpiking: deltaPct >= 40 && thisWeek >= 3,
      };
    })
  );

  trends.sort((a, b) => b.deltaPct - a.deltaPct);
  res.json({ success: true, data: { trends } });
});

// POST /api/insights/ask — Ask LOOP retrieval-grounded Q&A (Day 22/23)
export const askLoop = asyncHandler(async (req, res) => {
  const { question } = req.body;
  const workspaceId = req.workspaceId;

  const queryVector = await embedText(question);
  const embeddingDocs = await Embedding.find({ workspaceId }).limit(2000);

  if (!embeddingDocs.length) {
    return res.json({
      success: true,
      data: {
        answer: "No feedback has been indexed yet — ingest or classify some feedback first.",
        usedFeedback: [],
      },
    });
  }

  const top = topKSimilar(queryVector, embeddingDocs, 6);
  const feedbackDocs = await Feedback.find({
    _id: { $in: top.map((t) => t.doc.feedbackId) },
  });

  const contextItems = feedbackDocs.map((f) => ({
    id: String(f._id),
    content: f.content,
    sentiment: f.sentiment,
    channel: f.channel,
  }));

  const result = await answerFromFeedback(question, contextItems);
  const usedFeedback = feedbackDocs.filter((f) =>
    (result.usedFeedbackIds || []).includes(String(f._id))
  );

  res.json({
    success: true,
    data: { answer: result.answer, usedFeedback: usedFeedback.length ? usedFeedback : feedbackDocs },
  });
});
