# bayesort

**bayesort** is an offline text classifier you can train from a folder of plain-text
files — no APIs, no model downloads, no network. It implements multinomial Naive Bayes
with Laplace smoothing, a verifiable hash-based train/inference split, and a
self-auditing evaluation harness (k-fold cross-validation, confusion matrix,
train/test contamination check).

## The problem

Classifying notes, tickets, or documents usually means shipping your text to a cloud
model, or installing a multi-hundred-megabyte ML stack. Sometimes you just want to
sort 200 local text files into "work / personal / spam" and be able to *prove* the
classifier actually works — with deterministic math you can audit on one screen.

## Key features

- **Multinomial Naive Bayes** with Laplace smoothing, log-space scoring, and
  lowercased word-token features.
- **Deterministic hash split** — train/inference membership is decided by
  `SHA-256(docId + salt) mod 100 < splitPct`, so the same corpus + salt always
  yields the same split, and no document used for training is counted in the
  inference report.
- **Contamination self-check** — the evaluator verifies train and inference sets
  are disjoint and refuses to report otherwise.
- **k-fold cross-validation** with per-fold accuracy plus micro-averaged
  precision/recall/F1 and a confusion matrix.
- **Model save/load** as plain JSON with a content digest; `classify` verifies
  the digest before scoring and rejects tampered models.
- **CLI + library** — `bayesort train|eval|classify` commands, plus importable
  `nb.ts` for programmatic use.
- **Zero runtime dependencies.**

## Architecture summary

```text
src/
├─ token.ts     # tokenizer: lowercase, letter/digit runs, length filter
├─ nb.ts        # NaiveBayes class: train, score, classify, serialize/deserialize
├─ split.ts     # deterministic SHA-256 hash split + disjointness check
├─ corpus.ts    # walk a folder of .txt files -> labeled documents
├─ eval.ts      # k-fold CV, confusion matrix, precision/recall/F1
└─ cli.ts       # argument parsing and command dispatch
tests/          # node:test suites for every module + end-to-end CLI test
```

## Requirements

- Node.js 20+ (built and tested on Node 24)

## Installation

```shell
npm install        # dev deps only (typescript); runtime has zero dependencies
npm run build      # emits dist/
```

## Quick start

```shell
# 1. Lay out a corpus: one folder per label, one .txt file per document
demo/corpus/work/note1.txt
demo/corpus/personal/note2.txt
demo/corpus/spam/note3.txt

# 2. Train on a folder (writes bayes-model.json)
node dist/cli.js train --corpus demo/corpus --model bayes-model.json

# 3. Evaluate honestly: k-fold cross-validation on the same corpus
node dist/cli.js eval --corpus demo/corpus --folds 4

# 4. Classify new text with the saved model
echo "quarterly revenue spreadsheet" | node dist/cli.js classify --model bayes-model.json
```

Example eval output:

```text
fold 1/4  accuracy=0.92
fold 2/4  accuracy=0.88
...
overall accuracy=0.90  (n=150)
confusion matrix (rows=true, cols=predicted):
              work  personal  spam
work            48         1     1
personal         2        41     2
spam             0         1    54
```

## Configuration

| Flag (`train`) | Default | Meaning |
|---|---|---|
| `--corpus DIR` | required | folder with one subfolder per label |
| `--model PATH` | `bayes-model.json` | where to write the model |
| `--alpha X` | `1.0` | Laplace smoothing strength |

| Flag (`eval`) | Default | Meaning |
|---|---|---|
| `--corpus DIR` | required | labeled corpus |
| `--folds N` | `4` | k for k-fold cross-validation |

| Flag (`classify`) | Default | Meaning |
|---|---|---|
| `--model PATH` | `bayes-model.json` | trained model (digest-checked) |
| `--text STR` | stdin | text to classify (reads stdin if omitted) |

## Testing

```shell
npm test
```

## Project structure

See "Architecture summary"; module-by-module detail in `docs/ARCHITECTURE.md`,
CLI details in `docs/USAGE.md`.

## Limitations

- Word-unigram features only; no stemming, stopwords, or n-grams.
- In-memory corpus; corpora beyond a few hundred MB should be chunked.
- English-leaning tokenization (letter/digit runs; no unicode normalization).

## Roadmap

- Optional stopword list file
- `--topk` output with per-class probabilities
- TF-IDF weighting mode

## Security notes

bayesort reads local files and writes one model JSON. It performs no network
I/O and never sends corpus text anywhere. Model files are digested; a modified
model is rejected at classify time. Only train on text you are authorized to
process.

## License

MIT
