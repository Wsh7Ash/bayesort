import { createHash } from "node:crypto";
import { tokenize } from "./token.ts";

export interface NbModelJson {
  kind: "bayesort-model";
  version: 1;
  alpha: number;
  labels: string[];
  labelDocCount: Record<string, number>;
  totalDocs: number;
  wordCounts: Record<string, Record<string, number>>;
  labelWordTotals: Record<string, number>;
  vocabSize: number;
  digest: string;
}

export class NaiveBayes {
  alpha: number;
  labelDocCount = new Map<string, number>();
  totalDocs = 0;
  wordCounts = new Map<string, Map<string, number>>();
  labelWordTotals = new Map<string, number>();
  vocab = new Set<string>();

  constructor(alpha = 1.0) {
    if (alpha <= 0) throw new Error("alpha must be > 0");
    this.alpha = alpha;
  }

  train(label: string, text: string): void {
    this.totalDocs += 1;
    this.labelDocCount.set(label, (this.labelDocCount.get(label) ?? 0) + 1);
    let perLabel = this.wordCounts.get(label);
    if (!perLabel) {
      perLabel = new Map();
      this.wordCounts.set(label, perLabel);
    }
    for (const word of tokenize(text)) {
      perLabel.set(word, (perLabel.get(word) ?? 0) + 1);
      this.labelWordTotals.set(
        label,
        (this.labelWordTotals.get(label) ?? 0) + 1,
      );
      this.vocab.add(word);
    }
  }

  get labels(): string[] {
    return [...this.labelDocCount.keys()].sort();
  }

  private logPrior(label: string): number {
    if (this.totalDocs === 0) throw new Error("model is not trained");
    return Math.log(this.labelDocCount.get(label)! / this.totalDocs);
  }

  private logLikelihood(label: string, words: string[]): number {
    const perLabel = this.wordCounts.get(label);
    const total = this.labelWordTotals.get(label) ?? 0;
    const vocabSize = this.vocab.size;
    const denom = total + this.alpha * vocabSize;
    let sum = 0;
    for (const w of words) {
      const count = perLabel?.get(w) ?? 0;
      sum += Math.log((count + this.alpha) / denom);
    }
    return sum;
  }

  score(text: string): Map<string, number> {
    const words = tokenize(text);
    const out = new Map<string, number>();
    for (const label of this.labels) {
      out.set(label, this.logPrior(label) + this.logLikelihood(label, words));
    }
    return out;
  }

  classify(text: string): { label: string; scores: Map<string, number> } {
    const scores = this.score(text);
    let best = "";
    let bestVal = -Infinity;
    for (const [label, value] of scores) {
      if (value > bestVal) {
        bestVal = value;
        best = label;
      }
    }
    if (!best) throw new Error("model has no labels");
    return { label: best, scores };
  }

  toJSON(): NbModelJson {
    // Digest covers exactly the fields that remain after fromJSON strips
    // kind/version/digest, so key order matches on verification.
    const body = {
      alpha: this.alpha,
      labels: this.labels,
      labelDocCount: Object.fromEntries(this.labelDocCount),
      totalDocs: this.totalDocs,
      wordCounts: Object.fromEntries(
        [...this.wordCounts.entries()].map(([l, m]) => [l, Object.fromEntries(m)]),
      ),
      labelWordTotals: Object.fromEntries(this.labelWordTotals),
      vocabSize: this.vocab.size,
    };
    const digest = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    return { kind: "bayesort-model", version: 1, ...body, digest };
  }

  static fromJSON(json: unknown): NaiveBayes {
    const obj = json as NbModelJson;
    if (!obj || obj.kind !== "bayesort-model" || obj.version !== 1) {
      throw new Error("not a bayesort model file");
    }
    const {
      digest,
      kind: _k,
      version: _v,
      ...body
    } = obj;
    const actual = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    if (actual !== digest) {
      throw new Error("model digest mismatch: file was modified or corrupted");
    }
    const nb = new NaiveBayes(obj.alpha);
    nb.totalDocs = obj.totalDocs;
    for (const [l, c] of Object.entries(obj.labelDocCount)) {
      nb.labelDocCount.set(l, c);
    }
    for (const [l, words] of Object.entries(obj.wordCounts)) {
      nb.wordCounts.set(l, new Map(Object.entries(words)));
    }
    for (const [l, t] of Object.entries(obj.labelWordTotals)) {
      nb.labelWordTotals.set(l, t);
    }
    // Rebuild vocab from stored counts.
    for (const words of Object.values(obj.wordCounts)) {
      for (const w of Object.keys(words)) nb.vocab.add(w);
    }
    return nb;
  }
}
