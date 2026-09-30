# Building Plan — Rhythm Quiz ("Complete the Bar")

> **Scope note.** This plan covers the project already in this folder: the offline
> `rhythm-quiz-package/` quiz + 10-question test tool for the WA Music Scope & Sequence
> (Pre-primary–Year 10). It documents what is built, how it fits together, and a phased
> plan for building it up from foundation to release and beyond. If you meant a different
> "this" (e.g. a brand-new rhythm game), tell me and I'll retarget it.

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
| `rhythm-quiz-package/index.html` | Built, ~1,414 lines / ~62 KB | All content + logic. |
| `rhythm-quiz-package/lib/vexflow.min.js` | Vendored | VexFlow 3.0.9, MIT, ~754 KB. |
| `rhythm-quiz-package/README.md` | Built | Teacher-facing instructions. |
| `rhythm-quiz-package/LICENSES.md` | Built | VexFlow MIT + SCSA attribution. |
| `rhythm-quiz-standalone.html` | Built | Same quiz, VexFlow inlined. |
| `rhythm-quiz-package.zip` | Built | Clean zip for sharing. |
| `BUILD-PROMPT.md` | Built | Original spec. |
| `README.md` (top level) | Built | Explains the three deliverables. |

**Functional coverage:** 11 year groups selectable; practice mode with hints + immediate
feedback; deterministic per-year 10-question tests; review table; CSV with answer-key row on
top and appended class list.

So this is **not a greenfield build** — it is a *rebuild/extension* plan. Phases 0–6 below
describe how to construct it from zero (useful for a rewrite, a new year's variant, or a
teammate picking it up), and Phase 7 is the forward roadmap.

---

## 3. Architecture

Single-page app, no framework. `index.html` is organised into six numbered sections plus a
styling block. Line landmarks (current file):

```
 1–273     HTML shell + CSS (tokens, layout, cards, tabs, print styles)
 274–476   §1  Music note model + hand-drawn SVG renderer (fallback)
 477–515   §1b VexFlow renderer (primary notation path)
 516–686       Metric beaming logic
 687–700       Concept (non-staff) graphics for Pre-primary / Year 1
 701–729   §2  Rhythm pattern library (per year, from the Addendum)
 730–757   §3  Year groups + time-signature totals
 758–771       Metric helpers
 772–870   §4  Question generator (staff questions)
 871–1018      Concept question generator
1019–1161  §5  App state + practice-mode UI
1162–1187      Event wiring
1188–1332  §6  Test mode (fixed 10 questions) + overlay flow
1333–1381      CSV export
1382–1404      Test/results event wiring
1405–1414      Boot
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
- [ ] §6 deterministic 10-question test per year; name entry; progress bar; no marking until end.
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

---

## 5. Acceptance checklist (definition of done)

- [ ] All 11 year groups selectable; side panel updates per year.
- [ ] Notation professional (stems/flags/beams/rests/time signatures correct).
- [ ] Practice mode works with hints and immediate feedback.
- [ ] Each year has a stable 10-question test with a name field.
- [ ] Results table is `Q | Question | Your answer | Correct answer | ✓/✗`.
- [ ] CSV header/order correct, answer-key row on top, ✗ marks + Wrong list, appends.
- [ ] Package, standalone and zip all present and working offline.
- [ ] Invariant assertions pass; console clean.

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

---

## 7. Forward roadmap (next builds)

Ordered by value-to-effort; each is an independent, shippable increment.

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

Verify in a browser: pick each year (side panel updates), answer a few (feedback + score),
sit a 10-question test, save CSV, reload, check the class list persisted, and confirm the
console has no errors.
