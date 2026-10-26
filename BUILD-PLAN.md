# Building Plan — Rhythm Quiz ("Complete the Bar")

> **Scope note.** This plan covers the project already in this folder: the offline
> `rhythm-quiz-package/` quiz + 10-question test tool for the WA Music Scope & Sequence
> (Pre-primary–Year 10). It documents what is built, how it fits together, and a phased
> plan for building it up from foundation to release and beyond. If you meant a different
> "this" (e.g. a brand-new rhythm game), tell me and I'll retarget it.

> **Revision (post-release).** This plan was first written for the initial build. It has been
> updated to reflect what is now on `main`: the **Note Values reference guide**, **Lakeland SHS
> branding**, the **Google Sheet submit** path, and the GitHub Pages workflow. See §2 (audit),
> §3 (line landmarks), §4 (Phase 6b) and §6 (risks).

---

## 1. Goal and constraints

**Goal.** A teacher can double-click one HTML file and run a music-rhythm quiz and a fixed
10-question test for any year group, then export a class results CSV — with no install, no
build step, no server, no internet.

**Hard constraints (these drive every decision):**

| Constraint | Consequence |
| --- | --- |
| Runs from `file://` by double-click | No ES modules, no `fetch()` of local data, no bundler. Everything inline or via relative `<script src>`. |
| No internet | VexFlow must be vendored locally (`lib/vexflow.min.js`). |
| No build step | `index.html` is the source of truth; standalone + zip are generated from it. |
| One answer must be unambiguous | Every question option must have a **unique** total duration. |
| Results must survive a page reload | `localStorage` is the only durable store available. |

---

## 2. What already exists (audit)

| Artifact | Status | Notes |
| --- | --- | --- |
| `rhythm-quiz-package/index.html` | Built, ~2,170 lines / ~98 KB | All content + logic. |
| `rhythm-quiz-package/lib/vexflow.min.js` | Vendored | VexFlow 3.0.9, MIT, ~754 KB. |
| `rhythm-quiz-package/lakeland-logo.svg` | Built | Navy school logo (header uses the inverse). |
| `rhythm-quiz-package/lakeland-logo-inverse.svg` | Built | White/green/lime logo used in the header. |
| `rhythm-quiz-package/README.md` | Built | Teacher-facing instructions. |
| `rhythm-quiz-package/LICENSES.md` | Built | VexFlow MIT + SCSA attribution. |
| `rhythm-quiz-standalone.html` | Built | Same quiz, VexFlow + logo inlined. |
| `rhythm-quiz-package.zip` | Built | Clean zip for sharing. |
| `Code.gs` | Built | Apps Script backend for the optional Sheet submit. |
| `GOOGLE-SHEET-SUBMIT.md` | Built | Deployment guide for the Sheet submit. |
| `.github/workflows/pages.yml` | Built | Publishes the package to GitHub Pages. |
| `BUILD-PROMPT.md` | Built | Original spec (now Rev 2, §10–§12). |
| `README.md` (top level) | Built | Explains the deliverables. |

**Functional coverage:** 11 year groups selectable; practice mode with hints + immediate
feedback; deterministic per-year 10-question tests; review table; CSV with answer-key row on
top and appended class list; a **Note Values reference guide** column; **Lakeland SHS
branding**; and an optional **Google Sheet submit** (sign-in at test start, append to a shared
class spreadsheet).

So this is **not a greenfield build** — it is a *rebuild/extension* plan. Phases 0–6 below
describe how to construct it from zero (useful for a rewrite, a new year's variant, or a
teammate picking it up), Phase 6b records the post-release increments, and §7 is the forward
roadmap.

---

## 3. Architecture

Single-page app, no framework. `index.html` is organised into numbered sections plus a
styling block. Line landmarks (current file):

```
    1–292     HTML shell + CSS (tokens, layout, cards, tabs, print styles)
  293–331     Test-mode markup (overlay, review table, Exit + status line)
  333–336     Script tags (VexFlow from lib/, then the app)
  337–561     §1  Music note model + hand-drawn SVG renderer (fallback)
  562–609     §1b VexFlow renderer (primary notation path)
  610–780         Metric beaming logic
  781–794         Concept (non-staff) graphics for Pre-primary / Year 1
  795–823     §2  Rhythm pattern library (per year, from the Addendum)
  824–851     §3  Year groups + time-signature totals
  852–865         Metric helpers
  866–1143    §4  Question generator (staff questions 877+)
  996–1143        Concept question generator
 1144–1427    §5  App state + practice-mode UI
 1182–1401        Note values reference guide (VexFlow glyphs + fallback)
 1402–1427        Practice-mode event wiring
 1428–1698    §6  Test mode (fixed 10 questions) + overlay flow (1465)
 1628–1676        CSV export (sidebar)
 1677–1698        Test/results event wiring
 1699–1944    §6b Google Sheet submit (sign-in, profile, submit, Exit)
 1945–1954        Boot
```

**Data flow**

```
Addendum rhythm vocabulary
        │
        ▼
§2 pattern library ──► §4 question generator ──► §5 practice UI
        │                     │                       │
        │                     ▼                       ▼
        │              unique-duration options   score / answer-key panel
        │                     │
        ▼                     ▼
§3 year groups ──► §6 test mode (deterministic seed) ──► localStorage ──► CSV
        │
        ▼
§1/§1b renderer (SVG → VexFlow) drawn into every bar and option
```

**Key invariants to preserve**

1. Bar total always equals the time signature (`sigTotal` in §3).
2. Every question has ≥1 given cell and exactly one option matching the target.
3. Beams never cross a beat or a bar line (metric beaming, §516).
4. Test questions are seeded per year, so the answer key is identical for every student.
5. Durations are compared in crotchet beats; note values are exact fractions, not floats
   compared loosely.

---

## 4. Build phases

### Phase 0 — Foundations
**Deliverable:** repo skeleton + vendored engine.
- [ ] Create `rhythm-quiz-package/` with `index.html`, `lib/`, `README.md`, `LICENSES.md`.
- [ ] Vendor VexFlow 3.0.9 into `lib/vexflow.min.js`; record MIT text in `LICENSES.md`.
- [ ] Confirm it loads over `file://` (no CORS/module errors).
- [ ] Add the top-level `README.md` describing the three deliverables.

**Exit test:** a blank page with VexFlow rendering one stave, opened by double-click.

### Phase 1 — Notation engine
**Deliverable:** correct, professional notation for every required value.
- [ ] §1 hand-drawn SVG fallback (notehead, stem, flag, dot, rest glyphs).
- [ ] §1b VexFlow path: `Voice` with `setStrict(false)`, `addDotToAll()`, `Beam`, `StaveTie`,
      `Tuplet`; blank beat = transparent rest + dashed box overlay with `?`.
- [ ] §516 metric beaming: 1 crotchet in simple time; 1 dotted crotchet in compound;
      2+2+3 eighths in 7/8.
- [ ] Confirm SVG `viewBox` present so notation scales in tables.

**Exit test:** every note value in the vocabulary renders with correct stems/flags/beams/
rests; nothing crosses a beat.

### Phase 2 — Content model
**Deliverable:** the Addendum's rhythm vocabulary encoded per year.
- [ ] §2 pattern library, one entry per year group (11 entries).
- [ ] §3 year groups + `sigTotal`; time signatures 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8.
- [ ] Duration table (semibreve 4 … semiquaver 0.25; rests equal; quaver triplet = 1).

**Exit test:** a table listing each year and the values it may use matches the Addendum.

### Phase 3 — Question generator
**Deliverable:** unambiguous questions with exactly one correct option.
- [ ] §4 staff questions: choose time signature, fill all but one cell, target = missing beats,
      generate 4 options with **unique** durations, one matching the target.
- [ ] §871 concept questions for Pre-primary / Year 1 (steady beat, long/short/silence,
      quaver patterns) since they have no time signature.
- [ ] Hints/explanation strings per question.

**Exit test:** an assertion loop over many seeds: total == time signature, ≥1 given cell,
exactly one correct option. No duplicate-duration options.

### Phase 4 — Practice mode
**Deliverable:** the main learning screen.
- [ ] §5 year tab bar (sticky, 11 tabs), question card, 4 option buttons.
- [ ] Immediate feedback + explanation; Next / New / Hint / Restart score.
- [ ] Score panel (correct / answered / streak) and teacher **Answer key** log.
- [ ] Side panel "Rhythms for this year" that **updates on year change** (known bug source).
- [ ] Keyboard `1`–`4` and `Enter`.
- [ ] Fixed practice seed for reproducibility.

**Exit test:** switching year updates question *and* side panel; keyboard works; feedback correct.

### Phase 5 — Test mode + CSV
**Deliverable:** the assessment path.
- [ ] §6 deterministic 10-question test per year; Google sign-in gate (name from the
      account, no name field); progress bar; no marking until end.
- [ ] Results: score /10 and review table **Q | Question | Your answer | Correct answer | ✓/✗**
      (question shown as scaled bar; wrong rows red, correct green).
- [ ] CSV spec: header `Year,Name,Date,Score,Q1…Q10,Wrong`; **answer-key row on top**; student
      rows below with `✗` marks and a `Wrong` list; UTF-8 BOM; `Year` on every row.
- [ ] `localStorage` key (e.g. `rq_results_v1`) appends into one growing class list.
- [ ] `Download CSV (this year)` / `(all years)` / `Clear results` (with confirm).
- [ ] Sidebar **Class results** panel (Name, Year, Score, Date).

**Exit test:** sit a test, save, reload, sit another — download contains both students and one
answer-key row per year.

### Phase 6 — Packaging & release
**Deliverable:** the three shareable artifacts.
- [ ] Generate `rhythm-quiz-standalone.html` by inlining VexFlow from the package `index.html`.
- [ ] Generate `rhythm-quiz-package.zip` cleanly (strip `__MACOSX`/resource forks).
- [ ] Re-run the §1 invariant assertions; check the browser console is clean.
- [ ] Update both READMEs if behaviour changed.
- [ ] **Regenerate standalone + zip after every future change** (make this a rule).

**Exit test:** all three artifacts work offline from a clean machine; acceptance checklist passes.

### Phase 6b — Delivered increments (post-release)
**Deliverable:** the features shipped after the initial release, on `main`.

- [x] **Note Values reference guide** (`index.html` 1394–1508): a left column showing each
      note value with its matching rest, fraction and 4/4 beats. Symbols drawn from VexFlow so
      the guide matches the questions, with the hand-drawn set as fallback. Only shown when the
      viewport fits all three columns (the options have a ~702 px floor). Fixed three
      rest-rendering bugs: dotted-rest dot placement, dotted-crotchet-rest glyph, and a missing
      semiquaver-rest glyph/`DUR`/`VEX_BASE` entry.
- [x] **Concept Mastery Breakdown** (`index.html` 1234–1392): the far-left card, with the
      Reference Guide beside it. Every answered question is tagged with the value that was
      missing (its note, rest, tie or triplet) and its time signature, and the class's error
      rate per concept is drawn as a bar (green / amber / red). Scoped to the selected year —
      only concepts that year's questions can actually ask about appear — and aggregated from
      the saved test records plus the current session's practice answers. The weakest concept
      is named as the next mini-lesson.
- [x] **Lakeland SHS branding**: inverse logo in the header, navy/green/lime palette
      (`#202B64` / `#0A8440` / `#C1D52D`), 4 px lime rule under the header; logos cropped from
      the A4 artwork and stripped of metadata; both colourways committed; the Pages workflow
      copies both SVGs.
- [x] **Google Sheet submit** (`§6b`, `index.html` 1699–1944, `Code.gs`,
      `GOOGLE-SHEET-SUBMIT.md`): optional, additive, internet-only. Sign-in at test start,
      token captured once, results-screen submit; `text/plain` POST to avoid a CORS preflight;
      top-level-navigation fallback (`doGet?action=submit`) for restricted deployments.
- [x] **GitHub Pages workflow**: publishes `index.html` + `lib/` + both logos on push to `main`.
- [x] Regenerated `rhythm-quiz-standalone.html` (VexFlow + logo inlined) after each change.

**Exit test:** guide matches the quiz notation; branding visible in the header on the live
site; Sheet submit appends a row when configured; offline CSV path unaffected.

---

## 5. Acceptance checklist (definition of done)

- [ ] All 11 year groups selectable; side panel updates per year.
- [ ] Notation professional (stems/flags/beams/rests/time signatures correct).
- [ ] Practice mode works with hints and immediate feedback.
- [ ] Each year has a stable 10-question test with a Google sign-in gate and no name field.
- [ ] Results table is `Q | Question | Your answer | Correct answer | ✓/✗`.
- [ ] CSV header/order correct, answer-key row on top, ✗ marks + Wrong list, appends.
- [ ] Package, standalone and zip all present and working offline.
- [ ] Invariant assertions pass; console clean.
- [ ] Note Values reference guide matches the quiz notation and shows each rest correctly.
- [ ] Concept Mastery Breakdown sits on the far left, scopes to the year, and names a mini-lesson.
- [ ] Lakeland SHS inverse logo in the header; navy/green/lime palette.
- [ ] (Optional) Google Sheet submit appends a row; offline CSV path still works.

---

## 6. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Two options accidentally equal duration → two "correct" answers | Assert unique durations in the generator; fail loudly. |
| Float drift when summing dotted values | Compare in exact fractions / rounded crotchet beats. |
| Side panel not updating on year change | Explicit re-render in the year-tab handler; covered by exit test. |
| Standalone/zip drifting from package | Always regenerate both from `index.html`; treat as build output. |
| VexFlow API differences (e.g. `strokeRect` absent on SVGContext) | Use `beginPath/rect/stroke`; keep the SVG fallback path. |
| `localStorage` cleared / different browser → "lost" results | Document it; CSV download is the durable copy; consider export/import JSON (Phase 7). |
| Very long bars overflow on phones | `overflow-x:auto` on `.barwrap`; responsive grid collapses at 820px/560px. |
| Dotted/missing rest glyphs render wrong or blank | Give every rest its own glyph and a `DUR` + `VEX_BASE` entry; place the dot in the space above the middle line; verified in the reference guide. |
| Logo 404s on the live site | The Pages workflow must copy **both** logo SVGs (it previously copied only `index.html` + `lib/`). |
| Sheet submit blocked by CORS / restricted deployment | POST as `text/plain`; fall back to top-level navigation (`doGet?action=submit`); CSV remains the offline fallback. |
| Google OAuth client ID / Web App URL drift | Documented in `GOOGLE-SHEET-SUBMIT.md`; re-deploy with "Manage deployments → edit → New version" after editing `Code.gs`. |

---

## 7. Forward roadmap (next builds)

Ordered by value-to-effort; each is an independent, shippable increment.

> **Delivered since this list was written:** Google Sheet submit — a shared class spreadsheet
> with sign-in at test start (see Phase 6b and `GOOGLE-SHEET-SUBMIT.md`).

**Near term**
1. **Export/import results as JSON** — back up and move the class list between machines.
2. **Answer-key / teacher view print sheet** — print the fixed test + key for paper use.
3. **Question bank size control** — let teachers pick 5/10/20 questions per test.
4. **Accessibility pass** — ARIA labels on options, focus rings, screen-reader text for bars.

**Medium term**
5. **Aural mode** — play the bar with the Web Audio API (still fully offline); "which rhythm do you hear?"
6. **Clap-along / tap-tempo mini-game** — turns the quiz into an actual rhythm game; needs timing + audio.
7. **Per-student progress dashboard** — aggregate saved results into strengths/weaknesses per element.
8. **Configurable CSV columns** — school/class fields, teacher name, free-text notes.

**Longer term**
9. **Curriculum expansion** — add Pitch/Melody and other elements from the Addendum using the same engine.
10. **Suite shell** — a small launcher page that links the quiz plus new rhythm games (matches the "Rhythm Games" folder name).
11. **Optional PWA/offline install** — service worker + manifest, while keeping the double-click path working.

**Deferred / explicit non-goals**
- No server, accounts, or cloud sync — that breaks the offline constraint.
- No build step or framework migration unless a real need appears; the single-file model is a feature.

---

## 8. How to run / verify today

```
Open  rhythm-quiz-package/index.html        (primary package)
Open  rhythm-quiz-standalone.html           (single-file)
Unzip rhythm-quiz-package.zip               (share copy)
```

The live copy is published to GitHub Pages from `main`:
<https://rayfoolshs.github.io/rhythm-quiz/>

Verify in a browser: pick each year (side panel updates), answer a few (feedback + score),
check the Note Values guide matches the notation, sit a 10-question test, save CSV, reload,
check the class list persisted, and confirm the console has no errors. If the Sheet submit is
configured, confirm the Google sign-in prompt appears at test start and a row lands in the
spreadsheet.
