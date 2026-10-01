# Results

## Environment
- OS: Windows 11 (bash / msys2), x86-64
- Runtime/compiler: Node.js v24.13.0, TypeScript 5.x (`tsc --noEmit` strict)
- Dependency manager: npm (dev-only deps: typescript, @types/node)
- Test framework: node:test

## Validation performed
- install: PASS (`npm install`, 3 dev packages)
- build: PASS (`tsc --noEmit` strict, incl. `noUncheckedIndexedAccess`)
- unit tests: PASS (27/27)
- integration tests: PASS (CLI end-to-end in `tests/cli.test.ts`)
- lint: N/A
- type check: PASS
- demo run: PASS (seed → train → eval → 3 classify probes)

## Commands executed
```shell
npm install
npm run build          # tsc --noEmit
npm test               # 27 pass, 0 fail
node demo/seed.ts
node src/cli.ts train --corpus demo/corpus --model results/bayes-model.json
node src/cli.ts eval --corpus demo/corpus --folds 4 > results/eval-report.txt
node src/cli.ts classify --model results/bayes-model.json --text "sprint deadline review roadmap"
node src/cli.ts classify --model results/bayes-model.json --text "birthday dinner family weekend"
node src/cli.ts classify --model results/bayes-model.json --text "unsubscribe weekly digest issue"
```

## Observed result
Demo corpus: 75 synthetic memos, 3 labels × 25 docs
(`demo/seed.ts`, deterministic vocabulary rotation).

```text
trained on 75 docs, 3 labels -> results/bayes-model.json
split check: train=59 inference=16 (disjoint, hash-seeded)
fold 1/4  accuracy=1.0000  (n=19)
fold 2/4  accuracy=1.0000  (n=19)
fold 3/4  accuracy=1.0000  (n=19)
fold 4/4  accuracy=1.0000  (n=18)
overall accuracy=1.0000  (n=75)
confusion matrix (rows=true, cols=predicted):
             newsletters   personal       work
  newsletters         25          0          0
     personal          0         25          0
         work          0          0         25
```

Classify probes all landed on the intended label: work terms → `work`,
family terms → `personal`, newsletter terms → `newsletters`.
Perfect CV accuracy is expected: the synthetic labels are
vocabulary-separable by construction. The eval harness (folds, matrix,
disjointness check) is the part under test — it reports honestly rather than
the number being impressive.

## Generated artifacts
- `results/bayes-model.json` — trained model (digest-stamped)
- `results/eval-report.txt` — full 4-fold evaluation report

## Known limitations
- Unigram word features only; no stemming/stopwords/n-grams.
- English-leaning tokenization (`[a-z0-9]+` after lowercasing).
- In-memory corpus loading.
