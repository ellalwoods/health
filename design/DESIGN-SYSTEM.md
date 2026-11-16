# Astra design system

A brief for anyone (or any Claude chat) designing or building screens for **Astra**, a personal tracker for period pain and associated symptoms. The live code is the source of truth: `styles.css`, `palettes.js`, `body.js` and `app.js` in https://github.com/ellalwoods/health.

## 1. Character

- **Minimal, white, confident.** It looks like a stack of tidy index cards printed in riso inks: a white page with lots of space and thin hairlines, plus one bright ink per symptom.
- **Calm and empowering, not clinical or gloomy.** The name means "the stars" (*per aspera ad astra*). The tone is "you're in charge of this", never "you poor thing".
- **Only show what happened.** Nothing is pre-filled or shown empty. A quiet day is one line, and a bad day is as detailed as it needs to be.
- It sits in the same family as the user's other apps (DuoVino, DuoLogo, DuoDisco): white page, big type, coloured inks, and a playful sign-in. It's its own design, though.

## 2. Type

| Role | Font | Settings |
|---|---|---|
| Everything (UI, headings, body) | **Space Grotesk** 400/500/600/700 | Body 15px, line-height 1.45 |
| Numbers (cycle day, dates in the calendar, times, stats) | **Space Mono** 400/700 | Tabular feel. Big numbers are 700 |
| Screen title (`.ttl`) | Space Grotesk 700 | 30px phone / 36px laptop, letter-spacing −0.045em, line-height 1.02 |
| Wordmark "Astra" | Space Grotesk 700 | 19–21px, letter-spacing −0.04em, after the sparkle |
| Section label (`.lbl`) | Space Grotesk 700 | 10.5px, UPPERCASE, letter-spacing 0.09em, `--soft` colour. A note can sit on the right in normal case |
| Hero number (cycle day) | Space Mono 700 | 52px, accent colour |

Headings are always tight (negative letter-spacing) and section labels are always small caps-style. Never use more than these two fonts.

## 3. Colour

Every colour comes from the **chosen palette** (Settings → Colours). CSS variables are set on `:root` by `applyPalette()`:

| Variable | Use |
|---|---|
| `--bg` | Page background |
| `--card` | Soft fill for tiles, calendar days, inputs, stat boxes |
| `--ink` | Main text, selected outlines |
| `--soft` | Secondary text, labels, icons |
| `--hair` | 1–1.5px hairlines and unselected outlines |
| `--acc` | Accent: cycle day number, active tab, links, pain-type chips, "Next" |
| `--btn` / `--btnFg` | Primary button fill and text (often ink, sometimes the accent) |
| `--bleed` | Tint on days with bleeding |
| `--sev0` `--sev1` `--sev2` | Pain: **Mild → Moderate → Severe**, always light → dark |
| `c[0..15]` (in JS) | One ink per symptom class, given out in list order |

**The six palettes** (ids are saved: don't rename): `bright` (bold inks on white, coral accent #f15060, black buttons, the default), `muted` (dusty rose, sage, lavender on warm white), `spring` (blossom pink accent, leaf-green buttons), `summer` (coral, mango, turquoise on cream), `pastel` (soft candy on lilac-white), `night` (dark navy, gold accent: the only dark one). Palettes must be **pretty**: bright, soft, seasonal or night. Never dull, heavy, brown or "masculine" (earthy, jewel or grey-only palettes were rejected).

**Colour rules**
- Each symptom class keeps its own ink everywhere: tile icon, card outline, chips when selected, calendar dot, legend, summary bar, export ticks.
- Pain is never on a 0–10 scale. It's three levels, shown as a coloured dot, 1–3 rising bars, or a soft radial glow on the body.
- Selected states are a 13–16% tint of the ink plus a 1.6–2px ink outline (`color-mix(in srgb, var(--c) 14%, var(--bg))`).
- Printed/PDF reports always use the light Bright palette, even in Night mode.

## 4. Shape and spacing

- Radius: **12px** for tiles and cards (`--r`), 14–16px for bigger cards, 9–11px for calendar days, **999px** (pill) for buttons, chips and segmented controls, 22–24px for sheets.
- Outlines are drawn with `box-shadow: inset 0 0 0 1.4px var(--hair)`, not borders.
- Shadows are rare and soft: only floating cards (summary, doctor preview: `0 8px 24px #0000001a`) and the main Log button.
- Screen padding: 18px on phone, 40px on laptop. Gaps between items are 5–8px, and sections are 18px apart.
- Phone layout max width is 480px, centred.

## 5. Components

- **Header:** sparkle and "Astra" on the left, settings gear on the right. Inner screens use "‹ Back"/"Cancel" on the left and an accent "Next"/"Done" on the right.
- **Bottom tabs** (phone): Today · Calendar · Summary · Doctor. These are icons with small labels, and the active tab is in the accent colour.
- **Primary button** (`.btn`): full-width pill, `--btn` fill, 700 weight. **Ghost button**: transparent with a hairline outline. **Log button** (`.logbtn`): the biggest thing on Today, 18px padding, a "+" icon and a soft shadow.
- **Chips** (`.chip`): pill, hairline outline. When selected they fill solid with the class ink and white text. Used for options like Loose, Urgent, Cramping.
- **Segmented control** (`.seg`): pill track in `--card`, with the selected segment white and lightly lifted. Used for ranges (This cycle / 3 cycles / …) and Front/Back.
- **Symptom tiles** (`.cls`): a grid of 3 columns. Each tile is a small rounded square icon in the class ink with "+" (or "✓" when added), plus the label. **Tap to add, tap again to remove**: there is no Remove button. The last tile, "New…", is hatched and makes a custom class.
- **Open class card** (`.open`): outlined in the class ink, with the class name in ink on the left and an **"✎ Edit"** pill on the right. The options are chips, followed by an optional note input. Edit opens a sheet to add, rename, reorder (↑ ↓) and delete options.
- **Severity buttons** (`.sv`): three equal tiles (Mild / Moderate / Severe), each with 1–3 rising bars. The selected one gets its severity colour outline and tint.
- **Pain timeline row** (`.te`): time (Space Mono) · a tiny front and back body · severity dot, type and places. Below the rows: "↻ Moved: Lower abdomen → Lower back, right".
- **Mini cards** (`.mc`): small `--card` pills with a coloured square, the class name in ink and the values ("Bowel · Loose, Urgent").
- **Stat boxes** (`.stats`): 3 across, `--card` fill, big Space Mono number in the accent with a small soft caption.
- **Sheets:** slide up from the bottom on a phone (grab handle, dimmed backdrop) and become centred dialogs on a laptop.
- **Toasts:** a dark ink pill near the bottom, gone after about 2.5 seconds.

## 6. Signature visuals

- **Logo:** a single four-point **sparkle** (a star with curved inner edges). The app icon is the white sparkle on the coral tile (#f15060). The wordmark is the sparkle in the accent colour, then "Astra".
- **Cycle ring** (Today): one small rounded square per day of the cycle, arranged in a circle and rotated to follow it. Past period days are filled with the accent, the expected rest of the period is shown as outlines, logged days are soft grey, and other days are hairline. **Today is a sparkle** in ink. In the centre: "CYCLE DAY", a big Space Mono number in the accent, and the phase in small text ("period", "follicular", "luteal").
- **Body map:** a simple single-line outline (front and back). You tap **anywhere** on it, not on preset places: each tap drops a small ringed dot with a soft radial glow in the severity colour, and Astra names it from its position with the side (“Pelvis, left”, “Lower abdomen, right”). The front has a navel dot, and the back has a dashed spine and shoulder-blade hints. R/L labels are shown (on the front, the person's right is on the viewer's left). On a phone you switch between Front and Back; on a laptop both show side by side. Tiny versions (15–26px wide) appear in timelines and exports.
- **Calendar** (from the "Twinge" concept): Monday-first grid of rounded day tiles. Each tile has the date (Space Mono), 1–3 severity bars, and one tiny square dot per symptom class. Bleeding days are tinted `--bleed`, expected period days have an accent outline, and today has an ink outline.
- **Week strip** (Today, laptop): 7 small day tiles in the same style as the calendar.

## 7. Layout and screens

- **Today:** cycle ring, then the date and next expected period, then the big **Log how you feel** button, then today's pain logs (with how the pain moved), then other symptoms as mini cards.
- **Log pain:** time chip, Front/Back body map, Mild/Moderate/Severe, pain-type chips (editable), note. Then "Next: what else happened".
- **Day:** pain logs, then the symptom tiles, then the open cards for the classes added, then "Mark as the day my period started".
- **Calendar,** **Summary** (for the user: stats, where it hurts most as a body heat map, "often comes with" bars, sleep score, cycle lengths), **For your doctor** (range, tick what to include, preview, PDF/print and Excel), **Settings**.
- **Laptop** (≥720px): the tabs become a left sidebar (wordmark at the top, Settings at the bottom). Content runs **horizontally** in columns (`repeat(auto-fit, minmax(290px, 1fr))`): for example, Today is ring | today's logs | this week, and Day is pain | tiles | cards. Between 720px and 1000px the sidebar shrinks to icons only.

## 8. Sign-in look

A "Hello" screen: name field, then **a hot-water bottle** (8 colours, drawn as a rounded bottle with a black stopper and white ribs) and **a tea** (8 cups: Peppermint, Ginger, Chamomile, Raspberry leaf, Black tea, Rooibos, Green, Hot choc). Picks are rounded tiles with a hairline, and the chosen one gets a 2.5px ink outline. There's no PIN.

## 9. Words

- Plain, warm Australian/British English. Short sentences. Sentence case for buttons and headings.
- Say "Log how you feel", "What else happened", "Tap to add · tap again to remove", "For your doctor", "Your summary".
- Pain is always **Mild, Moderate or Severe**. The symptom classes are Bleeding, Clots, Bowel, Urinary, Headache, Nausea & dizzy, Heart, Sleep (a score from a watch), Fatigue, Stress, Food, Activity, Treatment, Day impact, Notes, plus any the user makes.
- No streaks, guilt, emoji-heavy copy or medical jargon in the UI.
