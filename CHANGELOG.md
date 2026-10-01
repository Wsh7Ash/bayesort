# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-01

### Added
- Multinomial Naive Bayes with Laplace smoothing and log-space scoring.
- Deterministic SHA-256 hash split with contamination self-check.
- k-fold cross-validation with confusion matrix and per-class P/R/F1.
- Digest-stamped JSON model save/load with tamper rejection.
- CLI: `train`, `eval`, `classify` (arg or stdin input, `-v` score detail).
- Demo corpus seeder (`demo/seed.ts`) and `npm run demo` pipeline.
- Full node:test suite: tokenizer, NB core, split, eval, CLI end-to-end.
