import mongoose from "mongoose";

// ─── Workspace: the tenant root. Every piece of data in the app is scoped ────
// ─── to a workspaceId so that Company A can never see Company B's data.  ─────
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },

    themeSeedList: {
      // cached list of theme names, sent to the AI classifier so it reuses
      // existing themes instead of inventing near-duplicates every call
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

workspaceSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug =
      this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 7);
  }
});

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
