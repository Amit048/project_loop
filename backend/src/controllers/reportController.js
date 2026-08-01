import mongoose from "mongoose";
import Report from "../models/Report.js";
import Feedback from "../models/Feedback.js";
import Theme, { FeedbackTheme } from "../models/Theme.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateReportNarrative } from "../services/aiService.js";

// Pre-compute real numbers in code so the AI only writes prose around facts —
// this is what keeps the report accurate and prevents hallucinated figures.
async function computePeriodStats(workspaceId, periodStart, periodEnd) {
  const wsId = new mongoose.Types.ObjectId(workspaceId);
  const periodMatch = { workspaceId: wsId, createdAt: { $gte: periodStart, $lte: periodEnd } };

  const periodLengthMs = periodEnd - periodStart;
  const prevStart = new Date(periodStart.getTime() - periodLengthMs);
  const prevMatch = { workspaceId: wsId, createdAt: { $gte: prevStart, $lt: periodStart } };

  const [items, prevItems, themes] = await Promise.all([
    Feedback.find(periodMatch),
    Feedback.find(prevMatch),
    Theme.find({ workspaceId }),
  ]);

  const sentimentPct = (list, key) =>
    list.length ? Math.round((list.filter((f) => f.sentiment === key).length / list.length) * 100) : 0;

  const positivePct = sentimentPct(items, "POS");
  const neutralPct = sentimentPct(items, "NEU");
  const negativePct = sentimentPct(items, "NEG");
  const prevNegativePct = sentimentPct(prevItems, "NEG");

  // Top themes within the period, with growth vs previous period
  const themeCounts = {};
  for (const theme of themes) {
    const links = await FeedbackTheme.find({ themeId: theme._id, workspaceId });
    const idsInPeriod = new Set(items.map((i) => String(i._id)));
    const idsPrevPeriod = new Set(prevItems.map((i) => String(i._id)));
    const count = links.filter((l) => idsInPeriod.has(String(l.feedbackId))).length;
    const prevCount = links.filter((l) => idsPrevPeriod.has(String(l.feedbackId))).length;
    if (count > 0) {
      themeCounts[theme.name] = {
        count,
        deltaPct: prevCount === 0 ? 100 : Math.round(((count - prevCount) / prevCount) * 100),
      };
    }
  }
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, v]) => ({ name, count: v.count, deltaPct: v.deltaPct }));

  const notableQuotes = items
    .filter((f) => f.sentiment === "NEG" || f.sentiment === "POS")
    .slice(0, 6)
    .map((f) => ({ quote: f.content.slice(0, 220), channel: f.channel, sentiment: f.sentiment }));

  return {
    itemCount: items.length,
    topThemes,
    sentimentShift: {
      positivePct,
      neutralPct,
      negativePct,
      deltaFromPreviousPeriodPct: negativePct - prevNegativePct,
    },
    notableQuotes,
  };
}

// POST /api/reports/generate (Day 25)
export const generateReport = asyncHandler(async (req, res) => {
  const { periodStart, periodEnd, title } = req.body;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  // "2026-08-01" parses to 2026-08-01T00:00:00.000Z (the very start of that
  // day) — with the original code, a report ending "today" excluded almost
  // all of today's activity, since createdAt <= end cut off at midnight UTC
  // rather than the end of the selected day. Push it to the last instant of
  // that day so the whole end date is actually included.
  end.setUTCHours(23, 59, 59, 999);

  const stats = await computePeriodStats(req.workspaceId, start, end);
  const ai = await generateReportNarrative(stats);

  const report = await Report.create({
    workspaceId: req.workspaceId,
    title: title || `Voice of Customer — ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
    periodStart: start,
    periodEnd: end,
    contentJson: {
      ...stats,
      narrative: ai.narrative,
      recommendedActions: ai.recommendedActions || [],
    },
    generatedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: { report } });
});

// GET /api/reports (Day 26)
export const listReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ workspaceId: req.workspaceId })
    .sort({ createdAt: -1 })
    .populate("generatedBy", "name email");
  res.json({ success: true, data: { reports } });
});

// GET /api/reports/:id (Day 26)
export const getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findOne({
    _id: req.params.id,
    workspaceId: req.workspaceId,
  }).populate("generatedBy", "name email");
  if (!report) {
    return res.status(404).json({ success: false, message: "Report not found" });
  }
  res.json({ success: true, data: { report } });
});