# 🌿 Plantry — Shared Meal Prep App

A real-time shared meal prep app for two. Any change either of you makes (adding to grocery list, checking off items, adding recipes) instantly appears on the other person's screen.

---

## Deploy in ~10 minutes

### Step 1 — Set up Supabase (free, ~5 min)

1. Go to **[supabase.com](https://supabase.com)** and create a free account
2. Click **New Project** — pick a name like "plantry", choose a region, set a password
3. Wait ~2 minutes for it to spin up
4. Go to the **SQL Editor** (left sidebar) and run this query to create the shared data table:

```sql
create table plantry_shared (
  id          text primary key,
  payload     jsonb,
  updated_at  timestamptz default now()
);

-- Allow anyone with the anon key to read and write
-- (safe because this is just grocery/recipe data, nothing sensitive)
alter table plantry_shared enable row level security;

create policy "Public read" on plantry_shared
  for select using (true);

create policy "Public write" on plantry_shared
  for all using (true);

-- Enable real-time updates
alter publication supabase_realtime add table plantry_shared;
```

5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

### Step 2 — Add your credentials

Create a file called `.env` in the root of this folder:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJYOUR_ANON_KEY_HERE
```

Replace the values with what you copied from Supabase.

---

### Step 3 — Install and run locally (optional test)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the app should load with all 150 recipes.

---

### Step 4 — Deploy to Vercel (free, ~2 min)

**Option A — Vercel CLI (fastest):**
```bash
npm install -g vercel
vercel
```
- Follow the prompts (defaults are fine)
- When asked about environment variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Vercel gives you a URL like `plantry-abc123.vercel.app`

**Option B — Vercel dashboard:**
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import your repo
3. Add the two environment variables in the Vercel project settings
4. Deploy — done

---

### Step 5 — Share the URL

Send the Vercel URL to your fiancée. You're both connected to the same Supabase database. Changes sync in real time — no refresh needed.

**Add to iPhone home screen:**
- Open the URL in Safari
- Tap the Share button → "Add to Home Screen"
- It'll look and feel like a native app

---

## How sharing works

| Action | Syncs? |
|--------|--------|
| Add recipe to grocery list | ✅ Both see it instantly |
| Check off a grocery item | ✅ Both see the checkmark |
| Add to cook list | ✅ Both see it |
| Adjust servings in cook list | ✅ Synced |
| Create a custom recipe | ✅ Both can see and use it |
| Delete a custom recipe | ✅ Gone for both |
| Browse / search / filter | Local only (no need to sync) |

The small green/orange dot in the header shows sync status.

---

## Folder structure

```
plantry/
├── index.html              # HTML entry point
├── vite.config.js          # Vite config
├── package.json
├── .env                    # ← YOU CREATE THIS (your Supabase keys)
├── public/
│   └── icon.svg            # App icon
└── src/
    ├── main.jsx            # React entry
    ├── App.jsx             # Full app (150 recipes + all UI)
    ├── supabase.js         # Supabase client setup
    └── useSharedState.js   # Real-time sync hook
```

---

## Troubleshooting

**"Cannot connect to Supabase"** — Double-check your `.env` file has the right URL and key with no extra spaces.

**Changes not syncing** — Make sure you ran the SQL in Step 1, especially the `alter publication` line that enables real-time.

**Blank screen on load** — Open browser DevTools (F12) → Console tab and look for the error message.

**Works locally but not on Vercel** — Check that you added the environment variables in Vercel's project Settings → Environment Variables.
