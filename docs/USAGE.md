# bayesort usage guide

## Corpus layout

```text
my-corpus/
├─ work/
│  ├─ standup-notes.txt
│  └─ roadmap-2026.txt
├─ personal/
│  └─ birthday-plan.txt
└─ newsletters/
   └─ weekly-digest.txt
```

Rule: one subfolder per label, one `.txt` file per document. Document ids are
`<label>/<filename>` — keep filenames stable to keep splits reproducible.

## Commands

### train

```shell
node src/cli.ts train --corpus my-corpus --model bayes-model.json --alpha 1.0
```

Trains on **all** documents and writes a digest-stamped model JSON.

### eval

```shell
node src/cli.ts eval --corpus my-corpus --folds 4
```

Runs the deterministic hash split (80/20) + contamination check, then 4-fold
cross-validation over the full corpus. Use this as the honest accuracy number;
training-set accuracy always flatters a classifier.

### classify

```shell
node src/cli.ts classify --model bayes-model.json --text "sprint deadline review"
echo "unsubscribe here" | node src/cli.ts classify --model bayes-model.json -v
```

Output is the winning label on line 1; `-v` adds per-class log-scores.
The model digest is verified before scoring — tampered models exit 1.

## Interpreting scores

Scores are log-posteriors (unnormalized). Differences are meaningful:
`spam −8.2` vs `work −23.5` is a confident spam call; a 0.5 gap is a coin flip.
Add `-v` to see all classes.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | runtime error (bad corpus, digest mismatch, unreadable model) |
| 2 | usage error (missing flags, unknown command) |

## Tips

- 15+ docs per label is a sensible floor; below that, cross-validation
  folds get sparse.
- If eval accuracy is much lower than training accuracy would suggest,
  your labels are noisy or the classes share vocabulary — inspect the
  confusion matrix to see which labels collide.
- Keep `--alpha` at 1.0 unless you have a reason; lower alpha trusts counts
  more (overfits small corpora), higher alpha smooths harder.
