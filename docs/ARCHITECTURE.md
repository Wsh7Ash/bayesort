# bayesort architecture

## Data flow

```text
demo/corpus/<label>/*.txt
        │
        ▼
   corpus.ts ──► Doc[] { id, label, text }
        │                │
        │                ├──► split.ts ──► { train[], inference[] }  (SHA-256 bucketing)
        │                │            └──► assertDisjoint() contamination check
        │                │
        ▼                ▼
     token.ts ──► nb.ts (multinomial Naive Bayes)
        │                │
        │                ├──► eval.ts (k-fold CV, confusion matrix, P/R/F1)
        │                └──► model JSON (sha256 digest) ──► classify
        ▼
     cli.ts (train | eval | classify)
```

## Modules

### `token.ts`
Tokenizer: lowercase, extract `[a-z0-9]+` runs, keep tokens of length 2..30.
Deliberately minimal: no stemming, no stopword list — the classifier is meant
to be auditable, not maximal-accuracy.

### `nb.ts`
Multinomial Naive Bayes:

- priors: `log(count(docs with label) / totalDocs)`
- likelihood: `log((count(word,label) + α) / (totalWords(label) + α·|vocab|))`
- scores are sums in log space, so long documents do not underflow.

`toJSON` serializes counts plus a SHA-256 digest over the body;
`fromJSON` recomputes the digest and rejects any drift, so a hand-edited or
truncated model file fails loudly instead of mislabeling.

### `split.ts`
The deterministic split answers "which docs may be counted in an inference
report?" — membership is `sha256(id + salt) mod 100 < trainPercent`. The same
corpus and salt reproduce the same split byte-for-byte across runs and
machines. `assertDisjoint` is the audit gate: train and inference sets must
share no id.

### `corpus.ts`
Loads `corpusDir/<label>/*.txt`; ids are corpus-relative paths
(`label/file.txt`), which keeps splits stable regardless of absolute paths.

### `eval.ts`
k-fold CV with deterministic fold assignment (sort by id, deal round-robin).
Produces per-fold accuracy, a confusion matrix, per-class precision/recall/F1
with support, and macro-averaged numbers. `renderReport` formats the report as
plain text for terminals and `results/` artifacts.

### `cli.ts`
Flag parsing and dispatch. Commands: `train`, `eval`, `classify`.
Exit codes: 0 success, 1 runtime error (bad corpus, digest mismatch),
2 usage error.

## Design decisions

- **Zero runtime dependencies** — `node:crypto` covers hashing; math is a
  few hundred lines. `typescript` and `@types/node` are dev-only.
- **JSON model, not binary** — diffable, inspectable, and digest-checkable
  without tooling.
- **Log-space scoring** — avoids float underflow on real document lengths.
- **Deterministic everything** — same inputs give the same split, folds,
  scores, and report, so results in `RESULTS.md` are reproducible exactly.
