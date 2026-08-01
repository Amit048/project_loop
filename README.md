# Project LOOP

Project LOOP is a customer-feedback intelligence tool: it ingests feedback from
multiple channels, uses AI to classify sentiment and extract recurring
themes, tracks how those themes trend week over week, lets you ask natural
language questions grounded in your own feedback data, and generates
AI-written Voice-of-Customer reports — all scoped per-workspace with
role-based team access.

---

## 1. Tech stack

| Layer | Stack |
|---|---|
| Frontend | React + Vite, Tailwind CSS v4, Zustand (state), React Router, Axios |
| Backend | Node.js (ESM), Express 5, MongoDB + Mongoose 9 |
| Auth | JWT access + refresh tokens, bcrypt password hashing |
| AI | Google Gemini (`@google/genai`) — classification, Ask LOOP, report narratives |
| PDF export | jsPDF (client-side, in the Reports page) |

---

## 2. Project structure

```
projectloop/
├── backend/
│   ├── src/
│   │   ├── controllers/   # request handlers (one per resource)
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── middleware/    # auth (protect), workspace scoping, validation
│   │   ├── services/      # aiService.js (Gemini), embeddingService.js
│   │   └── validators/    # Joi schemas
│   ├── scripts/
│   │   ├── seed.js               # creates a demo admin + sample workspace
│   │   └── fixOrphanedUsers.js   # repairs users with no workspaceId
│   └── .env               # secrets — never commit this
└── frontend/
    └── src/
        ├── pages/          # one file per route (Inbox, Themes, Trends, Reports, Settings, AskLoop...)
        ├── store/          # Zustand stores (auth, feedback, workspace, ui)
        ├── api/            # thin Axios wrappers, one per backend resource
        └── components/     # shared UI (modals, GlobalLoader, layout)
```

---

## 3. First-time setup

### 3.1 Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a connection string to a hosted instance
- A Gemini API key (free) from **https://aistudio.google.com/apikey**

### 3.2 Install
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3.3 Configure `backend/.env`
```dotenv
PORT=5100
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/projectloop

JWT_ACCESS_SECRET=<use a long random string, not the demo default>
JWT_REFRESH_SECRET=<a different long random string>
JWT_ACCESS_EXPIRES=120m
JWT_REFRESH_EXPIRES=7d

CLIENT_URL=http://localhost:5148

GEMINI_API_KEY=<your key from aistudio.google.com/apikey>
GEMINI_MODEL=gemini-3.5-flash-lite
```
See **§6 Gemini quotas** below before picking a model — this matters more
than it looks like it should.

### 3.4 Seed demo data (optional but recommended first run)
```bash
cd backend
npm run seed
```
Creates a demo admin: `admin@loopdemo.com` / `Demo@1234`.

### 3.5 Run both servers
```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```
Frontend: `http://localhost:5148` (proxies `/api/*` to the backend on `5100` — see `frontend/vite.config.js`).

---

## 4. Core concepts

### Workspaces & roles
Every user belongs to exactly one **workspace** (a tenant boundary — nothing
crosses workspaces, ever). Signing up creates a new workspace and makes you
its `admin`. Roles: `admin` (full control, including inviting/removing
teammates and changing roles), `analyst`, `viewer`.

### The feedback lifecycle
```
add feedback  →  UNCLASSIFIED  →  AI classification (background)  →  sentiment + themes assigned
   (manual /            │
   simulate channel /   └── on failure: stays UNCLASSIFIED, flagged for manual review
   CSV import)
```
Classification is what actually populates the **Themes** and **Trends**
pages — those pages show nothing until at least one item has been
successfully classified.

---

## 5. Feature walkthrough

| Page | What it does |
|---|---|
| **Inbox** | Add feedback manually, bulk-simulate a channel (15 realistic fake items), CSV import, filter/search, retry classification per-item or in bulk (**Reclassify all**) |
| **Themes** | Auto-extracted topics (e.g. "Billing issues") with item counts; click through to filter the Inbox |
| **Trends** | Same themes, viewed week-over-week — flags a theme as *spiking* if it jumps ≥40% with ≥3 mentions |
| **Ask LOOP** | Ask a question in plain English; answers are grounded only in your actual feedback (semantic search over embedded items) — it won't invent an answer if nothing relevant exists |
| **Reports** | Pick a date range → generates real computed stats (sentiment %, top themes, notable quotes) plus an AI-written narrative around them → exportable as PDF |
| **Settings** | Change your own password; admins can invite/remove teammates and change roles |

---

## 6. Gemini quotas — read this before testing heavily

The **free tier caps requests per day, per model, per project** — as low as
**20/day** for some models. Every classification attempt, Ask LOOP question,
and report generation each counts as at least one call (classification
retries once on failure, so a bad response can cost 2).

- `npm run seed` + a couple of "Simulate channel" clicks can burn through a
  full day's free quota almost immediately if you then click **Reclassify
  all** on everything at once.
- If you see a `429 RESOURCE_EXHAUSTED` error, that's not a bug — check the
  `quotaValue` in the error message for your actual daily limit, and either
  wait for the daily reset, try a different model in `GEMINI_MODEL`, or
  enable billing on the Google Cloud project (Flash-tier models are
  fractions of a cent per call).
- The exact model your account is hitting only lives in `backend/.env`
  (`GEMINI_MODEL`) — an env var always overrides the code's default, so
  double-check that file specifically if a model swap doesn't seem to take
  effect after restarting.

---

## 7. Troubleshooting

| Symptom | Likely cause | Where to look |
|---|---|---|
| Login/signup "fails" with a generic message, no specific error | Request never reached the backend at all (proxy/CORS/server down) | Backend terminal — nothing logged at all confirms this |
| `429 RESOURCE_EXHAUSTED` on classify/reports/Ask LOOP | Daily free-tier Gemini quota used up | The error message itself states your exact daily limit |
| Classification silently does nothing, item stays `UNCLASSIFIED` | Check `backend/src/services/aiService.js` — errors are logged to the backend terminal as `classifyFeedback attempt N failed: ...` | Backend terminal |
| Report shows "zero feedback items" for a period that should have data | Date-range end was parsed as the *start* of that day (midnight), not the end — fixed in `reportController.js` by setting `end.setUTCHours(23,59,59,999)` | `backend/src/controllers/reportController.js` |
| Date picker doesn't open on click | Native `<input type="date">` only reliably opens via its calendar icon unless you force it — fixed with `onClick={(e) => e.currentTarget.showPicker?.()}` | `frontend/src/pages/Reports.jsx` |
| Settings page stuck on an error screen even though data loaded | Two parallel fetches shared one error flag; a partial failure blocked the whole page permanently | `frontend/src/store/workspaceStore.js` (`fetchAll`) |
| `TypeError: next is not a function` from a Mongoose hook | Mongoose 9 dropped support for old-style `function(next) {...}` callback hooks — hooks must be `async`/no-callback now | Any `schema.pre(...)` hook |
| A user's data seems to "disappear" from the database | Check the model's registered name (`mongoose.model("X", schema)`) actually matches what every `ref:` elsewhere points to — a mismatch silently creates a differently-named collection | `backend/src/models/*.js` |

---

## 8. Useful scripts

```bash
npm run seed                 # backend: create/reset demo admin + workspace
npm run fix-orphaned-users   # backend: repair any user stuck with no workspaceId
npm run lint                 # frontend: oxlint
npm run build                # frontend: production build
```

---

## 9. Security notes for anyone deploying this beyond local dev

- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to long random values — the demo defaults are not safe to ship.
- Never commit `backend/.env`. If any real API key or secret is ever pasted into a chat, doc, or committed by accident, treat it as compromised and regenerate it.
- `backend/.env` should be in `.gitignore` — verify before your first commit.