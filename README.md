# Rhythm Quiz — Complete the Bar

An interactive music quiz built from the **Western Australian Curriculum: The Arts — Music, Scope & Sequence (Pre-primary–Year 10)**. It uses only the **Rhythm** content listed for each year group in the Addendum. Students choose the rhythm that makes the bar add up to the time signature.

## What's here

| Item | Description |
| --- | --- |
| `rhythm-quiz-package/` | **The package.** Open `index.html`. Small HTML plus the notation engine in `lib/`. |
| `rhythm-quiz-package.zip` | The same package zipped (~230 KB) for sharing or emailing. |
| `rhythm-quiz-standalone.html` | Optional single file — the whole quiz and engine in one HTML. Larger, but nothing else needed. |

### Package structure

```
rhythm-quiz-package/
├── index.html          the quiz (content + logic, ~41 KB)
├── lib/
│   └── vexflow.min.js  music notation engine (VexFlow 3.0.9, MIT)
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

### 10-question tests + CSV
Each year group also has a **fixed 10-question test** (button: *Start 10-question test*). Students type their name, answer all 10, then see their score and a review table showing **Question | Your answer | Correct answer | ✓/✗**. Results are saved to a class list and downloaded as a CSV with the **correct answers on top** and each **student's responses underneath**, wrong answers marked. Saves append to the same class list so the file grows into a list of student names.

See `rhythm-quiz-package/README.md` for the full year-by-year content breakdown.

## Notes
- Notation is vector SVG (via VexFlow), so it stays sharp at any size and prints cleanly.
- Time signatures used: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8.
- Curriculum content: School Curriculum and Standards Authority (SCSA), *The Arts | Music — Scope and sequence, Pre-primary–Year 10*, Addendum. Notation engine: VexFlow (MIT).