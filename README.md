# Rhythm Quiz — Complete the Bar

[![Latest release](https://img.shields.io/github/v/release/rayfoolshs/rhythm-quiz?label=download&color=202B64)](https://github.com/rayfoolshs/rhythm-quiz/releases/latest)
[![Live site](https://img.shields.io/badge/live-rayfoolshs.github.io%2Frhythm--quiz-0A8440)](https://rayfoolshs.github.io/rhythm-quiz/)

An interactive music quiz built from the **Western Australian Curriculum: The Arts — Music, Scope & Sequence (Pre-primary–Year 10)**. It uses only the **Rhythm** content listed for each year group in the Addendum. Students choose the rhythm that makes the bar add up to the time signature.

## What's here

| Item | Description |
| --- | --- |
| `rhythm-quiz-package/` | **The package.** Open `index.html`. Small HTML plus the notation engine in `lib/`. |
| `rhythm-quiz-package.zip` | The same package zipped for sharing or emailing — attached to every [release](https://github.com/rayfoolshs/rhythm-quiz/releases/latest). |
| `rhythm-quiz-standalone.html` | Optional single file — the whole quiz and engine in one HTML. Larger, but nothing else needed. |

### Package structure

```
rhythm-quiz-package/
├── index.html          the quiz (content + logic, ~107 KB)
├── lib/
│   └── vexflow.min.js  music notation engine (VexFlow 3.0.9, MIT)
├── lakeland-logo.svg           school logo (navy; print/other use)
├── lakeland-logo-inverse.svg   school logo used in the header
├── README.md           full instructions and year-by-year coverage
└── LICENSES.md
```

Keep `index.html` and the `lib/` folder together — `index.html` loads the notation engine from `lib/vexflow.min.js`.

## Running it
Open `rhythm-quiz-package/index.html` (or `rhythm-quiz-standalone.html`) in any modern browser. No install, no build, no internet required.

- Pick a **year group** from the top bar.
- Read the **time signature** and work out how many beats the dashed **?** box needs.
- Choose the option whose note values add up to exactly that amount.
- Keys `1`–`4` answer, `Enter` goes next. The **Answer key** panel records answers for the teacher.
- The **Concept Mastery Breakdown** sits on the far left, with the Reference Guide beside it: a live error rate per note value, rest, tie and time signature for the selected year, naming the weakest concept as the next mini-lesson.
- **Visualising the Numeracy Diagnostic Live** sits above the Score: the same answers re-read as four numeracy skills (fraction pacing, denominator anchoring, missing addends, fractional equivalence), drawn as class mastery rates and naming the weakest skill. The **Numeracy Diagnostic Live** switch at the end of the year bar (after Year 10) shows or collapses the panel.

### 10-question tests + CSV
Each year group also has a **fixed 10-question test** (button: *Start 10-question test*). Students sign in with their school Google account — their name is recorded from the account, so there is nothing to type — answer all 10, then see their score and a review table showing **Question | Your answer | Correct answer | ✓/✗**. The result is submitted to the class Google Sheet automatically, and **Exit** closes the test once it has been sent. Each attempt is also kept in the browser's class list, exportable as a CSV with the **correct answers on top** and each **student's responses underneath**, wrong answers marked.

See `rhythm-quiz-package/README.md` for the full year-by-year content breakdown.

## Notes
- Notation is vector SVG (via VexFlow), so it stays sharp at any size and prints cleanly.
- The double-clicked offline copy cannot sign in to Google, so it labels its rows `(offline)` in the CSV. Named, sheet-submitted results need the hosted version.
- Time signatures used: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8.
- Curriculum content: School Curriculum and Standards Authority (SCSA), *The Arts | Music — Scope and sequence, Pre-primary–Year 10*, Addendum. Notation engine: VexFlow (MIT).