# AGENTS.md

Guidance for coding agents working in this repository.

The repo is a self-contained, offline music quiz: `rhythm-quiz-package/index.html`
is the source of truth, `rhythm-quiz-standalone.html` is generated from it, and both
are published to GitHub Pages on push to `main`. Read `README.md` for the deliverables
and `BUILD-PLAN.md` for the architecture.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `rayfoolshs/rhythm-quiz`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
