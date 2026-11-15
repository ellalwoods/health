# Astra

Astra (Latin for “the stars”) tracks period pain and everything that comes with it. It opens to today: your cycle day on a ring and one big **Log how you feel** button. Each log starts with pain (where on a front and back body map, mild/moderate/severe, and what kind), then you add only the symptoms that happened that day. Log as often as you like: several pain logs in a day show how the pain moved. There's a calendar, a summary for you, and an export for your doctor.

The app is at **https://ellalwoods.github.io/health/** once publishing is switched on (below).

## How it works

- **Today:** the cycle ring (today is the star), when your next period is expected, today's pain logs with a little body for each, and the other symptoms you've logged.
- **Log pain:** tap everywhere it hurts on the front or back, choose Mild, Moderate or Severe and the kind of pain, and set the time. Then **Next** goes to the rest of the day.
- **What else happened:** tap a tile to add a symptom class (Bleeding, Clots, Bowel, Urinary, Headache, Nausea & dizzy, Heart, Sleep, Fatigue, Stress, Food, Activity, Treatment, Day impact, Notes), and tap it again to remove it. Each one you add opens as a card. **Edit** on a card lets you add your own options, rename them (this updates days already logged), reorder or delete them. **New…** makes a whole new class. Sleep is a score (from your watch).
- **Calendar:** each day shows pain as 1–3 bars, a dot for each symptom class, a tint on bleeding days and an outline on days your next period is expected. Tap a day to see or change it.
- **Summary:** for you. Days with pain, severe days, your worst cycle days, a body map of where it hurts most, what tends to come with the pain, your sleep score on pain days and recent cycle lengths.
- **For your doctor:** pick a range, tick what to include, then **PDF / print** (a printable record with body maps and how the pain moved) or **Excel (.xlsx)**: a Summary sheet, a Days sheet (one row per day, only the columns you used) and a Pain logs sheet. There's also a CSV.
- **Cycle:** a new cycle starts on the first day of bleeding (light or heavier) after a gap. You can also mark or unmark a day as the start of your period (on the day, or in Settings).
- **Settings:** colours (Bright, Muted, Spring, Summer, Pastel, Night), sign-in, period starts, symptom classes, the Notion import, your name on reports, and backups.

## One-time setup

1. **Publishing:** in the `health` repository's settings: **General → Default branch:** `main` (the first push creates it). **Pages → Build and deployment → Source:** GitHub Actions. After that, every push to a `claude/` branch is merged into `main` and published automatically. Then open the link in Safari and **Share → Add to Home Screen**.
2. **Sync:** in the DuoVino Supabase project, open **SQL Editor → New query**, paste the whole of [`supabase/astra.sql`](supabase/astra.sql) and click **Run**. It only adds its own `astra_` table and two functions. Until then, signing in says it isn't switched on yet; **Use without syncing** works in the meantime and you can sign in later from Settings.
3. **Your Notion log:** Settings → **Bring in your Notion log**, and pick the Notion export (the zip, or the CSV inside it). It fills in days you haven't already logged in Astra, and works out period starts from the Cycle Day column.

## Signing in

On each device, type your name and pick a hot-water bottle and a tea. The same three open the same log everywhere. Only a SHA-256 hash of them is sent to Supabase, so your name and picks never leave the phone, and the table can't be read directly: the app can only call `astra_load` and `astra_save` for a hash it knows. Your log is also kept on the phone, so it works offline and syncs when you're back online.

This repository is public. Your symptom data never goes in it: it lives only on your devices and in your Supabase row.

## Run it locally

No build step:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

| File | What it is |
|---|---|
| `index.html` | Shell and script order |
| `styles.css` | All styling (the Twinge look: Space Grotesk and Space Mono) |
| `palettes.js` | The six colour palettes |
| `body.js` | The front and back body map and its tappable places |
| `xlsx.js` | The Excel and CSV writer (no library, works offline) |
| `app.js` | Screens, logging, cycle, summary, doctor export, report, settings, Notion import, sync |
| `cloud-config.js`, `supabase/astra.sql` | Sync: the Supabase project (DuoVino's) and the one-time database setup |
| `sw.js`, `manifest.webmanifest`, `icon*` | Offline support and home-screen install (the sparkle icon) |
| `.github/workflows/publish.yml` | Automatic publishing to GitHub Pages |
| `design/` | The design mockups that led here. Not part of the app; all data in them is made up |
