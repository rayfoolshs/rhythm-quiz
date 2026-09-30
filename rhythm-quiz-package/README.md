# Rhythm Quiz — Complete the Bar

An interactive music quiz built from the **Western Australian Curriculum: The Arts — Music, Scope & Sequence (Pre-primary–Year 10)**, using only the **Rhythm** content listed for each year group in the Addendum.

Students choose the rhythm that makes the bar add up to the time signature.

## Open it
Open **`index.html`** in any modern browser (double-click it, or drag it into a browser window).
No install, no build step, no internet connection required.

Keep `index.html` and the `lib/` folder together — `index.html` loads the notation engine from `lib/vexflow.min.js`.

## How to play
1. Pick a **year group** from the top bar.
2. Read the **time signature** and work out how many beats the dashed **?** box needs.
3. Choose the option whose note values add up to exactly that amount.
4. Keyboard shortcuts: `1`–`4` to answer, `Enter` for the next question.
5. The **Answer key** panel records answers for the teacher. **Restart score** clears it.
6. The page prints cleanly (browser → Print / Save as PDF) for a paper copy.

## Notation
All notation is drawn as vector SVG (VexFlow). Beams are grouped strictly by the beat — **one crotchet in simple time (2/4, 3/4, 4/4, 5/4)**, **one dotted crotchet in compound time (6/8, 9/8, 12/8)** and **2 + 2 + 3 eighths in 7/8** — so a beam never crosses a beat or breaks the pulse of the bar.

## Test mode (10 questions) and CSV results
Every year group has a **fixed 10-question test**, so all students in a class sit the same paper with the same answer key.

1. Choose the year group, then click **Start 10-question test**.
2. Type the **student name** and begin. Questions are not marked right or wrong until the end.
3. Answer all 10, then the results screen shows the score and a review table:
   **Q | Question | Your answer | Correct answer | ✓/✗** (wrong rows are shaded).
4. Click **Save & download CSV**. The result is added to the class list and a CSV file is downloaded.

The CSV looks like this (correct answers on top, student responses underneath, wrong answers marked ✗). The **Year** column records which year-level test was sat:

```
Year,Name,Date,Score,Q1,Q2,Q3,Q4,Q5,Q6,Q7,Q8,Q9,Q10,Wrong
Year 3,ANSWER KEY,,,B,A,B,A,A,C,C,D,B,B,
Year 3,Alice Smith,2026-09-26 17:02,8/10,B,A,A ✗,A,A,A ✗,C,D,B,B,"Q3, Q6"
Year 3,Bob Jones,2026-09-26 17:02,10/10,B,A,B,A,A,C,C,D,B,B,
```

- Each save is **appended to the class list** stored in the browser, so the list of student names grows.
- Use **Download CSV (all years)** to get one file with every year together; each year keeps its own answer-key row and the Year column tells them apart.
- **Clear results** empties the saved list in this browser.
- Because browsers cannot silently write to a file on disk, results are kept in the browser and written out when you download the CSV. Downloading again always produces the full, up-to-date class list. Files are named `rhythm-quiz-results-<Year>.csv` (or `...-all-years.csv`).

## What is covered (from the Addendum)

| Year | Rhythm content used |
| --- | --- |
| Pre-primary | Steady beat, sound and silence, long and short |
| Year 1 | Quavers, beamed quavers, beat groups of 2, 3 and 4 |
| Year 2 | Time signature 2/4, minim, crotchet, quaver and quaver rest |
| Year 3 | Time signature 4/4, beamed semiquavers, minim rest, crotchet rest |
| Year 4 | Time signature 3/4, dotted minim, semibreve |
| Year 5 | Semibreve rest, anacrusis, dotted quaver + semiquaver, quaver + two semiquavers |
| Year 6 | Consolidation of 2/4, 3/4, 4/4, all simple-time values and rests |
| Year 7 | Time signatures 2/4, 3/4, 4/4, groups of beats, anacrusis, dotted crotchet + quaver |
| Year 8 | Compound time 6/8, ties, dotted crotchet and dotted minim |
| Year 9 | Simple-time groupings, irregular metre 7/8, quaver triplet, swung rhythms |
| Year 10 | Compound time 12/8 and 9/8, simple time 5/4, syncopation, tied and irregular rhythms |

Time signatures used: **2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8**.

## Package contents
```
rhythm-quiz-package/
├── index.html          the quiz (all content and logic)
├── lib/
│   └── vexflow.min.js  music notation engine (VexFlow 3.0.9, MIT licence)
├── README.md
└── LICENSES.md
```

## Credits
- Curriculum content: School Curriculum and Standards Authority, *The Arts | Music — Scope and sequence, Pre-primary–Year 10* (Addendum: elements of music).
- Notation rendering: [VexFlow](https://vexflow.com) 3.0.9 — MIT licence. See `LICENSES.md`.