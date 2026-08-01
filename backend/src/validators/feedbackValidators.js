import Joi from "joi";

export const CHANNELS = [
  "support_ticket",
  "app_store_review",
  "nps_survey",
  "sales_call_note",
  "social_mention",
  "manual",
];

export const createFeedbackSchema = Joi.object({
  content: Joi.string().trim().min(3).max(5000).required(),
  channel: Joi.string()
    .valid(...CHANNELS)
    .default("manual"),
  sourceRef: Joi.string().allow("").default(""),
  customerLabel: Joi.string().allow("").default(""),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid("NEW", "REVIEWED", "ACTIONED").required(),
});

export const listFeedbackQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow("").default(""),
  channel: Joi.string()
    .valid(...CHANNELS)
    .allow(""),
  sentiment: Joi.string().valid("POS", "NEU", "NEG", "UNCLASSIFIED").allow(""),
  status: Joi.string().valid("NEW", "REVIEWED", "ACTIONED").allow(""),
  themeId: Joi.string().allow(""),
  dateFrom: Joi.date().allow(""),
  dateTo: Joi.date().allow(""),
});

export const askLoopSchema = Joi.object({
  question: Joi.string().trim().min(3).max(500).required(),
});

export const generateReportSchema = Joi.object({
  periodStart: Joi.date().required(),
  periodEnd: Joi.date().greater(Joi.ref("periodStart")).required(),
  title: Joi.string().allow(""),
});
