import mongoose from "mongoose";

const embeddingSchema = new mongoose.Schema(
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
      unique: true,
    },
    vector: {
      type: [Number],
      required: true,
    },
    model: { type: String, default: "local-hash-embedding-v1" },
  },
  { timestamps: true }
);

embeddingSchema.index({ workspaceId: 1 });

const Embedding = mongoose.model("Embedding", embeddingSchema);

export default Embedding;
