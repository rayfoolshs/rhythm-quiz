# BUILD PROMPT — "Rhythm: Complete the Bar" quiz + test package

Build a self-contained, offline, browser-based music quiz and 10-question test tool for the
Western Australian Curriculum: The Arts — Music (Pre-primary–Year 10). It is driven by the
**Rhythm** element from the Scope & Sequence Addendum. Ship it as a small package directory
plus a single-file version and a zip.

---

## 1. Source material

The rhythm content comes from *The Arts | Music — Scope and sequence, Pre-primary–Year 10
(For familiarisation in 2026)*, Addendum → "Examples of the elements of music … Rhythm".
The time signatures and notation are embedded as images in the PDF, so extract them by
rendering the pages (not just text extraction). The rhythm vocabulary per year group is:

| Year | Rhythm content to use |
| --- | --- |
| Pre-primary | Steady beat, sound and silence, long and short sounds |
| Year 1 | Quaver (eighth note), beamed quavers, groups of 2/3/4 beats |
| Year 2 | Time signature 2/4, minim, crotchet, quaver, quaver rest |
| Year 3 | Time signature 4/4, four beamed semiquavers, minim rest, crotchet rest |
| Year 4 | Time signature 3/4, dotted minim, semibreve, dotted crotchet |
| Year 5 | Semibreve rest, anacrusis, dotted quaver + semiquaver, quaver + two semiquavers |
| Year 6 | Consolidation of 2/4, 3/4, 4/4, all simple-time values and rests |
| Year 7 | Time signatures 2/4, 3/4, 4/4, groups of beats, anacrusis, dotted crotchet + quaver |
| Year 8 | Compound time 6/8, ties, dotted crotchet, dotted minim |
| Year 9 | Simple-time groupings, irregular metre 7/8, quaver triplet, swung rhythms |
| Year 10 | Compound time 12/8 and 9/8, simple time 5/4, syncopation, tied/irregular rhythms |

Time signatures to support: **2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8**.

## 2. Core concept

A bar is shown with one dashed **?** box. The student picks the option whose note values
add up to exactly the missing number of beats. Each option must have a **unique duration**
so there is exactly one correct answer (durations measured in crotchet beats:
semibreve 4, dotted minim 3, minim 2, dotted crotchet 1.5, crotchet 1, dotted quaver 0.75,
quaver 0.5, dotted semiquaver 0.375, semiquaver 0.25; rests the same; quaver triplet = 1).

Pre-primary and Year 1 have no time signatures, so use concept multiple-choice instead
(steady beat rows, long/short/silence symbols, and quaver-pattern recognition).

## 3. Notation (must be high quality)

Render all notation as **vector SVG using VexFlow 3.0.9** (MIT licence). Do **not** hand-draw
notes (early hand-drawn attempts had missing stems). Requirements:
- Proper stems, flags, beams, ties, tuplets, rests and time signatures.
- Draw the bar with a stave, time signature, start/end barlines, and the blank beat as a
  dashed rounded box with a **?** (use a transparent placeholder rest, then overlay the box).
- Each option is a small stave showing its rhythm.
- VexFlow UMD API notes: dots via `note.addDotToAll()`; voices via
  `new Voice({num_beats, beat_value}).setStrict(false)`; beams via `new Beam(notes)`;
  ties via `new StaveTie(...)`; tuplets via `new Tuplet(...)`; the SVGContext has no
  `strokeRect` (use `beginPath/rect/stroke`).
- SVG output already includes a `viewBox`, so it scales responsively in tables.

## 4. Practice mode (main screen)

- Year-group tab bar: Pre-primary, Year 1 … Year 10.
- Show a randomly generated question; on answer, reveal correct/incorrect with an explanation;
  buttons: Next question, New question, Need a hint?, Start 10-question test.
- Show the rhythms for the selected year in a side panel (must update when the year tab
  changes — a common bug is to forget this).
- Score panel (correct / answered / streak) and a teacher "Answer key" log.
- Keyboard: `1`–`4` answer, `Enter` next.
- Single fixed seed so practice questions are reproducible.

## 5. Test mode (per year group)

- **10 questions per year, fixed and identical for every student** (deterministic seed per
  year so the answer key is stable).
- Start screen with a **student name** input.
- One question at a time with a progress bar; **do not reveal right/wrong until the end**.
- After Q10, a results screen showing the score out of 10 and a review table with this exact
  left-to-right column order:
  **Q | Question | Your answer | Correct answer | ✓/✗**
  where **Question** is the original bar (scaled to fit) and wrong rows are shaded red,
  correct rows green. (For concept years the Question column shows the question text.)
- Buttons: **Save & download CSV**, **Retake test**, **Back to practice**.

## 6. CSV export (critical spec)

Store each finished test in `localStorage` (key e.g. `rq_results_v1`) so results **append**
into a class list. Export UTF-8 with a BOM. Exact columns and ordering:

```
Year,Name,Date,Score,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Wrong
```

- **Year** = the year-level of the test (e.g. `Year 3`), present on every row.
- The **correct answers row on top**: `Year x,ANSWER KEY,,,<10 answer letters>,`
- **Student responses underneath**: name, date (`YYYY-MM-DD HH:MM`), `score/10`, ten responses
  with wrong ones marked `✗`, and a `Wrong` column listing e.g. `"Q3, Q6"`.
- `Download CSV (this year)` → `rhythm-quiz-results-<ID>.csv`
- `Download CSV (all years)` → `rhythm-quiz-results-all-years.csv` (each year keeps its own
  answer-key row; the Year column separates them)
- `Clear results` empties the saved list (with a confirm).
- A sidebar **Class results** panel lists saved students (Name, Year, Score, Date).
- Note in the UI/docs: browsers cannot silently append to a file on disk, so results live in
  the browser and the full class list is written out on each download.

## 7. Technical constraints

- Must run by **double-clicking the file** (works over `file://`), with **no internet, no
  build step, no server**.
- Deliver as:
  - `rhythm-quiz-package/` → `index.html` + `lib/vexflow.min.js` + `README.md` + `LICENSES.md`
    (keep the HTML small by referencing the library),
  - `rhythm-quiz-standalone.html` → the same quiz with VexFlow **inlined** so it is one file,
  - `rhythm-quiz-package.zip` → zipped cleanly (no `__MACOSX`/resource forks),
  - a top-level `README.md` explaining all three.
- Regenerate the standalone and zip from the package `index.html` after every change.
- Include VexFlow MIT licence text in `LICENSES.md` and attribution to SCSA for the curriculum.
- Add validation (e.g. an assertion loop) that for many generated questions the bar totals
  equal the time signature, there is at least one given cell, and exactly one option matches
  the target. Verify no console errors in a browser.

## 8. Styling

Clean, modern, accessible: purple brand palette, rounded cards, responsive grid that collapses
to one column on small screens, sticky year tabs, clear feedback colours (green correct /
red wrong), and a print-friendly stylesheet.

## 9. Acceptance checklist

- [ ] All 11 year groups selectable; side panel updates per year.
- [ ] Notation is professional (stems/flags/beams/rests/time signatures all correct).
- [ ] Practice mode works with hints and immediate feedback.
- [ ] Each year has a stable 10-question test with a name field.
- [ ] Results table is `Q | Question | Your answer | Correct answer | ✓/✗`.
- [ ] CSV has the `Year,Name,Date,Score,Q1…Q10,Wrong` header, answer-key row on top, student
      rows below, ✗ marks and a Wrong list, and appends into one growing class list.
- [ ] Package, standalone file and zip all present and working offline.