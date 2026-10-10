# Hanzi Trainer — Frontend

Next.js UI for [Hanzi Trainer](https://github.com/bscheucher/hanzi-trainer): scan textbook pages, review the
extracted vocabulary and practise it with spaced repetition.

## Run locally

1. Start the backend from the sibling repo `../hanzi-trainer` (PostgreSQL via `docker compose up -d`,
   then `./gradlew bootRun`; API on `http://localhost:8080`).
2. Start the UI:

   ```bash
   npm install
   npm run dev   # http://localhost:3000
   ```

   Set `NEXT_PUBLIC_API_URL` if the backend runs elsewhere.

## Tests

```bash
npm test
```

The test that checks `src/lib/pinyin-syllables.ts` against the backend's syllable list reads
`../hanzi-trainer/src/main/resources/pinyin/syllables.txt` (or `$HANZI_BACKEND_DIR`) and is skipped
when the backend repo is not checked out next to this one.

## Attribution

Dictionary data: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict),
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
