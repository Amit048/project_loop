
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Workspace from "../src/models/Workspace.js";
import Feedback from "../src/models/Feedback.js";
import Theme, { FeedbackTheme } from "../src/models/Theme.js";
import { SAMPLE_CHANNEL_FEEDBACK } from "../src/utils/sampleFeedback.js";

dotenv.config();

const Common_Password = "Bhanushali";

async function seed() {
  await connectDB();
  console.log("🌱 Seeding Project LOOP demo data...");

  await Promise.all([
    Workspace.deleteMany({ slug: /^loop-demo/ }),
    User.deleteMany({ email: { $in: ["amitbhanushali@gmail.com", "analyst@amitbhanushali.com", "viewer@amitbhanushali.com"] } }),
  ]);

  const admin = await User.create({
    name: "Amit Admin",
    email: "amitbhanushali@gmail.com",
    password: Common_Password,
    role: "admin",
  });

  const workspace = await Workspace.create({
    name: "LOOP Demo Workspace",
    slug: "loop-demo-" + Date.now(),
    owner: admin._id,
  });

  admin.workspaceId = workspace._id;
  await admin.save();

  await User.create({
    name: "Alex Analyst",
    email: "analyst@amitbhanushali.com",
    password: Common_Password,
    role: "analyst",
    workspaceId: workspace._id,
  });

  await User.create({
    name: "Vic Viewer",
    email: "viewer@amitbhanushali.com",
    password: Common_Password,
    role: "viewer",
    workspaceId: workspace._id,
  });

  const themeCache = {};
  const getOrCreateTheme = async (name) => {
    if (themeCache[name]) return themeCache[name];
    const theme = await Theme.create({ workspaceId: workspace._id, name });
    themeCache[name] = theme;
    return theme;
  };

  const heuristicTag = (text) => {
    const lower = text.toLowerCase();
    let sentiment = "NEU";
    if (/(love|great|gorgeous|impressed|best|nice|huge improvement|magic|shoutout)/.test(lower)) sentiment = "POS";
    if (/(fail|frustrat|broken|crash|error|disappoint|risk|slow|timeout|confus|too expensive|blocker)/.test(lower)) sentiment = "NEG";

    let theme = "General Feedback";
    if (/(onboard|invite|setup)/.test(lower)) theme = "Onboarding";
    else if (/(slow|fast|load|performance|timeout|speed)/.test(lower)) theme = "Performance";
    else if (/(sso|login|auth|password|2fa|two-factor)/.test(lower)) theme = "Authentication";
    else if (/(mobile|app crash|ios|app froze)/.test(lower)) theme = "Mobile Experience";
    else if (/(price|pricing|expensive|upsell|renewal)/.test(lower)) theme = "Pricing";
    else if (/(report|export|pdf|dashboard|chart)/.test(lower)) theme = "Reporting & Analytics";
    else if (/(ask loop|ai|classif)/.test(lower)) theme = "AI Features";
    else if (/(integration|slack|zapier|salesforce|webhook|api)/.test(lower)) theme = "Integrations";
    else if (/(support|ticket|response time)/.test(lower)) theme = "Customer Support";

    return { sentiment, theme };
  };

  let totalSeeded = 0;
  const feedbackDocs = [];

  for (const [channel, items] of Object.entries(SAMPLE_CHANNEL_FEEDBACK)) {
    for (const item of items) {
      const { sentiment, theme } = heuristicTag(item.content);
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const doc = await Feedback.create({
        workspaceId: workspace._id,
        content: item.content,
        channel,
        customerLabel: item.customerLabel || "",
        sentiment,
        sentimentScore: sentiment === "POS" ? 0.7 : sentiment === "NEG" ? -0.6 : 0,
        featureArea: theme,
        classifiedAt: new Date(),
        status: ["NEW", "REVIEWED", "ACTIONED"][Math.floor(Math.random() * 3)],
        createdAt,
        ingestedBy: admin._id,
      });
      // createdAt is protected by timestamps; force it for realistic history
      doc.createdAt = createdAt;
      await doc.save();

      const themeDoc = await getOrCreateTheme(theme);
      await FeedbackTheme.create({ workspaceId: workspace._id, feedbackId: doc._id, themeId: themeDoc._id, confidence: 0.9 });
      themeDoc.feedbackCount += 1;
      await themeDoc.save();

      feedbackDocs.push(doc);
      totalSeeded += 1;
    }
  }

  workspace.themeSeedList = Object.keys(themeCache);
  await workspace.save();


  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});