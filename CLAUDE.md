# Hanzi Trainer — Frontend

Next.js frontend of a personal web app for learning Mandarin Chinese (simplified characters) from a printed
textbook. The backend (Spring Boot, REST API on `http://localhost:8080`) lives in the sibling repository
`../hanzi-trainer` (github.com/bscheucher/hanzi-trainer).

@AGENTS.md

## Specs live in the backend repo

The backend repository is the single source of truth for milestones, the REST contract and all feature specs.
Read the relevant spec there before implementing anything; if code and spec disagree, ask before changing the spec.

| File (in `../hanzi-trainer`) | Content |
|---|---|
| `src/docs/ROADMAP.md` | Milestones M0–M8 with acceptance criteria |
| `src/docs/specs/03-api.md` | REST contract — `src/lib/types.ts` mirrors its DTOs |
| `src/docs/specs/04-cedict-and-pinyin.md` | Pinyin rules; `src/lib/pinyin.ts` is the twin of the Java `PinyinConverter` |
| `src/docs/specs/05-scan-and-extraction.md` | Page upload, browser-side image preparation |
| `src/docs/specs/06-vocabulary-review.md` | Review screen |
| `src/docs/specs/07-exercises.md` | Exercise types and player |
| `src/docs/specs/08-handwriting.md` | Hanzi Writer + HanziLookup components |
| `src/docs/specs/09-spaced-repetition.md` | Review session and dashboard |

## Stack

Next.js 16 (App Router, `cacheComponents` enabled) + React + TypeScript, Tailwind CSS 4,
Vitest + React Testing Library, `hanzi-writer`, HanziLookupJS.

## Commands

```bash
npm install
npm run dev        # UI on http://localhost:3000 (backend must run on :8080, see ../hanzi-trainer)
npm test           # Vitest (the syllable-list sync test needs ../hanzi-trainer, otherwise skipped)
npm run typecheck  # generates Next's route types first, then tsc
npm run lint
npm run build
```

## Conventions

- App Router, server components by default; `"use client"` only where interactivity is needed
  (canvas, exercise player, upload).
- Pages that fetch from the backend call `await connection()` and have a `loading.tsx` boundary
  (required by `cacheComponents`); error boundaries receive `retry`, not `reset`.
- API calls through the single typed client in `src/lib/api.ts`; types in `src/lib/types.ts`
  mirror the backend DTOs (spec 03).
- Backend base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`).
- UI language: English labels; German meanings shown when available.
- Chinese text always rendered with `lang="zh-CN"` (CJK font stack applied via `:lang(zh-CN)` in `globals.css`).

### Chinese-text rules (apply everywhere)
- Simplified characters only.
- Pinyin with tone marks (`xuéxí`) for display, numbered (`xue2 xi2`) for search and tone exercises.
  Neutral tone = `5`. `ü` is `ü` in display form and `v` in numbered form.
- Dictionary (citation) tones; 一/不 sandhi printed in textbooks is normalised to the dictionary reading.
- A word is identified by `(hanzi, pinyin_numbered)`, not by `hanzi` alone.
- `src/lib/pinyin-syllables.ts` is a copy of the backend's `src/main/resources/pinyin/syllables.txt`; keep them identical.

## Working agreement for Claude Code
- Implement one milestone per session, together with the backend part in `../hanzi-trainer`.
  Start by restating the milestone's acceptance criteria.
- Before writing code for a milestone, list the files you will create/change.
- Finish a milestone only when `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass here and `./gradlew build`
  passes in the backend, and the acceptance criteria are met.
- If a spec is ambiguous, ask instead of guessing.
