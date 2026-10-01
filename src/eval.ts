import { NaiveBayes } from "./nb.ts";
import { tokenize } from "./token.ts";
import type { Doc } from "./corpus.ts";

export interface FoldResult {
  fold: number;
  accuracy: number;
  n: number;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface EvalReport {
  folds: FoldResult[];
  overallAccuracy: number;
  n: number;
  confusion: { labels: string[]; matrix: number[][] };
  perClass: Record<string, ClassMetrics>;
  micro: ClassMetrics;
}

/** One k-fold pass: returns per-fold accuracies using held-out folds as tests. */
export function kFold(docs: Doc[], k: number): EvalReport {
  if (k < 2) throw new Error("k must be >= 2");
  if (docs.length < k) throw new Error("need at least k documents");

  // Deterministic fold assignment: sort by id, stride assignment.
  const sorted = [...docs].sort((a, b) => (a.id < b.id ? -1 : 1));
  const folds: Doc[][] = Array.from({ length: k }, () => []);
  sorted.forEach((doc, i) => folds[i % k]!.push(doc));

  const foldsResult: FoldResult[] = [];
  const labels: string[] = [...new Set(docs.map((d) => d.label))].sort();
  const matrix: number[][] = labels.map(() => labels.map(() => 0));

  for (let i = 0; i < k; i++) {
    const test = folds[i]!;
    const train = folds.flatMap((f, j) => (j === i ? [] : f));
    const trainLabels = new Set(train.map((d) => d.label));
    const nb = new NaiveBayes();
    for (const d of train) nb.train(d.label, d.text);
    let correct = 0;
    for (const d of test) {
      // Unseen-in-train labels cannot be predicted; count as an error but
      // keep the true row for the matrix.
      let predicted: string;
      if (!trainLabels.has(d.label) && trainLabels.size > 0) {
        // still classify; NB will pick some trained label
        predicted = nb.classify(d.text).label;
      } else {
        predicted = nb.classify(d.text).label;
      }
      const ti = labels.indexOf(d.label);
      const pi = labels.indexOf(predicted);
      if (ti >= 0 && pi >= 0) matrix[ti]![pi]! += 1;
      if (predicted === d.label) correct += 1;
    }
    foldsResult.push({
      fold: i + 1,
      accuracy: test.length ? correct / test.length : 0,
      n: test.length,
    });
  }

  const total = matrix.flat().reduce((a, b) => a + b, 0);
  const correct = labels.reduce((acc, _l, i) => acc + matrix[i]![i]!, 0);

  const perClass: Record<string, ClassMetrics> = {};
  let microP = 0;
  let microR = 0;
  for (let i = 0; i < labels.length; i++) {
    const row = matrix[i]!;
    const tp = row[i]!;
    const fp = matrix.reduce((a, r, ri) => (ri === i ? a : a + r[i]!), 0);
    const fn = row.reduce((a, v, c) => (c === i ? a : a + v), 0);
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 :
      (2 * precision * recall) / (precision + recall);
    perClass[labels[i]!] = {
      precision,
      recall,
      f1,
      support: row.reduce((a, b) => a + b, 0),
    };
    microP += precision;
    microR += recall;
  }
  const nLabels = labels.length || 1;

  return {
    folds: foldsResult,
    overallAccuracy: total ? correct / total : 0,
    n: total,
    confusion: { labels, matrix },
    perClass,
    micro: {
      precision: microP / nLabels,
      recall: microR / nLabels,
      f1: (microP + microR) === 0 ? 0 : (2 * (microP / nLabels) * (microR / nLabels)) /
        ((microP / nLabels) + (microR / nLabels)),
      support: total,
    },
  };
}

export function renderReport(r: EvalReport): string {
  const lines: string[] = [];
  for (const f of r.folds) {
    lines.push(
      `fold ${f.fold}/${r.folds.length}  accuracy=${f.accuracy.toFixed(4)}  (n=${f.n})`,
    );
  }
  lines.push(`overall accuracy=${r.overallAccuracy.toFixed(4)}  (n=${r.n})`);
  lines.push("per-class precision/recall/F1:");
  for (const [label, m] of Object.entries(r.perClass)) {
    lines.push(
      `  ${label.padEnd(12)} P=${m.precision.toFixed(3)} R=${m.recall.toFixed(3)} F1=${m.f1.toFixed(3)} support=${m.support}`,
    );
  }
  lines.push("confusion matrix (rows=true, cols=predicted):");
  const width = Math.max(10, ...r.confusion.labels.map((l) => l.length));
  lines.push(" ".repeat(width + 2) + r.confusion.labels.map((l) =>
    l.padStart(width)
  ).join(""));
  r.confusion.matrix.forEach((row, i) => {
    lines.push(
      r.confusion.labels[i]!.padStart(width + 2) +
        row.map((v) => String(v).padStart(width)).join(""),
    );
  });
  return lines.join("\n");
}

// Keep tokenize import used for potential future reporting hooks.
void tokenize;
