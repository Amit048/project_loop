import mongoose from "mongoose";

const themeSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 300 },
    color: { type: String, default: "#6C5CE7" },
    feedbackCount: { type: Number, default: 0 }, // denormalized for fast dashboard reads
  },
  { timestamps: true }
);

themeSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Theme = mongoose.model("Theme", themeSchema);

// ─── FeedbackTheme: many-to-many join between Feedback and Theme ───────────
const feedbackThemeSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    feedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feedback",
      required: true,
      index: true,
    },
    themeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theme",
      required: true,
      index: true,
    },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
  },
  { timestamps: true }
);

feedbackThemeSchema.index({ feedbackId: 1, themeId: 1 }, { unique: true });

export const FeedbackTheme = mongoose.model(
  "FeedbackTheme",
  feedbackThemeSchema
);

export default Theme;
