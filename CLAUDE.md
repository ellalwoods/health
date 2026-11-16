# Astra: instructions for Claude

Astra is a period pain and symptom tracker for one person (the repository is `health`). It's a static PWA: vanilla JS, no build step, data in localStorage, synced through Supabase. Read `README.md` for what the app does.

## Rules

- **Never commit real symptom data.** The repository is public. Real logs live only on the user's devices and in Supabase. Don't save uploaded exports (Notion or otherwise) in the repo; mockups in `design/` use made-up data only.
- **Keep saved data working.** Ids are stored in people's logs and settings: symptom class ids (`bleed`, `bowel`, … in `DEFAULT_CLASSES` in `app.js`), body area ids (`F.lowAbd`, `B.lowC`, … in `REG` in `body.js`; pain logs save the exact taps as `spots` [{ s, x, y }] plus the named zones as `regions`, e.g. `F.pelvis.L`), palette ids (`palettes.js`), and the sign-in hash recipe (`'astra:' + name (lowercased, spaces collapsed) + '|' + bottle + '-' + tea`, with the bottle and tea as indexes into `BOTTLES` and `TEAS`). Don't rename or reorder these: changing the hash recipe, or the order of `BOTTLES`/`TEAS`, signs everyone out. Labels and options can change freely.
- **Synced state** is `{ app: 'astra', v: 1, days, starts, cfg }`. Each day, each period start and `cfg` carry `_at` (when they last changed); the newer copy of each wins when syncing. If you change the shape, keep it backwards compatible. If you change `supabase/astra.sql`, the user has to re-run it in Supabase → SQL Editor.
- **Look:** the Twinge design. Space Grotesk and Space Mono, white page, one ink per symptom class, pain colours light → dark for Mild → Severe. All colours come from the palette, through CSS variables set in `applyPalette()`. Palettes should stay pretty (bright, muted, seasonal, pastel, night), never dull or heavy. The logo is a four-point sparkle; the app icon is the white sparkle on Bright's coral (`icon.svg`, PNGs rendered from it).
- **Language:** plain, warm, Australian/British English. Pain is Mild, Moderate or Severe (no 0–10 scale).

## Making a change

1. Edit the files. If you add a file, add it to `index.html` and to `ASSETS` in `sw.js`.
2. Bump `CACHE` in `sw.js` (e.g. `astra-v1` → `astra-v2`) so phones pick up the change.
3. Serve the folder (`python3 -m http.server`) and check on a phone-sized screen (390 × 844): log pain, add and remove symptom classes, edit options, the calendar, summary, doctor export (open the .xlsx) and the printable report, in at least Bright and Night.
4. Commit and push to the `claude/` branch. Don't open a pull request: the Publish workflow merges into `main` and deploys to GitHub Pages. Check the run succeeded; if the merge into `main` conflicts, rebase onto `origin/main` and push again.
