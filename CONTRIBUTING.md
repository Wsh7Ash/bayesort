# Contributing to bayesort

## Setup

```shell
git clone https://github.com/Wsh7Ash/bayesort.git
cd bayesort
npm install
npm test
npm run build   # tsc --noEmit type check
```

## Ground rules

- Runtime code must stay dependency-free (Node stdlib only). Dev deps are fine.
- Every feature ships with tests; classifier changes must include an eval run
  showing no accuracy regression on the demo corpus.
- Keep determinism: no `Math.random()`, no Date-dependent logic in scoring or
  splitting paths.
- TypeScript strict mode must pass (`npm run build`).

## Pull requests

1. Branch from `main`.
2. Add tests for the change.
3. `npm test && npm run build` green.
4. Update `docs/` and `CHANGELOG.md` under "Unreleased".

## Reporting issues

Include the command line, corpus statistics (docs per label — no document
contents), and the full error output.
