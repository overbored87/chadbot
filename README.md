# 🎯 Chadbot — Telegram Dating Coach

A Telegram bot that analyses conversation/profile screenshots and suggests responses, backed by an editable system prompt and knowledge base via a React admin UI.

---

## Architecture

```
Telegram → Python Bot (Render) → Claude Vision → Supabase (prompt + examples)
                                                      ↕
                              React Admin UI (Vercel) ←→ Supabase
```

---

## 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Go to **Storage** → **New Bucket** → name it `chadbot-examples`, set to **Public**
4. Copy your **Project URL** and **anon public key** from Settings → API

---

## 2. Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot`
2. Copy the bot token
3. Get your own Telegram user ID by messaging [@userinfobot](https://t.me/userinfobot)

---

## 3. Backend (Render)

### Local setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in all values in .env
python bot.py
```

### Deploy to Render
1. Push to GitHub
2. Create new **Background Worker** on Render
3. Set root directory to `backend/`
4. Build command: `pip install -r requirements.txt`
5. Start command: `python bot.py`
6. Add environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `ALLOWED_TELEGRAM_USER_ID` (your Telegram user ID)

---

## 4. Frontend Admin UI (Vercel)

### Local dev
```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in Supabase values
npm run dev
```

### Deploy to Vercel
1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set **Root Directory** to `frontend/`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
5. Deploy

> **Security note**: The admin UI talks directly to Supabase. Since it's single-user, RLS policies allow all operations with the anon key. If you ever share the URL, consider adding Supabase Auth.

---

## 5. Using Chadbot

### Telegram
- Send any screenshot → bot auto-detects conversation vs profile
- Add a caption for extra context (e.g. "we've been talking 3 days")
- `/prompt` to see the current system prompt
- `/help` for commands

### Admin UI
- **System Prompt tab**: Edit Chadbot's core instructions. Save = instant effect.
- **Knowledge Base tab**: Upload reference screenshots + annotations. Tag them (opener, response, flirty, etc.). Enable/disable without deleting. The bot injects active examples into every prompt.

---

## Tips for the Knowledge Base

- Add 3–5 "gold standard" conversations where responses landed well
- Annotate each: *"This works because it's specific and doesn't try too hard"*
- Tag appropriately — the bot can filter by tag in future versions
- Profile examples: add profiles + note what makes a good opener for that type

---

## File Structure

```
chadbot/
├── supabase_schema.sql     # Run once in Supabase SQL editor
├── backend/
│   ├── bot.py              # Telegram bot (deploy on Render)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx         # Full admin UI
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── .env.example
```
