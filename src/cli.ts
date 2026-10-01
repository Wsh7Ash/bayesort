#!/usr/bin/env node
/** bayesort CLI: train / eval / classify on local plain-text corpora. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadCorpus } from "./corpus.ts";
import { kFold, renderReport } from "./eval.ts";
import { NaiveBayes } from "./nb.ts";
import { assertDisjoint, hashSplit } from "./split.ts";

interface ParsedArgs {
  command: string;
  flags: Record<string, string | number | boolean>;
  positional: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  if (!command) {
    console.error("usage: bayesort <train|eval|classify> [flags]");
    process.exit(2);
  }
  const flags: Record<string, string | number | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { command, flags, positional };
}

function num(v: string | number | boolean | undefined, fallback: number): number {
  if (v === undefined || v === true) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`expected number, got ${v}`);
  return n;
}

function str(v: string | number | boolean | undefined, fallback: string): string {
  return v === undefined || v === true ? fallback : String(v);
}

function cmdTrain(flags: ParsedArgs["flags"]): number {
  const corpusDir = str(flags.corpus, "");
  if (!corpusDir) throw new Error("--corpus is required");
  const modelPath = str(flags.model, "bayes-model.json");
  const alpha = num(flags.alpha, 1.0);

  const docs = loadCorpus(corpusDir);
  const nb = new NaiveBayes(alpha);
  for (const d of docs) nb.train(d.label, d.text);
  mkdirSync(dirname(modelPath), { recursive: true });
  writeFileSync(modelPath, JSON.stringify(nb.toJSON(), null, 2));
  console.log(
    `trained on ${docs.length} docs, ${nb.labels.length} labels -> ${modelPath}`,
  );
  return 0;
}

function cmdEval(flags: ParsedArgs["flags"]): number {
  const corpusDir = str(flags.corpus, "");
  if (!corpusDir) throw new Error("--corpus is required");
  const folds = Math.max(2, num(flags.folds, 4));

  const docs = loadCorpus(corpusDir);
  // Demonstrate the deterministic split + contamination check on this corpus.
  const { train, inference } = hashSplit(docs, 80, "bayesort-v1");
  assertDisjoint(train, inference);

  const report = kFold(docs, folds);
  console.log(
    `split check: train=${train.length} inference=${inference.length} (disjoint, hash-seeded)`,
  );
  console.log(renderReport(report));
  return 0;
}

function cmdClassify(flags: ParsedArgs["flags"]): number {
  const modelPath = str(flags.model, "bayes-model.json");
  const text = flags.text !== undefined && flags.text !== true
    ? String(flags.text)
    : readFileSync(0, "utf8");
  const json: unknown = JSON.parse(readFileSync(modelPath, "utf8"));
  const nb = NaiveBayes.fromJSON(json);
  const { label, scores } = nb.classify(text);
  console.log(label);
  if (flags.verbose) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    for (const [lab, s] of sorted) {
      console.log(`  ${lab.padEnd(12)} log-score=${s.toFixed(3)}`);
    }
  }
  return 0;
}

const { command, flags } = parseArgs(process.argv.slice(2));
try {
  switch (command) {
    case "train":
      process.exit(cmdTrain(flags));
    case "eval":
      process.exit(cmdEval(flags));
    case "classify":
      process.exit(cmdClassify(flags));
    default:
      console.error(`unknown command: ${command}`);
      process.exit(2);
  }
} catch (err) {
  console.error(`error: ${(err as Error).message}`);
  process.exit(1);
}
