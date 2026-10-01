import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashSplit, assertDisjoint } from "../src/split.ts";
import { kFold, renderReport } from "../src/eval.ts";
import type { Doc } from "../src/corpus.ts";

function doc(id: string, label: string, text: string): Doc {
  return { id, label, text };
}

describe("hashSplit", () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: `d${String(i).padStart(3, "0")}`,
  }));

  it("is deterministic for identical inputs", () => {
    const a = hashSplit(items, 80, "salt");
    const b = hashSplit(items, 80, "salt");
    assert.deepEqual(
      a.train.map((x) => x.id),
      b.train.map((x) => x.id),
    );
  });

  it("changes with a different salt", () => {
    const a = new Set(hashSplit(items, 80, "saltA").train.map((x) => x.id));
    const b = new Set(hashSplit(items, 80, "saltB").train.map((x) => x.id));
    assert.notDeepEqual([...a], [...b]);
  });

  it("approximates the requested percentage", () => {
    const { train } = hashSplit(items, 80, "salt");
    assert.ok(train.length > 65 && train.length < 95, `got ${train.length}`);
  });

  it("rejects out-of-range percent", () => {
    assert.throws(() => hashSplit(items, 101, "s"), /0\.\.100/);
  });
});

describe("assertDisjoint", () => {
  it("passes for disjoint sets", () => {
    assertDisjoint([{ id: "a" }, { id: "b" }], [{ id: "c" }]);
  });
  it("throws on contamination", () => {
    assert.throws(
      () => assertDisjoint([{ id: "a" }], [{ id: "a" }]),
      /contamination/,
    );
  });
});

describe("kFold", () => {
  // Linearly separable toy corpus: label A words vs label B words.
  const docs: Doc[] = [];
  for (let i = 0; i < 20; i++) {
    docs.push(doc(`a/${i}.txt`, "alpha", "apple apricot aven " + i));
    docs.push(doc(`b/${i}.txt`, "beta", "banana berry basil " + i));
  }

  it("classifies a separable corpus perfectly", () => {
    const r = kFold(docs, 4);
    assert.equal(r.overallAccuracy, 1);
    assert.equal(r.n, 40);
  });

  it("confusion matrix rows sum to per-class support", () => {
    const r = kFold(docs, 4);
    r.confusion.matrix.forEach((row, i) => {
      const sum = row.reduce((a, b) => a + b, 0);
      assert.equal(sum, r.perClass[r.confusion.labels[i]].support);
    });
  });

  it("is deterministic across runs", () => {
    const a = kFold(docs, 4);
    const b = kFold(docs, 4);
    assert.deepEqual(a, b);
  });

  it("rejects k < 2", () => {
    assert.throws(() => kFold(docs, 1), /k must be/);
  });

  it("renderReport produces readable output", () => {
    const text = renderReport(kFold(docs, 4));
    assert.match(text, /overall accuracy/);
    assert.match(text, /confusion matrix/);
  });
});
