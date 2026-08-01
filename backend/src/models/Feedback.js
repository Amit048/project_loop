import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: [true, "Feedback content is required"],
      trim: true,
      maxlength: 5000,
    },

    channel: {
      type: String,
      enum: [
        "support_ticket",
        "app_store_review",
        "nps_survey",
        "sales_call_note",
        "social_mention",
        "manual",
      ],
      required: true,
    },

    sourceRef: { type: String, default: "" }, // e.g. ticket id, review id
    customerLabel: { type: String, default: "" }, // e.g. company / user name

    // ─── AI classification output (Day 18) ──────────────────────────────
    sentiment: {
      type: String,
      enum: ["POS", "NEU", "NEG", "UNCLASSIFIED"],
      default: "UNCLASSIFIED",
    },
    sentimentScore: { type: Number, min: -1, max: 1, default: 0 },
    featureArea: { type: String, default: "" },
    classificationRationale: { type: String, default: "" },
    classifiedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["NEW", "REVIEWED", "ACTIONED"],
      default: "NEW",
      index: true,
    },

    ingestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Full-text search across content + customer label
feedbackSchema.index({ content: "text", customerLabel: "text" });

// Common query shapes: list by workspace, filtered by status/channel/date
feedbackSchema.index({ workspaceId: 1, createdAt: -1 });
feedbackSchema.index({ workspaceId: 1, status: 1 });
feedbackSchema.index({ workspaceId: 1, channel: 1 });
feedbackSchema.index({ workspaceId: 1, sentiment: 1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
