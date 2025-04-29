# Tildra 🔍✂️ – AI TL;DR Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tildra is a Chrome extension + web app that gives you instant, AI-generated summaries (TL;DRs) of any article on the web. Save time, stay informed.

## Features

*   **Instant Summaries:** Get concise TL;DRs and key takeaways in seconds.
*   **AI-Powered:** Leverages advanced AI (configurable, e.g., Claude, DeepSeek) for accurate summarization.
*   **Chrome Extension:** Summarize directly while browsing.
*   **Web App:** Paste URLs or text for summarization.
*   **Customizable:** Choose summary length and model preferences (future).
*   **History:** Access your past summaries (future).

## Tech Stack

*   **Frontend (Web App):** Next.js, React, Tailwind CSS, Shadcn/ui
*   **Frontend (Extension):** Plain JavaScript, HTML, CSS
*   **Backend:** Python (FastAPI), Prisma (ORM)
*   **Database:** PostgreSQL (via Neon / Fly Postgres)
*   **AI:** DeepSeek API (or other LLM APIs)
*   **Deployment:** Fly.io

## Getting Started

1.  **Clone:** `git clone https://github.com/yourusername/tildra.git`
2.  **Setup Backend:**
    *   Navigate to `api/`
    *   Create a `.env` file (see `.env.example`)
    *   Install dependencies: `pip install -r requirements.txt`
    *   Run migrations: `npx prisma migrate dev`
    *   Start server: `uvicorn main:app --reload`
3.  **Setup Frontend (Web):**
    *   Navigate to `app/`
    *   Install dependencies: `npm install` (or `yarn` or `pnpm install`)
    *   Run: `npm run dev`
4.  **Setup Frontend (Extension):**
    *   Open Chrome > Extensions > Manage Extensions
    *   Enable "Developer mode"
    *   Click "Load unpacked" and select the `extension/` directory.

## Contributing

Contributions welcome! Please open an issue or PR.

## ✨ Features
- 🧠 One-click TL;DR for any webpage
- 📌 Saves summary history to your dashboard
- 🔐 Google login via Supabase
- 🚀 Built with React (Next.js), Supabase, OpenAI API
- ⚡️ Freemium: 10 free summaries/day, upgrade for more

## 🛠 Tech Stack
- Frontend: React (Next.js)
- Chrome Extension: Vanilla JS + Readability.js
- Backend: Supabase (Auth + DB)
- AI: OpenAI GPT-4 API
- Hosting: Vercel

## 🧪 Getting Started
1. Clone the repo  
   `git clone https://github.com/your-username/snip-summary`
2. Install dependencies  
   `cd app && npm install`
3. Add your environment variables (OpenAI key, Supabase keys)
4. Run locally  
   `npm run dev`

Extension is inside `/extension/` — load as unpacked in Chrome DevTools.

## 📦 Coming Soon
- Export to Notion, Email, PDF
- Stripe-based Pro subscription
- Team dashboards
